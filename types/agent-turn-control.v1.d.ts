import type { SessionId } from './sessions.v1.js'

declare const exactTurnControl: unique symbol
/** Opaque Host-issued authority for one owned Session and one exact native turn. */
export interface AgentExactTurnControlV1 {
  readonly contract: 'cordisx.agent-exact-turn-control/v1'
  readonly sessionId: SessionId
  readonly turnId: string
  readonly [exactTurnControl]: never
  cancel(): Promise<{ readonly status: 'accepted'; readonly outcome: 'cancelled' | 'already-terminal' } | { readonly status: 'unavailable'; readonly code: 'denied' | 'unsupported' | 'stale' | 'uncertain' | 'host-unavailable' }>
}
/** This service never grants control from observation alone. */
export interface AgentTurnControlV1 {
  readonly contract: 'cordisx.agent-turn-control/v1'
  acquire(input: { readonly sessionId: SessionId; readonly turnId: string }): Promise<{ readonly status: 'available'; readonly target: AgentExactTurnControlV1 } | { readonly status: 'unavailable'; readonly code: 'denied' | 'unsupported' | 'stale' | 'host-unavailable' }>
}
