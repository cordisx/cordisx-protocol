/** Credential values never cross this public interface. */
export interface HttpConnectionV1 {
  readonly contract: 'cordisx.http-connection/v1'
  readonly id: string
  readonly origin: string
  readonly credential: 'none' | 'bearer'
}

export type HttpFailureCodeV1 =
  | 'denied' | 'unsupported' | 'invalid-request' | 'stale-generation'
  | 'connection-unavailable' | 'credential-unavailable' | 'host-unavailable'
  | 'aborted' | 'deadline-exceeded' | 'response-too-large' | 'redirect-denied' | 'network-error'

export type HttpResultV1<T> =
  | { readonly status: 'accepted'; readonly value: T }
  | { readonly status: 'unavailable'; readonly code: HttpFailureCodeV1 }

export interface HttpRequestV1 {
  readonly connection: HttpConnectionV1
  /** Absolute path on exactly the authorized origin. No URL, // authority or fragment. */
  readonly path: string
  readonly method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  readonly headers?: Readonly<Partial<Record<'accept' | 'content-type' | 'idempotency-key', string>>>
  readonly body?: string
  /** Absolute Unix time in milliseconds; Host caps requests to 30 seconds. */
  readonly deadline: number
  readonly signal?: AbortSignal
}

export interface HttpResponseV1 {
  readonly statusCode: number
  readonly contentType: string | null
  readonly body: string
}

export interface HttpClientV1 {
  readonly contract: 'cordisx.http-client/v1'
  /** Host-owned consent and optional masked bearer-token capture. Never accepts a token. */
  authorize(input: { readonly origin: string; readonly credential: 'none' | 'bearer' }): Promise<HttpResultV1<HttpConnectionV1>>
  request(input: HttpRequestV1): Promise<HttpResultV1<HttpResponseV1>>
  /** POST on the same authorized origin; Host removes the top-level token field before returning JSON. */
  exchange(input: Omit<HttpRequestV1, 'method'> & { readonly credentialField: string }): Promise<HttpResultV1<{
    readonly connection: HttpConnectionV1
    readonly response: HttpResponseV1
  }>>
  /** Revokes this connection, aborts its requests and removes its stored credential. */
  revoke(connection: HttpConnectionV1): Promise<HttpResultV1<null>>
  /** Revokes runtime authority, aborts requests and removes transient stored credentials. */
  dispose(): void
}
