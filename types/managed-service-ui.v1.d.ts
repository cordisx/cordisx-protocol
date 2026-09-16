import type { Context } from '@deepseek-ai/cordis'
import type {
  ManagedServiceBindingV1,
  ManagedServiceErrorCodeV1,
  ManagedServiceV1,
} from './managed-service.v1.js'

export type {
  ManagedServiceAuthProjectionV1,
  ManagedServiceAuthStateV1,
  ManagedServiceBindingV1,
  ManagedServiceCapabilitiesV1,
  ManagedServiceCliProxyAccountControlV1,
  ManagedServiceCliProxyAccountModelRefV1,
  ManagedServiceCliProxyAccountStatusV1,
  ManagedServiceCliProxyAccountToggleRequestV1,
  ManagedServiceCliProxyAccountToggleResultV1,
  ManagedServiceCliProxyAccountV1,
  ManagedServiceCliProxyAccountsResultV1,
  ManagedServiceCliProxyAccountsV1,
  ManagedServiceCliProxyAuthKindV1,
  ManagedServiceCliProxyCatalogResultV1,
  ManagedServiceCliProxyCatalogV1,
  ManagedServiceCliProxyModelMappingV1,
  ManagedServiceCliProxyOAuthCancelRequestV1,
  ManagedServiceCliProxyOAuthCancelResultV1,
  ManagedServiceCliProxyOAuthSessionStateV1,
  ManagedServiceCliProxyOAuthStartRequestV1,
  ManagedServiceCliProxyOAuthStartResultV1,
  ManagedServiceCliProxyOAuthStatusV1,
  ManagedServiceCliProxyProviderIdV1,
  ManagedServiceCliProxyProviderV1,
  ManagedServiceCliProxySourceKindV1,
  ManagedServiceDiagnosticV1,
  ManagedServiceErrorCodeV1,
  ManagedServiceErrorV1,
  ManagedServiceHealthLevelV1,
  ManagedServiceHealthProjectionV1,
  ManagedServiceIdentityV1,
  ManagedServiceLoginActionReasonV1,
  ManagedServiceLoginActionV1,
  ManagedServiceLoginRequestV1,
  ManagedServiceLoginResultStatusV1,
  ManagedServiceLoginResultV1,
  ManagedServiceLogoutRequestV1,
  ManagedServiceLogoutResultStatusV1,
  ManagedServiceLogoutResultV1,
  ManagedServiceProjectionUpdateV1,
  ManagedServiceProjectionV1,
  ManagedServiceReadinessV1,
  ManagedServiceScopeV1,
  ManagedServiceSnapshotResultV1,
  ManagedServiceSourceV1,
  ManagedServiceSubscribeResultV1,
  ManagedServiceSubscriptionClosedV1,
  ManagedServiceSubscriptionDescriptorV1,
  ManagedServiceSubscriptionPageV1,
  ManagedServiceSubscriptionV1,
  ManagedServiceV1,
} from './managed-service.v1.js'

/**
 * Stable Cordis Context inject name for the Host-owned managed service UI
 * registry. Renderer Manager pages MUST use this token (via the
 * `managedServices` augmentation on `@deepseek-ai/cordis` Context) rather than
 * reaching into DI, `reflect.get`, or any node-side registrar.
 */
/**
 * Type-only stable token value. Use the string literal
 * `'cordisx.managed-service-ui-registry/v1'` at runtime (e.g. Cordis DI
 * binding) or import the value from `@cordisx/protocol/managed-service-ui-runtime/v1`.
 */
export type MANAGED_SERVICE_UI_REGISTRY_SERVICE_ID_V1 = 'cordisx.managed-service-ui-registry/v1'

/**
 * Renderer-side service descriptor. Plugin manifests declare managed services
 * under `services[]` with this kind; the Host validates id/entry/configuration
 * before exposing them through the registry.
 */
export type ManagedServiceKindV1 = 'managed-backend'

/**
 * Owner-bound "get" request.
 *
 * The serviceId is plugin-local; the Host binds pluginId, profileId, and
 * generation automatically from the rendering page's owner scope. Renderer
 * code cannot supply or forge pluginId/profileId/generation.
 */
export interface ManagedServiceUIGetRequestV1 {
  readonly serviceId: string
}

export type ManagedServiceUIGetResultV1 =
  | { readonly status: 'available'; readonly service: ManagedServiceV1 }
  | {
    readonly status: 'unavailable'
    readonly code: Extract<
      ManagedServiceErrorCodeV1,
      'owner-unavailable' | 'stale-generation' | 'service-not-declared' | 'binding-replaced' | 'disposed'
    >
    readonly message: string
  }

/**
 * Host-injected, page-scoped managed service UI registry.
 *
 * - Only available on renderer Manager pages owned by a plugin that declares
 *   `managed-service` services.
 * - Methods return owner-bound handles; cross-plugin access is denied.
 * - No node-side sources, factories, or registrar maps leak across this seam.
 */
export interface ManagedServiceUIRegistryV1 {
  /**
   * Acquire an owner-bound, renderer-safe ManagedServiceV1 handle for a
   * service declared by the current plugin.
   *
   * Hosts MUST bind the returned handle to the invoking page's pluginId,
   * active profileId, and current service generation; requests with stale
   * generations or replaced bindings fail with `stale-generation` /
   * `binding-replaced` rather than returning a partial handle.
   */
  get(request: ManagedServiceUIGetRequestV1): Promise<ManagedServiceUIGetResultV1>
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    /**
     * Host-injected, page-scoped managed service UI registry. Renderer Manager
     * pages rely on Cordis' automatic inject (no runtime import or token
     * constant needed): because this module augments `@deepseek-ai/cordis`
     * Context, plugin render entrypoints that list `inject: ['managedServices']`
     * receive an owner-bound registry for services declared by their own
     * plugin (for example CLIProxyAPI account management, Aiden, TraeX).
     *
     * The renderer MUST NOT use `ctx.reflect.get(...)` or reach into the Host
     * registrar; cross-plugin access is denied by the Host.
     */
    readonly managedServices: ManagedServiceUIRegistryV1
  }
}

/** Keeps the Cordis Context augmentation in this public entrypoint's type graph. */
export type ManagedServiceUIContextV1 = Context

/**
 * Minimal binding subset renderers may carry forward to the wire methods
 * (snapshot/authenticate/toggle/etc.). It already lives on
 * `ManagedServiceV1.binding`; re-exported here for readability.
 */
export type ManagedServiceUIBindingV1 = ManagedServiceBindingV1
