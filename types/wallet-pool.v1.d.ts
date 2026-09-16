import type { WalletSpendOperationV1, WalletSpendResultV1 } from './wallet-spend.v1.js'
/** Optional transfer capability. Existing wallet-spend/v1 capture/refund remains non-transferable. */
export interface WalletPoolRecordV1 {
  readonly reservation: string
  readonly sequence: number
  readonly paid: number
  readonly exited: boolean
  readonly decisionHash: string | null
}
export interface WalletPoolV1 {
  readonly contract: 'cordisx.wallet-pool/v1'
  /** Exact service-signed economy.pool-terms/v1; Host-owned authorization of the original wallet's principal. */
  reserve(input: WalletSpendOperationV1 & { readonly terms: string; readonly requestId: string }): Promise<WalletSpendResultV1<WalletPoolRecordV1>>
  lookup(input: WalletSpendOperationV1 & { readonly requestId: string }): Promise<WalletSpendResultV1<WalletPoolRecordV1 | null>>
  /** Ordered immutable economy.pool-decision/v1. No caller-selected amount or recipient. */
  applyDecision(input: WalletSpendOperationV1 & { readonly decision: string }): Promise<WalletSpendResultV1<WalletPoolRecordV1>>
}
