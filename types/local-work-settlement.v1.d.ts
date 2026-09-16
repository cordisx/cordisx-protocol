import type { LocalWalletBindingV1, LocalWalletAssertionV1 } from './local-wallet.v1.js'
import type { WorkUsageSnapshotV2 } from './usage.v2.js'
import type { HttpResponseV1 } from './plugin-http.v1.js'
import type { LocalWalletHttpResultV4 } from './plugin-http.v4.js'

export interface LocalWorkSettlementPayloadV1 extends Omit<LocalWalletAssertionV1, 'contract' | 'audience'> {
  readonly contract: 'cordisx.local-work-settlement/v1'
  readonly audience: 'local-work-income'
  readonly snapshot: Extract<WorkUsageSnapshotV2, { readonly status: 'ready' }>
}
export interface LocalWorkSettlementReceiptV1 {
  readonly eventId: string
  readonly binding: { readonly instanceId: string; readonly accountId: string; readonly scopeId: string }
  readonly amount: number
  readonly remainder: number
  readonly cursor: {
    readonly scopeId: string
    readonly sourceId: string
    readonly epoch: string
    readonly revision: number
    readonly tokens: number
    readonly observedThrough: number
  }
  readonly coverage: 'partial'
  readonly policy: 'durable-admitted-v1'
}
/** Independent capability: HTTP v4 and its leased work semantics remain frozen. */
export interface LocalWorkSettlementV1 {
  readonly contract: 'cordisx.local-work-settlement/v1'
  /** Host reads its own admitted ledger; no caller baseline, snapshot, amount or cursor. */
  settle(
    binding: LocalWalletBindingV1 & { readonly audience: 'local-work-income' },
  ): Promise<LocalWalletHttpResultV4<HttpResponseV1>>
}
/** Shape and exact snapshot pins only; callers must separately verify the signed result. */
export function localWorkSettlementReceipt(
  value: unknown,
  snapshot: LocalWorkSettlementPayloadV1['snapshot'],
  binding: LocalWalletBindingV1,
  accountId: string,
): LocalWorkSettlementReceiptV1
