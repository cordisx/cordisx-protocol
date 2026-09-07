import type {
  AgentDetailNavigationService as AgentDetailNavigationServiceV1,
  AgentSessionDetailReferenceService as AgentSessionDetailReferenceServiceV1,
  AgentSessionDetailReferenceRequest,
  AgentSessionDetailReferenceResult as AgentSessionDetailReferenceResultV1,
  AgentDetailNavigationRequest,
  AgentDetailNavigationResult,
} from './agent-detail-navigation.v1.js'

export type { AgentSessionDetailReferenceRequest, AgentDetailNavigationRequest, AgentDetailNavigationResult }

/** V2 can deny ambiguous persisted ownership without selecting a record. */
export type AgentSessionDetailReferenceResult =
  | AgentSessionDetailReferenceResultV1
  | { readonly status: 'denied'; readonly code: 'ambiguous-session' }

/** V1 get remains current-only. V2 may read an authenticated persisted mapping. */
export interface AgentSessionDetailReferenceService extends AgentSessionDetailReferenceServiceV1 {
  getV2(request: AgentSessionDetailReferenceRequest): Promise<AgentSessionDetailReferenceResult>
}

/** V1 open remains current-only. V2 revalidates an issued historical capability. */
export interface AgentDetailNavigationService extends AgentDetailNavigationServiceV1 {
  openV2(request: AgentDetailNavigationRequest): Promise<AgentDetailNavigationResult>
}
