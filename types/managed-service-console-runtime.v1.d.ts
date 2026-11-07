/** Optional export from the same admitted Node module as the service's web entry. */
export interface ManagedServiceConsoleSourceV1 {
  readonly contract: 'cordisx.managed-service-console-source/v1'
  readonly serviceId: string
  readonly operationId: string
  readonly landingPath: `/${string}`
}

/** Private Launcher-to-service operation. Binding is random, unique per mount and never reused. */
export interface ManagedServiceConsoleRequestV1 {
  readonly contract: 'cordisx.managed-service-console-request/v1'
  readonly action: 'prepare' | 'revoke'
  readonly binding: string
  readonly origin: `http://${string}` | `https://${string}`
}

/** Private service-to-Launcher response. Only an isolated browser adapter may receive the cookie. */
export type ManagedServiceConsoleResultV1 =
  | {
    readonly contract: 'cordisx.managed-service-console-result/v1'
    readonly status: 'prepared'
    readonly cookie: { readonly name: `__Host-${string}`; readonly value: string; readonly maxAgeSeconds: number }
  }
  | {
    readonly contract: 'cordisx.managed-service-console-result/v1'
    readonly status: 'revoked' | 'sign-in-required' | 'unavailable'
  }
