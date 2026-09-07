import { isDeepStrictEqual as equal } from 'node:util'

// Protocol oracle only. Records/registrations are injected Host evidence, not plugin claims.
export class TaskPermissionModel {
  constructor(host) {
    this.host = host
    this.sources = new Map()
    this.leases = new Set()
  }
  current(source) {
    const h = this.host
    const record = h.records.get(source.operationId)
    return h.active && equal(source.owner, h.owner) && source.connectionGeneration === h.connectionGeneration
      && record?.bindingPolicy === 'required' && record.phase !== 'creating'
      && record.sessionId === source.sessionId && record.commandId === source.commandId
      && equal(record.definition, source.definition) && equal(record.owner, source.owner)
      && h.commands.has(source.commandId) && h.registrations.get(source.commandId) === source.taskRegistrationId
      && h.bindings.has(source.sessionId) && equal(h.bindings.get(source.sessionId).definition, source.definition)
  }
  install(source) {
    if (!this.current(source)) return false
    const frozen = Object.freeze(structuredClone(source))
    this.sources.set(source.sessionId, frozen)
    return frozen
  }
  valid(source) {
    return this.sources.get(source.sessionId) === source && this.current(source)
  }
  selector(capability, source) {
    const key = capability === 'approvals.request' ? 'task' : 'taskRequester'
    return this.host.scopes[capability]?.[key]?.commandId === source.commandId
  }
  async request(sessionId, source) {
    // Sticky durable provenance is checked independently of live source availability.
    if (this.host.requiredSessions.has(sessionId)) {
      if (
        !source || source.sessionId !== sessionId || !this.valid(source) || !this.selector('approvals.request', source)
      ) return false
      const allowed = await this.host.policy('approvals.request', sessionId, {
        kind: 'task',
        commandId: source.commandId,
        fingerprint: this.host.fingerprint,
      })
      return allowed && this.valid(source) && this.selector('approvals.request', source)
    }
    if (source) return false // no task-to-route source substitution
    const route = this.host.scopes['approvals.request']?.sessionIds
    return this.host.active && route?.routeId === this.host.route?.routeId && this.host.route?.sessionId === sessionId
      && await this.host.policy('approvals.request', sessionId, { kind: 'route', fingerprint: this.host.fingerprint })
  }
  routeCurrent(source, route) {
    const h = this.host
    return this.valid(source) && this.selector('approvals.answer', source)
      && h.routing.get(route.routingId) === route && route.status === 'accepted'
      && h.resolvers.has(route.registrationId) && h.answerers.has(route.authority.sessionId)
      && route.requester.sessionId === source.sessionId && equal(route.requester.definition, source.definition)
      && equal(h.bindings.get(route.requester.sessionId), route.requester)
      && equal(h.bindings.get(route.authority.sessionId), route.authority)
  }
  async mint(source, route) {
    if (!this.routeCurrent(source, route)) return false
    if (
      !await this.host.policy('approvals.answer', route.authority.sessionId, {
        kind: 'task',
        commandId: source.commandId,
        fingerprint: this.host.fingerprint,
      }) || !this.routeCurrent(source, route)
    ) {
      return false
    }
    const lease = Object.freeze({ taskSource: source, route })
    this.leases.add(lease)
    return lease
  }
  async answer(lease, humanAnswer) {
    if (!this.leases.has(lease) || !this.routeCurrent(lease.taskSource, lease.route)) return 'unavailable'
    const allowed = await this.host.policy('approvals.answer', lease.route.authority.sessionId, {
      kind: 'task',
      commandId: lease.taskSource.commandId,
      fingerprint: this.host.fingerprint,
    })
    if (!allowed || !this.leases.has(lease) || !this.routeCurrent(lease.taskSource, lease.route)) return 'unavailable'
    const outcome = await humanAnswer()
    if (!this.leases.has(lease) || !this.routeCurrent(lease.taskSource, lease.route)) return 'unavailable'
    this.leases.delete(lease)
    return outcome
  }
  routeAnswer(requester, authority) {
    if (this.host.requiredSessions.has(requester)) return false
    const declaration = this.host.scopes['approvals.answer']?.authorityRequester
    const correlation = this.host.ordinaryCorrelation
    return Boolean(
      this.host.active && declaration?.requester.routeId === this.host.route?.routeId
        && this.host.route?.sessionId === requester && correlation?.requester === requester
        && correlation?.authority === authority,
    )
  }
}
