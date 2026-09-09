import type { UsageV1, UsageReadySnapshotV1, UsageUnavailableSnapshotV1 } from './usage.v1.js'
export type WorkUsageSnapshotV2 =
  | (Omit<UsageReadySnapshotV1, 'schemaVersion' | 'policyId'> & {
    readonly schemaVersion: 2
    readonly policyId: 'codex-local-work-input-output-v2'
    readonly classification: {
      readonly version: 'host-game-cwd-v1'
      readonly hostGameTasks: 'excluded'
      readonly forksAndSubagents: 'excluded'
      readonly unknownSources: 'excluded'
    }
  })
  | (Omit<UsageUnavailableSnapshotV1, 'schemaVersion'> & { readonly schemaVersion: 2 })
export interface UsageV2 extends UsageV1 {
  /** Independent ledger and epoch. Never subtract this projection from v1 totals. */
  readWork(): Promise<WorkUsageSnapshotV2>
}
