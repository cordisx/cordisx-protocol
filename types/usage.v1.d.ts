/** Observed local profile usage, never an account bill or monetary amount. */
export interface UsageReadCapabilityV1 {
  readonly name: 'usage.read'
  readonly required: boolean
  readonly scope: { readonly profile: 'current' }
}
export interface UsageDiagnosticV1 { readonly code: string; readonly count?: number }
export interface UsageReadySnapshotV1 {
  readonly schemaVersion: 1
  readonly status: 'ready'
  readonly scopeId: string
  readonly sourceId: string
  readonly epoch: string
  readonly revision: number
  readonly policyId: 'codex-local-input-output-v1'
  readonly eligibleTokens: number
  readonly inputTokens: number
  readonly outputTokens: number
  readonly enabledAt: number
  readonly observedThrough: number
  readonly coverage: 'partial'
  readonly diagnostics: readonly UsageDiagnosticV1[]
}
export interface UsageUnavailableSnapshotV1 {
  readonly schemaVersion: 1
  readonly status: 'unavailable'
  readonly reason: 'permission-denied' | 'host-unavailable' | 'source-unavailable' | 'store-unavailable' | 'generation-retired'
  readonly diagnostics: readonly UsageDiagnosticV1[]
}
export type UsageSnapshotV1 = UsageReadySnapshotV1 | UsageUnavailableSnapshotV1
export interface UsageV1 {
  read(): Promise<UsageSnapshotV1>
  /** Invalidation hint only. Consumers read and transactionally compare the aggregate. */
  subscribe(listener: () => void): () => void
}
