import type { HttpClientV1, HttpConnectionV1, HttpResultV1 } from './plugin-http.v1.js'
export type * from './plugin-http.v1.js'

/** Plugin-declared partition labels, never account identity or credential authority. */
export interface HttpSessionScopeV2 {
  readonly origin: string
  readonly sourceId: string
  readonly accountId: string
}

export interface HttpClientV2 extends Omit<HttpClientV1, 'contract'> {
  readonly contract: 'cordisx.http-client/v2'
  /** Explicitly preserve the existing bearer in Host secure storage. No secret is returned. */
  retain(connection: HttpConnectionV1, scope: Omit<HttpSessionScopeV2, 'origin'>): Promise<HttpResultV1<null>>
  /** New live grant to the original bearer, or accepted/null when this exact partition is empty. */
  resume(scope: HttpSessionScopeV2): Promise<HttpResultV1<HttpConnectionV1 | null>>
  /** Delete this partition and abort/revoke its live grants. Missing entries succeed. */
  forget(scope: HttpSessionScopeV2): Promise<HttpResultV1<null>>
  /** Revokes live runtime authority; explicitly retained credentials survive lifecycle replacement. */
  dispose(): void
}
