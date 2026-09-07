// Conformance-only model. Durable rows belong to the existing owner/Session
// binding authority; injected adapter effects model native boundaries.
export function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  if (value !== null && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`
  }
  return JSON.stringify(value)
}

function isJson(value, seen = new Set()) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return true
  if (typeof value === 'number') return Number.isFinite(value)
  if (typeof value !== 'object' || seen.has(value)) return false
  if (!Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype) return false
  seen.add(value)
  const valid = Object.values(value).every(item => isJson(item, seen))
  seen.delete(value)
  return valid
}

export class AgentTaskModel {
  constructor(store, adapter, validate) {
    this.store = store
    this.adapter = adapter
    this.validate = validate
    this.inflight = new Map()
  }

  async create(owner, input, authority = true) {
    const request = input
    const unavailable = (code, sessionId) => ({
      status: 'unavailable',
      operationId: request.operationId,
      code,
      ...(sessionId ? { sessionId } : {}),
    })
    if (!authority) return unavailable('permission-denied')
    if (!request.context) return unavailable('context-required')
    if (!isJson(request)) return unavailable('invalid-input')
    if (!this.validate(request) || !request.text.trim()) return unavailable('invalid-input')
    const key = canonical([owner, request.operationId])
    const fingerprint = canonical(request)
    const old = this.store.get(key)
    if (old) {
      if (old.fingerprint !== fingerprint) return unavailable('operation-conflict')
      if (this.inflight.has(key)) await this.inflight.get(key)
      return structuredClone(old.result.status === 'accepted' ? { ...old.result, disposition: 'replayed' } : old.result)
    }
    const context = this.adapter.resolve(owner, request.context)
    if (typeof context === 'string') return unavailable(context)
    if (!this.adapter.definitionAvailable) return unavailable('definition-unavailable')
    if (!this.adapter.toolAvailable) return unavailable('tool-unavailable')
    const row = { fingerprint, context, result: unavailable('reconciliation-required') }
    this.store.set(key, row) // durable intent before any effect
    const operation = this.execute(row, structuredClone(request), unavailable)
    this.inflight.set(key, operation)
    try {
      await operation
      return structuredClone(row.result)
    } finally {
      this.inflight.delete(key)
    }
  }

  async execute(row, request, unavailable) {
    try {
      const session = await this.adapter.create(row.context)
      if (!session) {
        row.result = unavailable('create-failed')
        return
      }
      row.sessionId = session.id
      row.messageId = `first:${session.id}`
      row.result = unavailable('reconciliation-required', session.id)
      if (session.cwd !== row.context.cwd) {
        row.result = unavailable('context-unavailable', session.id)
        return
      }
      if (!this.adapter.authorized) {
        row.result = unavailable('host-unavailable', session.id)
        return
      }
      if (!await this.adapter.bind(session.id, request.tool)) {
        row.result = unavailable('tool-unavailable', session.id)
        return
      }
      if (!this.adapter.authorized) {
        row.result = unavailable('host-unavailable', session.id)
        return
      }
      if (!await this.adapter.submit(session.id, row.messageId, request.text)) {
        row.result = unavailable('submit-failed', session.id)
        return
      }
      row.result = {
        status: 'accepted',
        operationId: request.operationId,
        disposition: 'created',
        task: {
          sessionId: session.id,
          messageId: row.messageId,
          context: row.context,
          detail: { kind: 'host', ref: `detail:${session.id}` },
        },
      }
    } catch {
      row.result = unavailable('reconciliation-required', row.sessionId)
    }
  }

  query(owner, operationId, authority = true) {
    if (!authority) return { status: 'unavailable', code: 'permission-denied' }
    const row = this.store.get(canonical([owner, operationId]))
    if (!row) return { status: 'not-found' }
    return structuredClone({
      status: 'found',
      result: row.result,
      execution: row.sessionId
        ? this.adapter.observe(row.sessionId)
        : { status: 'unavailable', code: 'host-unavailable' },
    })
  }
}
