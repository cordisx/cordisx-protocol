import type { Context } from '@deepseek-ai/cordis'

export interface ManagedServiceOwnerV1 {
  readonly ownerHandle: `mso_${string}`
  readonly pluginId: string
  readonly sourceDigest: `sha256:${string}`
  readonly hostGeneration: string
  readonly pluginGeneration: string
}

export interface ManagedServiceIdentityV1 {
  readonly source: `https://${string}`
  readonly pluginId: string
  readonly serviceId: string
}

export interface ManagedServiceBindingV1 {
  readonly registrationHandle: `msr_${string}`
  readonly serviceHandle: `mss_${string}`
  readonly identity: ManagedServiceIdentityV1
  readonly hostGeneration: string
  readonly serviceGeneration: string
}

export type ManagedServiceSafeValueV1 =
  | null
  | boolean
  | number
  | string
  | readonly ManagedServiceSafeValueV1[]
  | { readonly [key: string]: ManagedServiceSafeValueV1 }

export type ManagedServiceLaunchArgumentV1 =
  | string
  | {
      readonly kind: 'host-assigned-loopback'
      readonly serialization: 'origin' | 'authority' | 'port'
    }

export type ManagedServiceExecutableV1 =
  | { readonly kind: 'package-relative'; readonly path: `./${string}` }
  | { readonly kind: 'named-command'; readonly command: string }

export type ManagedServiceEnvironmentDeclarationV1 =
  | { readonly variable: string; readonly source: 'literal'; readonly value: string }
  | {
    readonly variable: string
    readonly source: 'service-home-relative-path'
    readonly path: `./${string}`
  }

export interface ManagedServiceOperationDefinitionV1 {
  readonly operationId: string
  readonly method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  readonly path: `/${string}`
  readonly requestSchema?: `https://${string}`
  readonly responseSchema: `https://${string}`
  readonly timeoutMs: number
  /** Request values use a JSON body unless explicitly serialized into query parameters. */
  readonly requestEncoding?: 'json-body' | 'query'
  /** Optional operation-specific authorization; omitted operations use the service default. */
  readonly httpAuthentication?:
    | { readonly mode: 'none' }
    | { readonly mode: 'authorization-header'; readonly scheme: 'Bearer'; readonly slot: string }
}

export type ManagedServiceProtectedBindingV1 =
  | ({
    readonly slot: string
    readonly source: 'host-secret' | 'generated-local-key' | 'composition'
    readonly valueSchema?: `https://${string}`
  } & (
    | { readonly target: 'environment'; readonly variable: string }
    | { readonly target: 'configuration'; readonly pointer: `/${string}` }
  ))
  | {
    readonly slot: string
    readonly source: 'host-assigned-loopback'
    readonly target: 'configuration'
    readonly pointer: `/${string}`
    readonly serialization: 'origin' | 'authority' | 'host' | 'port'
  }

export interface ManagedServiceAuthenticationActionV1 {
  readonly executable: ManagedServiceExecutableV1
  readonly arguments: readonly string[]
  readonly timeoutMs: number
  readonly outcomes: readonly {
    readonly exitCode: number
    readonly state: 'authenticated' | 'authentication-required' | 'failed'
  }[]
}

export interface ManagedServiceDefinitionV1 {
  readonly $schema:
    'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/managed-service-definition.v1.schema.json'
  readonly contract: 'cordisx.managed-service-definition/v1'
  readonly schemaVersion: 1
  readonly serviceId: string
  readonly launch: {
    readonly executable: ManagedServiceExecutableV1
    readonly arguments: readonly ManagedServiceLaunchArgumentV1[]
    readonly startupTimeoutMs: number
  }
  readonly configuration?: {
    readonly template: `./${string}`
    readonly format: 'json' | 'yaml'
    readonly delivery: {
      readonly kind: 'generation-private-process-file'
      readonly argument: string
    }
  }
  readonly compositionOrigins?: readonly {
    readonly id: string
    readonly path: `/${string}`
  }[]
  readonly environment?: readonly ManagedServiceEnvironmentDeclarationV1[]
  readonly protectedBindings: readonly ManagedServiceProtectedBindingV1[]
  readonly authentication:
    | { readonly mode: 'none' }
    | { readonly mode: 'host-secret'; readonly slot: string }
    | {
      readonly mode: 'cli'
      readonly status: ManagedServiceAuthenticationActionV1
      readonly login: ManagedServiceAuthenticationActionV1
      readonly logout?: ManagedServiceAuthenticationActionV1
      readonly refresh?: ManagedServiceAuthenticationActionV1
    }
  readonly httpAuthentication:
    | { readonly mode: 'none' }
    | { readonly mode: 'authorization-header'; readonly scheme: 'Bearer'; readonly slot: string }
  readonly discovery:
    | { readonly kind: 'fixed-loopback'; readonly port: number }
    | { readonly kind: 'host-assigned-loopback' }
    | {
      readonly kind: 'restricted-port-file'
      readonly root: 'package' | 'service-home'
      readonly file: `./${string}`
      readonly format: 'decimal-port'
    }
  readonly operations: readonly ManagedServiceOperationDefinitionV1[]
  readonly health: { readonly path: `/${string}`; readonly intervalMs: number; readonly timeoutMs: number }
}

export type ManagedServiceDiagnosticCodeV1 =
  | 'unsupported'
  | 'authentication-required'
  | 'authentication-failed'
  | 'incompatible'
  | 'launch-failed'
  | 'discovery-failed'
  | 'health-check-failed'
  | 'materialization-failed'
  | 'stale-catalog'
  | 'borrowed-service'
  | 'cancelled'
  | 'stale-generation'
  | 'disposed'

export interface ManagedServiceDiagnosticV1 {
  readonly code: ManagedServiceDiagnosticCodeV1
  readonly retryable: boolean
  readonly message?: string
}

export interface ManagedServiceProjectionV1 {
  readonly $schema:
    'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/managed-service-projection.v1.schema.json'
  readonly contract: 'cordisx.managed-service-projection/v1'
  readonly schemaVersion: 1
  readonly binding: ManagedServiceBindingV1
  readonly state: 'registered' | 'preparing' | 'ready' | 'authentication-required' | 'failed' | 'stopped' | 'disposed'
  readonly health: 'starting' | 'ready' | 'degraded' | 'unhealthy' | 'stopped'
  readonly processOwnership: 'host-owned' | 'borrowed'
  readonly configuration:
    | { readonly state: 'not-required' | 'missing' | 'revoked' }
    | {
      readonly state: 'materialized'
      readonly materializationHandle: `msm_${string}`
      readonly revision: string
    }
  readonly authentication:
    | { readonly state: 'not-required' | 'missing' }
    | { readonly state: 'configured'; readonly sessionHandle: `msa_${string}` }
  readonly httpAuthorization:
    | { readonly state: 'not-required' | 'missing' }
    | { readonly state: 'configured'; readonly authorizationHandle: `msa_${string}` }
  readonly connection?: { readonly brokerHandle: `msb_${string}` }
  readonly diagnostic?: ManagedServiceDiagnosticV1
}

export type ManagedServiceControlResultV1 =
  | { readonly status: 'ready' | 'accepted'; readonly projection: ManagedServiceProjectionV1 }
  | {
    readonly status:
      | 'authentication-required'
      | 'unavailable'
      | 'failed'
      | 'cancelled'
      | 'stale-generation'
      | 'stale-catalog'
    readonly diagnostic: ManagedServiceDiagnosticV1
  }

export interface ManagedServiceLeaseV1 {
  readonly leaseHandle: `msl_${string}`
  readonly binding: ManagedServiceBindingV1
  readonly brokerHandle: `msb_${string}`
  readonly operations: readonly string[]
}

export type ManagedServiceAcquireResultV1 =
  | { readonly status: 'ready'; readonly projection: ManagedServiceProjectionV1; readonly lease: ManagedServiceLeaseV1 }
  | Exclude<ManagedServiceControlResultV1, { readonly status: 'ready' | 'accepted' }>

export type ManagedServiceInvokeResultV1 =
  | {
    readonly status: 'accepted'
    readonly invocationHandle: `msi_${string}`
    readonly operationId: string
    readonly responseSchema: `https://${string}`
    readonly value: ManagedServiceSafeValueV1
  }
  | Exclude<ManagedServiceControlResultV1, { readonly status: 'ready' | 'accepted' }>

export type ManagedServiceCompositionSourceV1 =
  | { readonly kind: 'source-origin'; readonly source: string; readonly origin: string }
  | { readonly kind: 'source-authorization'; readonly source: string }
  | {
    readonly kind: 'invocation-value'
    readonly source: string
    readonly invocationHandle: `msi_${string}`
    readonly pointer: `/${string}`
  }
  | { readonly kind: 'safe-literal'; readonly value: ManagedServiceSafeValueV1 }

export interface ManagedServiceMaterializationRequestV1 {
  readonly target: ManagedServiceBindingV1
  readonly revision: `sha256:${string}`
  readonly sources: readonly { readonly source: string; readonly lease: ManagedServiceLeaseV1 }[]
  readonly bindings: readonly {
    readonly targetSlot: string
    readonly targetPointer?: `/${string}`
    readonly source: ManagedServiceCompositionSourceV1
  }[]
}

export interface ManagedServiceMaterializationV1 {
  readonly materializationHandle: `msm_${string}`
  readonly target: ManagedServiceBindingV1
  readonly revision: `sha256:${string}`
  readonly sources: readonly { readonly source: string; readonly binding: ManagedServiceBindingV1 }[]
}

export type ManagedServiceMaterializationResultV1 =
  | ({ readonly status: 'accepted' } & ManagedServiceMaterializationV1)
  | Exclude<ManagedServiceControlResultV1, { readonly status: 'ready' | 'accepted' }>

export interface ManagedNativeProviderRouteV1 {
  readonly alias: string
  readonly gatewayModelId: string
}

export interface ManagedNativeProviderCatalogV1 {
  readonly generation: string
  readonly digest: `sha256:${string}`
  readonly defaultAlias: string
  readonly routes: readonly ManagedNativeProviderRouteV1[]
}

export interface ManagedNativeProviderPublicationInputV1 {
  readonly providerId: string
  readonly compositionOrigin: string
  readonly catalog: ManagedNativeProviderCatalogV1
}

export interface ManagedNativeProviderPublicationProjectionV1 {
  readonly providerId: string
  readonly owner: {
    readonly pluginId: string
    readonly hostGeneration: string
    readonly pluginGeneration: string
  }
  readonly service: {
    readonly serviceId: string
    readonly serviceGeneration: string
  }
  readonly compositionOrigin: string
  readonly catalog: ManagedNativeProviderCatalogV1
  readonly state: 'active' | 'revoked'
}

export type ManagedNativeProviderPublicationDiagnosticCodeV1 =
  | 'not-ready'
  | 'duplicate-provider'
  | 'invalid-catalog'
  | 'undeclared-composition-origin'
  | 'stale-generation'
  | 'stale-catalog'
  | 'cancelled'
  | 'disposed'
  | 'failed'

export interface ManagedNativeProviderPublicationDiagnosticV1 {
  readonly code: ManagedNativeProviderPublicationDiagnosticCodeV1
  readonly retryable: boolean
  readonly message?: string
}

export type ManagedNativeProviderPublicationDisposeResultV1 =
  | { readonly status: 'disposed'; readonly projection: ManagedNativeProviderPublicationProjectionV1 }
  | { readonly status: 'stale'; readonly diagnostic: ManagedNativeProviderPublicationDiagnosticV1 }

export interface ManagedNativeProviderPublicationHandleV1 {
  readonly publication: ManagedNativeProviderPublicationProjectionV1
  dispose(): Promise<ManagedNativeProviderPublicationDisposeResultV1>
}

export type ManagedNativeProviderPublicationResultV1 =
  | { readonly status: 'accepted'; readonly publication: ManagedNativeProviderPublicationHandleV1 }
  | {
    readonly status: 'rejected'
    readonly diagnostic: ManagedNativeProviderPublicationDiagnosticV1
  }

export interface ManagedServiceRegistrationHandleV1 {
  readonly binding: ManagedServiceBindingV1
  readonly revision: `sha256:${string}`
  inspect(): Promise<ManagedServiceProjectionV1>
  authenticate(
    action: 'login' | 'logout' | 'refresh',
    options?: { readonly signal?: AbortSignal },
  ): Promise<ManagedServiceControlResultV1>
  ensureReady(options?: {
    readonly materialization?: { readonly materializationHandle: `msm_${string}`; readonly revision: `sha256:${string}` }
    readonly signal?: AbortSignal
  }): Promise<ManagedServiceControlResultV1>
  restart(options?: { readonly signal?: AbortSignal }): Promise<ManagedServiceControlResultV1>
  publishNativeProvider(
    input: ManagedNativeProviderPublicationInputV1,
    options?: { readonly signal?: AbortSignal },
  ): Promise<ManagedNativeProviderPublicationResultV1>
  dispose(): Promise<ManagedServiceControlResultV1>
}

export interface ManagedServiceRegistryV1 {
  register(
    definition: ManagedServiceDefinitionV1,
    options: { readonly revision: `sha256:${string}` },
  ): Promise<ManagedServiceRegistrationHandleV1>
}

export interface ManagedServiceBoundClientV1 {
  acquire(identity: ManagedServiceIdentityV1, options?: { readonly signal?: AbortSignal }): Promise<ManagedServiceAcquireResultV1>
  invoke(
    lease: ManagedServiceLeaseV1,
    operationId: string,
    value?: ManagedServiceSafeValueV1,
    options?: { readonly signal?: AbortSignal },
  ): Promise<ManagedServiceInvokeResultV1>
  materialize(
    request: ManagedServiceMaterializationRequestV1,
    options?: { readonly signal?: AbortSignal },
  ): Promise<ManagedServiceMaterializationResultV1>
  release(lease: ManagedServiceLeaseV1): void
  dispose(): void
}

export type ManagedServiceServiceContextV1 = Omit<Context, 'managedServices'> & {
  readonly managedServices: ManagedServiceRegistryV1
}

export interface ManagedServiceApplyInputV1 {
  readonly owner: ManagedServiceOwnerV1
  readonly client: ManagedServiceBoundClientV1
  readonly signal: AbortSignal
}

export type ManagedServiceApplyV1 = (
  context: ManagedServiceServiceContextV1,
  input: ManagedServiceApplyInputV1,
) => void | Promise<void>
