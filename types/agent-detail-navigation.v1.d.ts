import type { AgentDetailReference } from './agents.v1.js'
import type { SessionId } from './sessions.v1.js'

/** Read-only request for the current Host detail target of one exact Session. */
export interface AgentSessionDetailReferenceRequest {
  readonly sessionId: SessionId
}

/**
 * Host-projected current detail reference. It never creates, resumes, or
 * returns an Agent handle; consumers cannot supply a Room or raw URL.
 */
export type AgentSessionDetailReferenceResult =
  | { readonly status: 'accepted'; readonly sessionId: SessionId; readonly target: AgentDetailReference }
  | { readonly status: 'denied'; readonly code: 'permission-denied' }
  | {
      readonly status: 'unavailable'
      readonly code:
        | 'session-unavailable'
        | 'detail-unavailable'
        | 'generation-replaced'
        | 'connection-replaced'
        | 'host-unavailable'
        | 'unsupported'
    }

/** Exact owner-scoped read-only current-detail projection. */
export interface AgentSessionDetailReferenceService {
  get(request: AgentSessionDetailReferenceRequest): Promise<AgentSessionDetailReferenceResult>
}

/** A Host navigation request accepts only the existing opaque host reference. */
export interface AgentDetailNavigationRequest {
  readonly target: AgentDetailReference
}

export type AgentDetailNavigationResult =
  | { readonly status: 'accepted'; readonly code: 'opened' }
  | { readonly status: 'denied'; readonly code: 'permission-denied' | 'ambiguous-detail' }
  | {
      readonly status: 'unavailable'
      readonly code:
        | 'unknown-detail'
        | 'stale-reference'
        | 'generation-replaced'
        | 'connection-replaced'
        | 'host-unavailable'
        | 'unsupported'
    }

/**
 * Host-owned detail navigation. The Host resolves a unique current same-owner
 * record before it calls its private navigator; it owns Back and history.
 */
export interface AgentDetailNavigationService {
  open(request: AgentDetailNavigationRequest): Promise<AgentDetailNavigationResult>
}
