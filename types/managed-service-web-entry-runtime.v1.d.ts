import type { ManagedServiceNodeModuleV1 } from './managed-service-context.v1.js'

/** In-process package-bound declaration read from the admitted Node service module. */
export interface ManagedServiceWebEntrySourceV1 {
  readonly contract: 'cordisx.managed-service-web-entry-source/v1'
  readonly serviceId: string
  /** Existing declared authenticated GET operation, used only by the dedicated web-entry broker. */
  readonly operationId: string
  /** Required for a web origin different from the current registered backend origin. */
  readonly verification?: {
    readonly kind: 'shared-instance-hmac-sha256'
    readonly path: `/${string}`
  }
}

export interface ManagedServiceWebEntryNodeModuleV1 extends ManagedServiceNodeModuleV1 {
  readonly managedServiceWebEntry?: ManagedServiceWebEntrySourceV1
}

/** Node-only response from the source operation; never bridge this document to a renderer. */
export type ManagedServiceWebEntrySourceResultV1 =
  | {
    readonly contract: 'cordisx.managed-service-web-entry-source-result/v1'
    readonly status: 'available'
    readonly origin: `http://${string}` | `https://${string}`
    readonly verification?: { readonly instance: string; readonly proof: string }
  }
  | {
    readonly contract: 'cordisx.managed-service-web-entry-source-result/v1'
    readonly status: 'unavailable'
  }

/** Response from the secondary listener's declared proof path. No secrets or PID. */
export interface ManagedServiceWebEntryProofV1 {
  readonly contract: 'cordisx.managed-service-web-entry-proof/v1'
  readonly instance: string
  readonly proof: string
}
