import type { HttpClientV3 } from './plugin-http.v3.js'
import type { HttpConnectionV1, HttpResponseV1, HttpResultV1 } from './plugin-http.v1.js'
import type { LocalWalletBindingV1 } from './local-wallet.v1.js'
export type * from './plugin-http.v3.js'
export type * from './local-wallet.v1.js'

export type LocalWalletHttpResultV4<T> = HttpResultV1<T> | {
  readonly status: 'unavailable'
  readonly code: 'local-wallet-not-enrolled' | 'local-wallet-reconciliation-required' | 'local-wallet-revoked'
}

export interface HttpClientV4 extends Omit<HttpClientV3, 'contract'> {
  readonly contract: 'cordisx.http-client/v4'
  /** Explicit delegation to the same existing wallet. Requires valid original Native-pinned authority. */
  enrollLocalWallet(input: {
    readonly binding: LocalWalletBindingV1 & { readonly audience: 'local-wallet-enrollment' }
    readonly connection: HttpConnectionV1
  }): Promise<LocalWalletHttpResultV4<HttpResponseV1>>
  /** Reopens only an enrolled Host-profile wallet; never creates a fallback account. */
  connectLocalAccount(
    input: LocalWalletBindingV1 & { readonly audience: 'local-wallet' },
  ): Promise<LocalWalletHttpResultV4<{ readonly connection: HttpConnectionV1; readonly response: HttpResponseV1 }>>
  /** Launcher reads and signs its own classified ledger; callers supply no snapshot or amount. */
  submitLocalWorkUsage(
    input: LocalWalletBindingV1 & { readonly audience: 'local-work-income'; readonly baseline?: true },
  ): Promise<LocalWalletHttpResultV4<HttpResponseV1>>
}
