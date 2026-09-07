import type { AgentDefinitionIdentity } from './agents.v1.js'

export interface EntitySettingsNavigationRequest {
  readonly identity: AgentDefinitionIdentity
}
export type EntitySettingsNavigationUnavailable = {
  readonly status: 'unavailable'
  readonly code: 'invalid-identity' | 'target-unavailable' | 'caller-unavailable' | 'host-unavailable'
}
export type EntitySettingsAvailabilityResult = { readonly status: 'available' } | EntitySettingsNavigationUnavailable
export type EntitySettingsNavigationResult =
  | { readonly status: 'accepted'; readonly code: 'opened' }
  | EntitySettingsNavigationUnavailable
/** Availability is advisory. Open resolves the exact identity and authorization again. */
export interface EntitySettingsNavigationService {
  get(request: EntitySettingsNavigationRequest): Promise<EntitySettingsAvailabilityResult>
  open(request: EntitySettingsNavigationRequest): Promise<EntitySettingsNavigationResult>
}
