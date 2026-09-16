import type { Inject } from '@deepseek-ai/cordis'
import type {
  ManagedServiceBindingV1 as ManagedServiceUIBindingV1,
  ManagedServiceCliProxyAccountsResultV1,
  ManagedServiceCliProxyAccountToggleRequestV1,
  ManagedServiceCliProxyAccountToggleResultV1,
  ManagedServiceCliProxyCatalogResultV1,
  ManagedServiceCliProxyOAuthCancelRequestV1,
  ManagedServiceCliProxyOAuthCancelResultV1,
  ManagedServiceCliProxyOAuthStartRequestV1,
  ManagedServiceCliProxyOAuthStartResultV1,
  ManagedServiceCliProxyOAuthStatusV1,
} from './managed-service.v1.js'
import type {
  ManagedServiceApplyV1,
  ManagedServiceBoundClientV1,
  ManagedServiceRegistrationHandleV1,
} from './managed-service-runtime.v1.js'

export interface ManagedServiceContextAuthorityV1 {
  readonly pluginId: string
  readonly pluginGeneration: string
  readonly serviceId: string
  readonly serviceGeneration: string
}

export interface ManagedServiceContextBindingV1 {
  readonly value: unknown
  dispose(): void | Promise<void>
}

export interface ManagedServiceContextProviderRootV1 {
  readonly providerValue: unknown
  bind(input: {
    readonly producer: {
      readonly pluginId: string
      readonly pluginGeneration: string
    }
    readonly target: ManagedServiceContextAuthorityV1
    readonly signal: AbortSignal
  }): ManagedServiceContextBindingV1 | Promise<ManagedServiceContextBindingV1>
  dispose(): void | Promise<void>
}

export interface ManagedServiceContextProviderV1 {
  readonly service: string
  create(input: {
    readonly target: ManagedServiceContextAuthorityV1
    readonly signal: AbortSignal
  }): ManagedServiceContextProviderRootV1 | Promise<ManagedServiceContextProviderRootV1>
}

/** Optional Node-owned methods that the Host may bind into a renderer-safe managed-service handle. */
export interface ManagedServiceNodeUISourceExtensionV1 {
  readCatalog?(): Promise<ManagedServiceCliProxyCatalogResultV1>
  readAccounts?(): Promise<ManagedServiceCliProxyAccountsResultV1>
  toggleAccount?(request: ManagedServiceCliProxyAccountToggleRequestV1): Promise<ManagedServiceCliProxyAccountToggleResultV1>
  startOAuth?(request: ManagedServiceCliProxyOAuthStartRequestV1): Promise<ManagedServiceCliProxyOAuthStartResultV1>
  pollOAuth?(sessionId: string): Promise<ManagedServiceCliProxyOAuthStatusV1>
  cancelOAuth?(request: ManagedServiceCliProxyOAuthCancelRequestV1): Promise<ManagedServiceCliProxyOAuthCancelResultV1>
}

/** A managed backend may add renderer-safe projections for one service it owns. */
export interface ManagedServiceNodeUISourceV1 {
  readonly serviceId: string
  create(input: {
    readonly binding: ManagedServiceUIBindingV1
    readonly registration: ManagedServiceRegistrationHandleV1
    readonly client: ManagedServiceBoundClientV1
    readonly signal: AbortSignal
  }): ManagedServiceNodeUISourceExtensionV1
}

export interface ManagedServiceNodeModuleV1 {
  readonly apply: ManagedServiceApplyV1 & { readonly inject?: Inject }
  readonly contextServices?: readonly ManagedServiceContextProviderV1[]
  readonly managedServiceUI?: ManagedServiceNodeUISourceV1
}
