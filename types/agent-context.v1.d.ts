import type { SessionId } from './sessions.v1.js'

/** Observed current occupancy, never accumulated billing or lifetime usage. */
export interface AgentContextSampleV1 {
  readonly contract: 'cordisx.agent-context-sample/v1'
  readonly sessionId: SessionId
  readonly sessionGeneration: number
  /** Exact native turn identity only when observed, never inferred from a message. */
  readonly turnId?: string
  readonly usedTokens: number
  /** Sanitized description of the actually observed accounting scope. */
  readonly measurement: { readonly source: 'provider-current-context' | 'adapter-derived-current-context'; readonly scope: string }
  readonly rawModelWindowTokens?: number
  readonly usableModelWindowTokens?: number
  readonly budget: { readonly status: 'resolved'; readonly tokens: number; readonly source: 'effective-configuration' | 'provider-metadata' | 'adapter-derived' }
    | { readonly status: 'unavailable'; readonly reason: 'unknown' | 'unsupported' | 'disabled' }
  /** usedTokens / budget.tokens; absent when budget is unavailable. May exceed 1. */
  readonly ratio?: number
  readonly observedAt: number
  readonly expiresAt: number
  readonly resetEpoch: string
  readonly configEpoch: string
}

export type AgentContextUnavailableV1 = 'denied' | 'unsupported' | 'unavailable' | 'stale' | 'session-replaced' | 'connection-replaced' | 'generation-replaced' | 'invalid-request'
export type AgentContextReadResultV1 = { readonly status: 'available'; readonly sample: AgentContextSampleV1 } | { readonly status: 'unavailable'; readonly code: AgentContextUnavailableV1 }
export interface AgentContextThresholdEventV1 {
  readonly contract: 'cordisx.agent-context-threshold/v1'
  readonly thresholdRatio: number
  readonly reason: 'crossed' | 'epoch-initial'
  readonly sample: AgentContextSampleV1
}
export interface AgentContextSubscriptionV1 {
  /** Resolves once and never rejects; no observer starts after resolution. */
  readonly closed: Promise<{ readonly code: AgentContextUnavailableV1 | 'unsubscribed' | 'observer-failed' }>
  unsubscribe(): Promise<void>
}
export type AgentContextWatchResultV1 = { readonly status: 'subscribed'; readonly subscription: AgentContextSubscriptionV1 } | { readonly status: 'unavailable'; readonly code: AgentContextUnavailableV1 }
/** Host-owned, owner- and generation-fenced read-only current-connection service. */
export interface AgentContextV1 {
  readonly contract: 'cordisx.agent-context/v1'
  read(sessionId: SessionId): Promise<AgentContextReadResultV1>
  watch(request: { readonly sessionId: SessionId; readonly thresholdRatio: number }, observer: (event: AgentContextThresholdEventV1) => void | Promise<void>): Promise<AgentContextWatchResultV1>
}
