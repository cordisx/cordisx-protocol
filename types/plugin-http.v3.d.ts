import type { HttpClientV2 } from './plugin-http.v2.js'
import type { HttpConnectionV1, HttpResponseV1, HttpResultV1 } from './plugin-http.v1.js'
import type { ManagedSourceBindingV1 } from './managed-source.v1.js'
export type * from './plugin-http.v2.js'
export type * from './managed-source.v1.js'
export interface HttpClientV3 extends Omit<HttpClientV2, 'contract'> {
  readonly contract: 'cordisx.http-client/v3'
  /** Only a Host provisioned managed source; no native or source token is returned. */
  connectAccount(
    input: ManagedSourceBindingV1 & {
      readonly displayName?: string
      /** Optional existing source grant for a server-controlled guest ownership upgrade. */
      readonly previousConnection?: HttpConnectionV1
    },
  ): Promise<
    HttpResultV1<{
      readonly connection: HttpConnectionV1
      readonly response: HttpResponseV1
    }>
  >
  /** Launcher reads its own classified work ledger. Caller cannot supply usage or amount. */
  submitWorkUsage(input: ManagedSourceBindingV1 & { readonly baseline?: true }): Promise<HttpResultV1<HttpResponseV1>>
}
