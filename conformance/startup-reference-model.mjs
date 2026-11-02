// Conformance-only executable semantics. This is not a Host runtime implementation.
const key = ref => JSON.stringify([ref.pluginId, ref.capabilityId])
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const unique = (values, label) => {
  if (new Set(values).size !== values.length) throw new Error(`duplicate-${label}`)
}

export function admit(plugins) {
  const graph = new Map()
  const providers = []
  unique(plugins.map(p => p.manifest.id), 'plugin')
  for (const { manifest } of plugins) {
    unique(manifest.services.map(s => s.id), 'service')
    if (manifest.schemaVersion < 15) continue
    unique(manifest.startup.capabilities.map(c => c.id), 'capability')
    unique(manifest.startup.pages.map(p => p.pageId), 'page')
    for (const capability of manifest.startup.capabilities) {
      const service = manifest.services.find(s => s.id === capability.serviceId)
      if (!service) throw new Error('unknown-service')
      unique(capability.milestones, 'milestone')
      unique(capability.dependsOn.map(key), 'dependency')
      unique(capability.success.allOf.map(c => JSON.stringify(c)), 'condition')
      const kinds = capability.success.allOf.map(c => c.kind)
      if (!kinds.includes('service-ready')) throw new Error('missing-service-condition')
      for (const condition of capability.success.allOf) {
        if (condition.kind === 'milestone' && !capability.milestones.includes(condition.milestoneId)) {
          throw new Error('undeclared-milestone')
        }
      }
      if (capability.kind === 'provider') {
        providers.push(capability.providerId)
        if (service.kind !== 'managed-backend') throw new Error('provider-service-kind')
        if (!kinds.includes('catalog-known') || !kinds.includes('provider-published')) {
          throw new Error('missing-provider-condition')
        }
      } else if (kinds.includes('catalog-known') || kinds.includes('provider-published')) {
        throw new Error('provider-only-condition')
      }
      if (capability.milestones.length && service.kind !== 'managed-backend') throw new Error('milestone-service-kind')
      graph.set(key({ pluginId: manifest.id, capabilityId: capability.id }), { ...capability, pluginId: manifest.id })
    }
  }
  unique(providers, 'provider')
  const validateReference = (ref, owner) => {
    if (!graph.has(key(ref))) throw new Error('unknown-dependency')
    if (ref.pluginId !== owner.manifest.id && !owner.dependencies.includes(ref.pluginId)) {
      throw new Error('undeclared-package-dependency')
    }
  }
  for (const plugin of plugins.filter(p => p.manifest.schemaVersion === 15)) {
    for (const capability of plugin.manifest.startup.capabilities) {
      for (const dependency of capability.dependsOn) validateReference(dependency, plugin)
    }
    for (const page of plugin.manifest.startup.pages) {
      unique(page.actions.map(a => a.actionId), 'action')
      for (const ref of [...page.observes, ...page.actions.flatMap(a => a.requires)]) validateReference(ref, plugin)
    }
  }
  const active = new Set()
  const visited = new Set()
  const visit = id => {
    if (active.has(id)) throw new Error('dependency-cycle')
    if (visited.has(id)) return
    active.add(id)
    for (const dep of graph.get(id).dependsOn) visit(key(dep))
    active.delete(id)
    visited.add(id)
  }
  for (const id of graph.keys()) visit(id)
  return graph
}

export function plan(graph, plugins, mode, target) {
  const wait = new Set()
  const start = new Set()
  const closure = (id, output) => {
    if (output.has(id)) return
    if (!graph.has(id)) throw new Error('unknown-target')
    output.add(id)
    for (const dep of graph.get(id).dependsOn) closure(key(dep), output)
  }
  for (const [id, cap] of graph) {
    closure(id, start)
    if (!target && cap.wait[mode] === 'always') closure(id, wait)
  }
  if (target) closure(key(target), wait)
  for (const id of wait) closure(id, start)
  const legacy = plugins.flatMap(({ manifest }) =>
    manifest.services.filter(s => !manifest.startup?.capabilities.some(c => c.serviceId === s.id))
      .map(s => `${manifest.id}/${s.id}`)
  )
  return { wait: [...wait], start: [...start], legacy: target ? [] : legacy }
}

export function conditionSatisfied(condition, evidence) {
  switch (condition.kind) {
    case 'service-ready':
      return evidence.service === 'ready' && evidence.health === 'ready'
    case 'authenticated':
      return ['authenticated', 'not-required'].includes(evidence.authentication)
    case 'catalog-known':
      return evidence.catalog.state === 'known'
    case 'provider-published':
      return evidence.provider === 'published'
    case 'milestone':
      return evidence.milestones[condition.milestoneId] === 'satisfied'
    default:
      throw new Error('unknown-condition')
  }
}

export function summarize(capability, evidence, dependenciesReady = true) {
  if (!capability) return 'unknown'
  if (evidence.revoked) return 'revoked'
  if (evidence.service === 'stopped' || evidence.process === 'stopped') return 'stopped'
  if (
    evidence.service === 'failed' || evidence.process === 'failed' || evidence.prepareState === 'failed'
    || evidence.catalog.state === 'failed'
    || (capability.kind === 'provider' && evidence.catalog.state === 'known' && evidence.catalog.modelIds.length === 0)
    || Object.values(evidence.milestones).includes('failed')
  ) return 'failed'
  if (!evidence.started) return 'declared'
  if (
    (evidence.requiresAuthentication || capability.success.allOf.some(c => c.kind === 'authenticated'))
    && !['authenticated', 'not-required'].includes(evidence.authentication)
  ) {
    return 'auth-required'
  }
  if (capability.kind === 'provider' && ['unknown', 'pending'].includes(evidence.catalog.state)) {
    return 'catalog-pending'
  }
  return evidence.prepareState === 'fulfilled' && dependenciesReady
      && capability.success.allOf.every(c => conditionSatisfied(c, evidence))
    ? 'ready'
    : 'preparing'
}

export function availability(capability, evidence, options = {}) {
  const deny = reason => ({ available: false, reason })
  if (!capability) return deny('unknown-target')
  if (evidence.revoked) return deny('revoked')
  if (options.permitted === false) return deny('permission-denied')
  if (options.supported === false) return deny('unsupported')
  if (options.action === 'authenticate') {
    return evidence.authenticationSupported
      ? { available: true }
      : deny('unsupported')
  }
  if (capability.kind === 'provider' && evidence.catalog.state === 'known') {
    if (!evidence.catalog.modelIds.length) return deny('catalog-empty')
    if (options.modelId && !evidence.catalog.modelIds.includes(options.modelId)) return deny('model-unavailable')
  }
  const state = summarize(capability, evidence, options.dependenciesReady !== false)
  const reason =
    { unknown: 'unknown-target', declared: 'not-prepared', 'auth-required': 'authentication-required' }[state] ?? state
  if (state !== 'ready') {
    if (state !== 'preparing') return deny(reason)
    if (options.dependenciesReady === false) return deny('dependency-not-ready')
    if (capability.success.allOf.some(c => c.kind === 'milestone' && !conditionSatisfied(c, evidence))) {
      return deny('milestone-pending')
    }
    if (capability.kind === 'provider' && evidence.provider !== 'published') return deny('provider-unpublished')
    return deny('preparing')
  }
  if (!evidence.binding) return deny('binding-unavailable')
  return { available: true }
}

export function publicationAllowed(capability, owner, publication, origins, catalog) {
  return catalog?.state === 'known' && catalog.modelIds.length > 0
    && publication.catalog.generation === catalog.generation
    && same([...publication.catalog.routes.map(r => r.alias)].sort(), [...catalog.modelIds].sort())
    && capability.kind === 'provider' && capability.pluginId === owner.pluginId
    && publication.providerId === capability.providerId
    && publication.owner.pluginId === owner.pluginId
    && publication.owner.hostGeneration === owner.hostGeneration
    && publication.owner.pluginGeneration === owner.pluginGeneration
    && publication.service.serviceId === capability.serviceId
    && publication.service.serviceGeneration === owner.serviceGeneration
    && publication.compositionOrigin === capability.compositionOrigin
    && origins.includes(publication.compositionOrigin)
}

export class Reporter {
  constructor(capability, generation) {
    this.capability = capability
    this.generation = generation
    this.sequences = new Map()
    this.states = new Map()
    this.revoked = false
  }
  report(input, caller) {
    const reject = reason => ({ status: 'rejected', reason })
    if (this.revoked) return reject('revoked')
    if (caller.pluginId !== this.capability.pluginId || caller.serviceId !== this.capability.serviceId) {
      return reject('not-owner')
    }
    if (
      key(input.target) !== key({ pluginId: this.capability.pluginId, capabilityId: this.capability.id })
      || !this.capability.milestones.includes(input.milestoneId)
    ) return reject('undeclared')
    if (!same(input.generation, this.generation)) return reject('stale-generation')
    if (input.sequence <= (this.sequences.get(input.milestoneId) ?? 0)) return reject('stale-sequence')
    this.sequences.set(input.milestoneId, input.sequence)
    this.states.set(input.milestoneId, input.state)
    return { status: 'accepted' }
  }
}

export class ObserverStream {
  constructor(snapshot, limit = 3) {
    this.snapshot = structuredClone(snapshot)
    this.history = [this.snapshot]
    this.limit = limit
    this.subscribers = new Set()
    this.terminal = false
  }
  read() {
    if (this.terminal) throw new Error('scope-revoked')
    return structuredClone(this.snapshot)
  }
  subscribe(listener, after) {
    if (this.terminal) throw new Error('scope-revoked')
    const current = this.snapshot.cursor
    if (after && (after.scopeId !== current.scopeId || after.hostGeneration !== current.hostGeneration)) {
      throw new Error('scope-mismatch')
    }
    const subscriber = { listener, closed: false }
    const emit = event => {
      if (!subscriber.closed) listener(structuredClone(event))
    }
    subscriber.emit = emit
    this.subscribers.add(subscriber)
    if (!after) emit({ kind: 'snapshot', reason: 'initial', snapshot: this.snapshot })
    else if (after.epoch !== current.epoch) emit({ kind: 'snapshot', reason: 'epoch-changed', snapshot: this.snapshot })
    else if (after.sequence > current.sequence || after.sequence < this.history[0].cursor.sequence) {
      emit({ kind: 'snapshot', reason: 'gap', snapshot: this.snapshot })
    } else {
      for (const snapshot of this.history.filter(s => s.cursor.sequence > after.sequence)) {
        emit({ kind: 'snapshot', reason: 'update', snapshot })
      }
    }
    return { close: () => this.close(subscriber, 'unsubscribed') }
  }
  close(subscriber, reason) {
    if (subscriber.closed) return
    subscriber.closed = true
    this.subscribers.delete(subscriber)
    subscriber.listener({ kind: 'closed', reason, cursor: structuredClone(this.snapshot.cursor) })
  }
  publish(entries, epoch = this.snapshot.cursor.epoch) {
    if (this.terminal) return false
    const reset = epoch !== this.snapshot.cursor.epoch
    this.snapshot = {
      ...this.snapshot,
      cursor: { ...this.snapshot.cursor, epoch, sequence: reset ? 0 : this.snapshot.cursor.sequence + 1 },
      entries: structuredClone(entries),
    }
    this.history = reset ? [this.snapshot] : [...this.history, this.snapshot].slice(-this.limit)
    for (const subscriber of this.subscribers) {
      subscriber.emit({ kind: 'snapshot', reason: reset ? 'epoch-changed' : 'update', snapshot: this.snapshot })
    }
    return true
  }
  terminate(reason) {
    if (this.terminal) return
    this.terminal = true
    for (const subscriber of this.subscribers) this.close(subscriber, reason)
  }
}

export class Preparation {
  constructor(generation) {
    this.generation = generation
    this.waiters = new Set()
    this.leases = new Set()
    this.starts = 0
    this.running = false
  }
  join(id) {
    this.waiters.add(id)
    if (!this.running) {
      this.running = true
      this.starts++
    }
  }
  cancel(id) {
    this.waiters.delete(id)
  }
  complete(generation) {
    if (generation !== this.generation) return []
    const ready = [...this.waiters]
    for (const id of ready) this.leases.add(id)
    this.waiters.clear()
    return ready
  }
  release(id) {
    this.leases.delete(id)
  }
}

export { key }

export class Adoption {
  constructor() {
    this.state = 'new'
    this.prepared = new Set()
    this.disposed = false
  }
  async apply(module) {
    this.state = 'applying'
    await module.apply()
    if (!this.disposed) this.state = 'adopted'
  }
  async prepare(module, capability, dependenciesReady, signal) {
    if (this.state !== 'adopted' || this.disposed) throw new Error('not-adopted')
    if (!dependenciesReady) throw new Error('dependency-not-ready')
    if (this.prepared.has(capability.id)) return
    this.prepared.add(capability.id)
    await module.prepare({ capability, signal })
    // Return is not proof of provider readiness; success is evaluated independently.
  }
}
