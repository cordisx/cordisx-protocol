// Receiver model: transport changes never mutate the last authority snapshot.
export function validateSnapshot(snapshot) {
  const identities = snapshot.entries.map(e => JSON.stringify([e.identity.pluginId, e.identity.capabilityId]))
  if (new Set(identities).size !== identities.length) throw new Error('duplicate-entry')
  if (snapshot.entries.some(e => e.generation.host !== snapshot.cursor.hostGeneration)) {
    throw new Error('host-generation-mismatch')
  }
  const pages = snapshot.pages.map(p => JSON.stringify([p.pluginId, p.pageId]))
  if (new Set(pages).size !== pages.length) throw new Error('duplicate-page')
  for (const page of snapshot.pages) {
    if (new Set(page.actions.map(a => a.actionId)).size !== page.actions.length) throw new Error('duplicate-action')
  }
}

export class ObserverView {
  constructor() {
    this.snapshot = null
    this.connection = null
    this.closed = false
  }
  accept(event) {
    if (this.closed) return false
    if (event.kind === 'connection') {
      this.connection = structuredClone(event.connection)
      return true
    }
    const old = this.snapshot?.cursor
    const next = event.kind === 'closed' ? event.cursor : event.snapshot.cursor
    if (old && (next.scopeId !== old.scopeId || next.hostGeneration !== old.hostGeneration)) {
      throw new Error('scope-mismatch')
    }
    if (event.kind === 'closed') {
      this.closed = true
      return true
    }
    validateSnapshot(event.snapshot)
    if (old?.epoch === next.epoch && next.sequence <= old.sequence) return false
    if (old && old.epoch !== next.epoch && event.reason !== 'epoch-changed') throw new Error('missing-epoch-reset')
    this.snapshot = structuredClone(event.snapshot)
    return true
  }
}

export function pageActionAvailability(page, actionId, requirements, operation) {
  const deny = reason => ({ available: false, reason })
  const action = page.actions.find(a => a.actionId === actionId)
  if (!action || !operation.supported) return deny('unsupported')
  if (!operation.permitted || (operation.requiresGesture && !operation.freshGesture)) return deny('permission-denied')
  if (!operation.bound) return deny('binding-unavailable')
  for (const ref of action.requires) {
    const requirement = requirements.get(JSON.stringify([ref.pluginId, ref.capabilityId]))
    if (!requirement) return deny('unknown-target')
    if (!requirement.available) return requirement
  }
  return { available: true }
}
