/** A separate capability. Frozen HTTP and income contracts are unchanged. */
export interface WalletSpendSourceV1 {
  readonly serviceOrigin: string
  /** Canonical unpadded base64url Ed25519 SPKI DER. */
  readonly servicePublicKey: string
  readonly serverId: string
}
export interface WalletSpendIdentityV1 {
  readonly walletId: string
  readonly walletPublicKey: string
}
export interface WalletSpendRecordV1 {
  /** Serialized economy.spend-reservation/v1 signed envelope. Public receipt, never a secret. */
  readonly reservation: string
  readonly state: 'pending' | 'captured' | 'refunded'
  readonly settlement?: string
}
export type WalletSpendFailureV1 =
  | 'unsupported' | 'host-unavailable' | 'denied' | 'invalid-request' | 'source-unavailable'
  | 'wallet-unavailable' | 'stale-generation' | 'aborted' | 'deadline-exceeded'
  | 'outcome-unknown' | 'conflict' | 'provider-unavailable'
export type WalletSpendResultV1<T> =
  | { readonly status: 'accepted'; readonly value: T }
  | { readonly status: 'unavailable'; readonly code: WalletSpendFailureV1 }
export interface WalletSpendOperationV1 {
  readonly source: WalletSpendSourceV1
  /** Absolute Unix milliseconds. Host permits up to two minutes for native consent. */
  readonly deadline: number
  readonly signal?: AbortSignal
}
export interface WalletPurchaseOperationV1 {
  readonly storeId: string
  readonly deadline: number
  readonly signal?: AbortSignal
}
export interface WalletPurchaseInputV1 extends WalletPurchaseOperationV1 {
  readonly itemId: string
  readonly quantity: number
  readonly expectedTotal: number
  readonly requestId: string
  readonly fulfillmentTarget?: { readonly namespace: string; readonly storeId: string }
}
export interface WalletSpendV1 {
  readonly contract: 'cordisx.wallet-spend/v1'
  identity(): Promise<WalletSpendResultV1<WalletSpendIdentityV1>>
  /** HTTPS metadata then native origin/key approval. Does not select a wallet or funding authority. */
  authorizeSource(input: {
    readonly serviceOrigin: string
    readonly deadline: number
    readonly signal?: AbortSignal
  }): Promise<WalletSpendResultV1<WalletSpendSourceV1>>
  /** Fixed signed Game challenge; derives the original wallet and uses native confirmation. */
  bindGameAccount(input: WalletSpendOperationV1 & {
    readonly challenge: string
  }): Promise<WalletSpendResultV1<string>>
  /** Fixed economy.spend-terms/v1 envelope. No caller amount, wallet selector or approval callback. */
  reserve(input: WalletSpendOperationV1 & {
    readonly terms: string
    /** Persist before calling. Same wallet/source/id must recover the original durable reservation. */
    readonly requestId: string
  }): Promise<WalletSpendResultV1<WalletSpendRecordV1>>
  lookup(input: WalletSpendOperationV1 & {
    readonly requestId: string
  }): Promise<WalletSpendResultV1<WalletSpendRecordV1 | null>>
  /** Fixed signed service decision: bounded consumption and release of the same principal only. */
  applyDecision(input: WalletSpendOperationV1 & {
    readonly decision: string
  }): Promise<WalletSpendResultV1<readonly WalletSpendRecordV1[]>>
  /** Fixed local commerce, with a deployment-provisioned owner/store binding. JSON is data only. */
  catalog(input: WalletPurchaseOperationV1): Promise<WalletSpendResultV1<string>>
  /** JSON is an exact order or an authoritative terminal cancellation receipt. */
  purchase(input: WalletPurchaseInputV1): Promise<WalletSpendResultV1<string>>
  /** Exact original input, native confirmation and mutually exclusive terminal cancellation. */
  cancelPurchase(input: WalletPurchaseInputV1): Promise<WalletSpendResultV1<string>>
  order(input: WalletPurchaseOperationV1 & { readonly requestId: string }): Promise<WalletSpendResultV1<string | null>>
  orders(input: WalletPurchaseOperationV1): Promise<WalletSpendResultV1<string>>
  /** Exact historical receipt lookup only; cannot recreate or credit a missing operation. */
  legacyReceipt(input: {
    readonly kind: 'grant' | 'migration' | 'purchase'
    readonly requestId: string
    readonly input: string
    readonly deadline: number
    readonly signal?: AbortSignal
  }): Promise<WalletSpendResultV1<string | null>>
  /** Retires this caller's pending authorizations. Already committed funds require durable recovery. */
  dispose(): void
}
