// Conformance-only model of registration lifetimes and the existing operation
// authority. Not a Host implementation or a second runtime ledger.
import { canonical } from './agent-task-reference-model.mjs'

function frozen(value) {
  if (value && typeof value === 'object') {
    for (const item of Object.values(value)) frozen(item)
    Object.freeze(value)
  }
  return value
}

export class TaskBindingModel {
  constructor(adapter, store = new Map()) {
    this.adapter = adapter
    this.store = store
    this.registrations = new Map()
    this.inflight = new Map()
  }

  key(owner, id) {
    return canonical([owner, id])
  }

  register(owner, commandId, handlers) {
    const key = this.key(owner, commandId)
    if (this.registrations.get(key)?.active) throw new Error('duplicate registration')
    if (!handlers.resolveRequest || !handlers.answerAuthority) throw new Error('incomplete approval chain')
    const registration = { active: true, handlers, resources: new Set(), abort: new AbortController() }
    this.registrations.set(key, registration)
    return () => {
      registration.active = false
      registration.abort.abort()
      for (const resource of registration.resources) resource.close()
      registration.resources.clear()
    }
  }

  failure(operationId, code, sessionId) {
    return { status: 'unavailable', operationId, code, ...(sessionId ? { sessionId } : {}) }
  }

  replay(row) {
    return structuredClone(row.result.status === 'accepted' ? { ...row.result, disposition: 'replayed' } : row.result)
  }

  async create(owner, request, policy = 'required') {
    const key = this.key(owner, request.operationId)
    const old = this.store.get(key)
    if (old) {
      if (old.fingerprint !== canonical(request) || (policy === 'required' && old.policy !== 'required')) {
        return this.failure(request.operationId, 'operation-conflict')
      }
      if (this.inflight.has(key)) await this.inflight.get(key)
      return this.replay(old)
    }
    const registration = this.registrations.get(this.key(owner, request.tool.commandId))
    if (policy === 'required' && !registration?.active) return this.failure(request.operationId, 'tool-unavailable')
    const row = {
      policy,
      request: structuredClone(request),
      fingerprint: canonical(request),
      phase: 'creating',
      result: this.failure(request.operationId, 'reconciliation-required'),
    }
    this.store.set(key, row)
    const work = (async () => {
      row.sessionId = this.adapter.create()
      row.messageId = `first:${row.sessionId}`
      row.phase = 'approval-installing'
      row.result = this.failure(request.operationId, 'reconciliation-required', row.sessionId)
      if (policy === 'required') await this.install(row, registration)
      else await this.submit(row)
    })()
    this.inflight.set(key, work)
    try {
      await work
      return structuredClone(row.result)
    } finally {
      this.inflight.delete(key)
    }
  }

  async install(row, registration) {
    const installed = []
    const binding = frozen(structuredClone({ operationId: row.request.operationId, toolScope: row.request.tool.scope }))
    try {
      for (const name of ['answerLegacy', 'answerAuthority', 'resolveRequest']) {
        if (!registration.active) throw new Error('registration replaced')
        const handler = registration.handlers[name]
        if (!handler) continue
        const resource = await this.adapter.install(name, row.sessionId, async question => {
          if (!registration.active) return 'unavailable'
          const answer = await handler(question, binding, registration.abort.signal)
          return registration.active ? answer : 'unavailable'
        })
        if (!registration.active) {
          resource.close()
          throw new Error('late install')
        }
        installed.push(resource)
        registration.resources.add(resource)
      }
      if (!registration.active) throw new Error('registration replaced')
    } catch {
      for (const resource of installed) {
        resource.close()
        registration.resources.delete(resource)
      }
      row.phase = 'approval-install-failed'
      row.result = this.failure(row.request.operationId, 'submit-failed', row.sessionId)
      return
    }
    await this.submit(row)
  }

  async submit(row) {
    row.phase = 'submitting'
    try {
      await this.adapter.submit(row.sessionId, row.messageId)
      row.phase = 'accepted'
      row.result = {
        status: 'accepted',
        operationId: row.request.operationId,
        disposition: 'created',
        task: {
          sessionId: row.sessionId,
          messageId: row.messageId,
          context: { cwd: '/workspace' },
          detail: { kind: 'host', ref: row.sessionId },
        },
      }
    } catch {
      row.result = this.failure(row.request.operationId, 'reconciliation-required', row.sessionId)
    }
  }

  async recover(owner, operationId) {
    const key = this.key(owner, operationId)
    const row = this.store.get(key)
    if (!row) return this.failure(operationId, 'host-unavailable')
    if (this.inflight.has(key)) {
      await this.inflight.get(key)
      return this.replay(row)
    }
    if (row.policy !== 'required') return this.failure(operationId, 'operation-conflict')
    if (row.phase === 'accepted') return this.replay(row)
    if (row.phase !== 'approval-install-failed') {
      return this.failure(operationId, 'reconciliation-required', row.sessionId)
    }
    if (!this.adapter.handles.has(row.sessionId)) return this.failure(operationId, 'host-unavailable', row.sessionId)
    const registration = this.registrations.get(this.key(owner, row.request.tool.commandId))
    if (!registration?.active) return this.failure(operationId, 'tool-unavailable', row.sessionId)
    row.phase = 'approval-installing'
    const work = this.install(row, registration)
    this.inflight.set(key, work)
    try {
      await work
      return structuredClone(row.result)
    } finally {
      this.inflight.delete(key)
    }
  }

  acquire(owner, operationId, authorized = true) {
    if (!authorized) return { status: 'unavailable', code: 'permission-denied' }
    const row = this.store.get(this.key(owner, operationId))
    if (!row) return { status: 'unavailable', code: 'not-found' }
    if (row.phase !== 'accepted') return { status: 'unavailable', code: 'not-accepted' }
    const handle = this.adapter.handles.get(row.sessionId)
    if (!handle) return { status: 'unavailable', code: 'host-unavailable' }
    return { status: 'acquired', handle }
  }
}
