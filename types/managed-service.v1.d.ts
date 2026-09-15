/**
 * CordisX Managed Service UI contract v1.
 *
 * Renderer-safe, host-neutral projection for a plugin-declared managed service
 * (for example a browser plugin Manager page for CLIProxyAPI, Aiden, TraeX).
 * Consumers can observe authentication/readiness/health/diagnostics and can
 * only request an explicit `authenticate('login')` after a user gesture.
 *
 * Credentials, endpoints beyond a redacted origin, raw process handles,
 * registrar maps, and Host-side service factories are intentionally absent.
 */

export type ManagedServiceReadinessV1 = 'starting' | 'ready' | 'degraded' | 'stopping' | 'stopped' | 'failed'
export type ManagedServiceAuthStateV1 = 'missing' | 'authenticating' | 'authenticated' | 'expired' | 'failed' | 'logged-out'
export type ManagedServiceHealthLevelV1 = 'healthy' | 'warning' | 'critical'
export type ManagedServiceErrorCodeV1 =
  | 'stale-generation'
  | 'binding-replaced'
  | 'service-unavailable'
  | 'permission-denied'
  | 'not-authenticated'
  | 'already-authenticated'
  | 'authenticating'
  | 'authentication-failed'
  | 'user-cancelled'
  | 'timeout'
  | 'stale-revision'
  | 'account-not-found'
  | 'plugin-virtual-not-source'
  | 'invalid-session'
  | 'unsupported-provider'
  | 'management-disabled'
  | 'service-not-declared'
  | 'health-check-failed'
  | 'authentication-required'
  | 'authenticated'
  | 'materialization-failed'
  | 'cancelled'
  | 'unavailable'
  | 'unsupported'
  | 'not-ready'
  | 'invalid-catalog'
  | 'undeclared-composition-origin'
  | 'duplicate-provider'
  | 'disposed'

export interface ManagedServiceIdentityV1 {
  readonly source?: `https://${string}`
  readonly pluginId: string
  readonly serviceId: string
}

export interface ManagedServiceScopeV1 {
  readonly profileId: string
  readonly generation: string
}

export interface ManagedServiceBindingV1 {
  readonly bindingId: string
  readonly identity: ManagedServiceIdentityV1
  readonly scope: ManagedServiceScopeV1
}

export interface ManagedServiceDiagnosticV1 {
  readonly code: string
  readonly message?: string
  readonly at?: string
  readonly retryable?: boolean
}

export interface ManagedServiceAuthProjectionV1 {
  readonly state: ManagedServiceAuthStateV1
  readonly authenticatedAt?: string
  readonly expiresAt?: string
  readonly accountHint: string
  readonly providerLabel?: string
}

export interface ManagedServiceHealthProjectionV1 {
  readonly level: ManagedServiceHealthLevelV1
  readonly since?: string
}

export interface ManagedServiceCapabilitiesV1 {
  readonly explicitLogin: boolean
  readonly logout: boolean
  readonly readCatalog: boolean
}

export type ManagedServiceLoginActionReasonV1 =
  | 'ready'
  | 'already-authenticated'
  | 'missing-secret'
  | 'service-not-ready'
  | 'policy-denied'
  | 'generation-stale'

export interface ManagedServiceLoginActionV1 {
  readonly available: boolean
  readonly reason: ManagedServiceLoginActionReasonV1
}

export interface ManagedServiceProjectionV1 {
  readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/managed-service-projection.v1.schema.json'
  readonly contract: 'cordisx.managed-service-projection/v1'
  readonly schemaVersion: 1
  readonly binding: ManagedServiceBindingV1
  readonly sequence: number
  readonly observedAt: string
  readonly identity: ManagedServiceIdentityV1
  readonly displayName: string
  readonly serviceKind: string
  readonly readiness: ManagedServiceReadinessV1
  readonly revision?: number
  readonly serviceGeneration?: string
  readonly auth: ManagedServiceAuthProjectionV1
  readonly health: ManagedServiceHealthProjectionV1
  readonly diagnostics: readonly ManagedServiceDiagnosticV1[]
  readonly capabilities: ManagedServiceCapabilitiesV1
  readonly userAction: ManagedServiceLoginActionV1
}

/** Explicit user-gesture-gated login request. No auto-login path is exposed. */
export interface ManagedServiceLoginRequestV1 {
  readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/managed-service-login-request.v1.schema.json'
  readonly contract: 'cordisx.managed-service-login-request/v1'
  readonly schemaVersion: 1
  readonly requestId: string
  readonly binding: ManagedServiceBindingV1
  readonly action: 'login'
  readonly expectedSequence: number
  readonly userGesture: {
    readonly kind: 'explicit-click'
    readonly at: string
  }
}

export interface ManagedServiceErrorV1 {
  readonly code: ManagedServiceErrorCodeV1
  readonly message: string
}

export type ManagedServiceLoginResultV1 =
  | {
    readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/managed-service-login-result.v1.schema.json'
    readonly contract: 'cordisx.managed-service-login-result/v1'
    readonly schemaVersion: 1
    readonly requestId: string
    readonly binding: ManagedServiceBindingV1
    readonly status: 'accepted'
    readonly stateAt: ManagedServiceAuthStateV1
    readonly sequence: number
  }
  | {
    readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/managed-service-login-result.v1.schema.json'
    readonly contract: 'cordisx.managed-service-login-result/v1'
    readonly schemaVersion: 1
    readonly requestId: string
    readonly binding: ManagedServiceBindingV1
    readonly status: 'denied' | 'failed' | 'unavailable'
    readonly error: ManagedServiceErrorV1
  }

/** Explicit user-gesture-gated logout request bound to the current owner and projection sequence. */
export interface ManagedServiceLogoutRequestV1 {
  readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/managed-service-logout-request.v1.schema.json'
  readonly contract: 'cordisx.managed-service-logout-request/v1'
  readonly schemaVersion: 1
  readonly requestId: string
  readonly binding: ManagedServiceBindingV1
  readonly action: 'logout'
  readonly expectedSequence: number
  readonly userGesture: {
    readonly kind: 'explicit-click'
    readonly at: string
  }
}

export type ManagedServiceLogoutResultV1 =
  | {
    readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/managed-service-logout-result.v1.schema.json'
    readonly contract: 'cordisx.managed-service-logout-result/v1'
    readonly schemaVersion: 1
    readonly requestId: string
    readonly binding: ManagedServiceBindingV1
    readonly status: 'accepted'
    readonly stateAt: 'logged-out'
    readonly sequence: number
  }
  | {
    readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/managed-service-logout-result.v1.schema.json'
    readonly contract: 'cordisx.managed-service-logout-result/v1'
    readonly schemaVersion: 1
    readonly requestId: string
    readonly binding: ManagedServiceBindingV1
    readonly status: 'denied' | 'failed' | 'unavailable'
    readonly error: ManagedServiceErrorV1
  }

export interface ManagedServiceSubscriptionDescriptorV1 {
  readonly subscriptionId: string
  readonly binding: ManagedServiceBindingV1
  readonly afterSequence: number
  readonly snapshotSequence: number
}

export type ManagedServiceProjectionUpdateV1 =
  | {
    readonly kind: 'snapshot-replaced'
    readonly sequence: number
    readonly projection: ManagedServiceProjectionV1
  }
  | {
    readonly kind: 'state-changed'
    readonly sequence: number
    readonly delta: {
      readonly readiness?: ManagedServiceReadinessV1
      readonly auth?: ManagedServiceAuthProjectionV1
      readonly health?: ManagedServiceHealthProjectionV1
      readonly diagnostics?: readonly ManagedServiceDiagnosticV1[]
      readonly userAction?: ManagedServiceLoginActionV1
    }
  }

export interface ManagedServiceSubscriptionPageV1 {
  readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/managed-service-subscription-page.v1.schema.json'
  readonly contract: 'cordisx.managed-service-subscription-page/v1'
  readonly schemaVersion: 1
  readonly subscription: ManagedServiceSubscriptionDescriptorV1
  readonly phase: 'replay' | 'live'
  readonly updates: readonly ManagedServiceProjectionUpdateV1[]
  readonly nextAfterSequence: number
  readonly hasMore: boolean
}

export interface ManagedServiceSubscriptionClosedV1 {
  readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/managed-service-subscription-close.v1.schema.json'
  readonly contract: 'cordisx.managed-service-subscription-close/v1'
  readonly schemaVersion: 1
  readonly subscription: ManagedServiceSubscriptionDescriptorV1
  readonly closedAt: string
  readonly reason: 'explicit' | 'binding-replaced' | 'generation-replaced' | 'owner-disposed' | 'service-disposed'
}

declare const managedServiceSubscriptionV1Capability: unique symbol

export interface ManagedServiceSubscriptionV1 {
  readonly descriptor: ManagedServiceSubscriptionDescriptorV1
  readonly pages: AsyncIterable<ManagedServiceSubscriptionPageV1>
  readonly closed: Promise<ManagedServiceSubscriptionClosedV1>
  readonly [managedServiceSubscriptionV1Capability]: never
  unsubscribe(): Promise<ManagedServiceSubscriptionClosedV1>
}

export type ManagedServiceSubscribeResultV1 =
  | { readonly status: 'subscribed'; readonly subscription: ManagedServiceSubscriptionV1 }
  | { readonly status: 'unavailable'; readonly code: 'owner-unavailable' | 'stale-generation' | 'binding-replaced' | 'disposed' }

export type ManagedServiceSnapshotResultV1 =
  | { readonly status: 'available'; readonly projection: ManagedServiceProjectionV1 }
  | { readonly status: 'unavailable'; readonly code: 'owner-unavailable' | 'stale-generation' | 'binding-replaced' | 'disposed' }

export type ManagedServiceLoginResultStatusV1 = ManagedServiceLoginResultV1['status']
export type ManagedServiceLogoutResultStatusV1 = ManagedServiceLogoutResultV1['status']

/** Renderer-safe CLIProxyAPI upstream catalog projection. Endpoint auth material is hidden. */
export interface ManagedServiceCliProxyModelMappingV1 {
  readonly sourceModelId: string
  readonly modelId: string
  readonly displayName: string
  readonly enabled: boolean
  readonly isDefault: boolean
}

export interface ManagedServiceCliProxyProviderV1 {
  readonly id: string
  readonly displayName: string
  readonly enabled: boolean
  readonly endpoint: {
    /** Redacted origin only; full base URLs and credentials stay Host-private. */
    readonly origin: string
    readonly secretConfigured: boolean
  }
  readonly health: ManagedServiceHealthLevelV1
  readonly auth: ManagedServiceAuthStateV1
  readonly lastError?: ManagedServiceDiagnosticV1
  readonly models: {
    readonly mappings: readonly ManagedServiceCliProxyModelMappingV1[]
  }
}

export interface ManagedServiceCliProxyCatalogV1 {
  readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/managed-service-cli-proxy-catalog.v1.schema.json'
  readonly contract: 'cordisx.managed-service-cli-proxy-catalog/v1'
  readonly schemaVersion: 1
  readonly binding: ManagedServiceBindingV1
  readonly sequence: number
  readonly observedAt: string
  readonly revision: number
  readonly serviceGeneration: string
  readonly providers: readonly ManagedServiceCliProxyProviderV1[]
}

export type ManagedServiceCliProxyCatalogResultV1 =
  | { readonly status: 'available'; readonly catalog: ManagedServiceCliProxyCatalogV1 }
  | { readonly status: 'unavailable'; readonly code: 'owner-unavailable' | 'stale-generation' | 'binding-replaced' | 'service-kind-mismatch' | 'disposed' }

/** CLIProxyAPI account-subscription renderer-safe projection and control. */
export type ManagedServiceCliProxyAuthKindV1 = 'oauth' | 'api-key' | 'file' | 'plugin-virtual' | 'unknown'
export type ManagedServiceCliProxySourceKindV1 = 'file' | 'memory' | 'plugin'
export type ManagedServiceCliProxyAccountStatusV1 = 'active' | 'disabled' | 'unavailable'
export type ManagedServiceCliProxyProviderIdV1 =
  | 'anthropic'
  | 'codex'
  | 'antigravity'
  | 'kimi'
  | 'xai'
  | `plugin:${string}`
  | `custom:${string}`

export interface ManagedServiceCliProxyAccountModelRefV1 {
  readonly id: string
  readonly displayName?: string
  readonly type?: string
  readonly ownedBy?: string
}

export interface ManagedServiceCliProxyAccountV1 {
  readonly accountId: string
  readonly authIndex: string
  readonly provider: ManagedServiceCliProxyProviderIdV1
  readonly label: string
  readonly status: ManagedServiceCliProxyAccountStatusV1
  readonly statusMessage?: string
  readonly disabled: boolean
  readonly unavailable: boolean
  readonly authKind: ManagedServiceCliProxyAuthKindV1
  readonly sourceKind: ManagedServiceCliProxySourceKindV1
  readonly runtimeOnly: boolean
  readonly email?: string
  readonly projectId?: string
  readonly accountType?: string
  readonly account?: string
  readonly note?: string
  readonly priority?: number
  readonly weight?: number
  readonly websockets?: boolean
  readonly requestRetry?: number
  readonly success?: number
  readonly failed?: number
  readonly createdAt?: string
  readonly updatedAt?: string
  readonly lastRefreshAt?: string
  readonly nextRetryAfter?: string
  readonly models?: readonly ManagedServiceCliProxyAccountModelRefV1[]
  readonly quotaSignals?: Readonly<Record<string, string>>
}

export interface ManagedServiceCliProxyAccountsV1 {
  readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/managed-service-cli-proxy-accounts.v1.schema.json'
  readonly contract: 'cordisx.managed-service-cli-proxy-accounts/v1'
  readonly schemaVersion: 1
  readonly binding: ManagedServiceBindingV1
  readonly sequence: number
  readonly observedAt: string
  readonly revision: number
  readonly serviceGeneration: string
  readonly accounts: readonly ManagedServiceCliProxyAccountV1[]
}

export type ManagedServiceCliProxyAccountsResultV1 =
  | { readonly status: 'available'; readonly accounts: ManagedServiceCliProxyAccountsV1 }
  | { readonly status: 'unavailable'; readonly code: 'owner-unavailable' | 'stale-generation' | 'binding-replaced' | 'service-kind-mismatch' | 'management-disabled' | 'disposed' }

export interface ManagedServiceCliProxyAccountToggleRequestV1 {
  readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/managed-service-cli-proxy-account-toggle.v1.schema.json'
  readonly contract: 'cordisx.managed-service-cli-proxy-account-toggle/v1'
  readonly schemaVersion: 1
  readonly requestId: string
  readonly binding: ManagedServiceBindingV1
  readonly accountId: string
  readonly authIndex?: string
  readonly disabled: boolean
  readonly expectedRevision: number
  readonly userGesture: { readonly kind: 'explicit-click'; readonly at: string }
}

export type ManagedServiceCliProxyAccountToggleResultV1 =
  | {
    readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/managed-service-cli-proxy-account-toggle-result.v1.schema.json'
    readonly contract: 'cordisx.managed-service-cli-proxy-account-toggle-result/v1'
    readonly schemaVersion: 1
    readonly requestId: string
    readonly binding: ManagedServiceBindingV1
    readonly status: 'accepted'
    readonly accountId: string
    readonly disabled: boolean
    readonly sequence: number
  }
  | {
    readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/managed-service-cli-proxy-account-toggle-result.v1.schema.json'
    readonly contract: 'cordisx.managed-service-cli-proxy-account-toggle-result/v1'
    readonly schemaVersion: 1
    readonly requestId: string
    readonly binding: ManagedServiceBindingV1
    readonly status: 'denied' | 'failed' | 'unavailable'
    readonly error: ManagedServiceErrorV1
  }

export interface ManagedServiceCliProxyOAuthStartRequestV1 {
  readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/managed-service-cli-proxy-oauth-start.v1.schema.json'
  readonly contract: 'cordisx.managed-service-cli-proxy-oauth-start/v1'
  readonly schemaVersion: 1
  readonly requestId: string
  readonly binding: ManagedServiceBindingV1
  readonly provider: ManagedServiceCliProxyProviderIdV1
  readonly expectedRevision: number
  readonly userGesture: { readonly kind: 'explicit-click'; readonly at: string }
}

export type ManagedServiceCliProxyOAuthStartResultV1 =
  | {
    readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/managed-service-cli-proxy-oauth-result.v1.schema.json'
    readonly contract: 'cordisx.managed-service-cli-proxy-oauth-result/v1'
    readonly schemaVersion: 1
    readonly requestId: string
    readonly binding: ManagedServiceBindingV1
    readonly status: 'accepted'
    readonly sessionId: string
    readonly authorizationUrl: string
    readonly sequence: number
  }
  | {
    readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/managed-service-cli-proxy-oauth-result.v1.schema.json'
    readonly contract: 'cordisx.managed-service-cli-proxy-oauth-result/v1'
    readonly schemaVersion: 1
    readonly requestId: string
    readonly binding: ManagedServiceBindingV1
    readonly status: 'denied' | 'failed' | 'unavailable'
    readonly error: ManagedServiceErrorV1
  }

export type ManagedServiceCliProxyOAuthSessionStateV1 = 'pending' | 'wait' | 'completed' | 'error' | 'cancelled' | 'unknown'

export interface ManagedServiceCliProxyOAuthStatusV1 {
  readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/managed-service-cli-proxy-oauth-status.v1.schema.json'
  readonly contract: 'cordisx.managed-service-cli-proxy-oauth-status/v1'
  readonly schemaVersion: 1
  readonly binding: ManagedServiceBindingV1
  readonly sessionId: string
  readonly state: ManagedServiceCliProxyOAuthSessionStateV1
  readonly error?: ManagedServiceDiagnosticV1
  readonly sequence?: number
}

export interface ManagedServiceCliProxyOAuthCancelRequestV1 {
  readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/managed-service-cli-proxy-oauth-cancel.v1.schema.json'
  readonly contract: 'cordisx.managed-service-cli-proxy-oauth-cancel/v1'
  readonly schemaVersion: 1
  readonly requestId: string
  readonly binding: ManagedServiceBindingV1
  readonly sessionId: string
  readonly expectedRevision: number
  readonly userGesture: { readonly kind: 'explicit-click'; readonly at: string }
}

export type ManagedServiceCliProxyOAuthCancelResultV1 =
  | {
    readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/managed-service-cli-proxy-oauth-cancel-result.v1.schema.json'
    readonly contract: 'cordisx.managed-service-cli-proxy-oauth-cancel-result/v1'
    readonly schemaVersion: 1
    readonly requestId: string
    readonly binding: ManagedServiceBindingV1
    readonly status: 'accepted'
    readonly sessionId: string
    readonly cancelled: boolean
    readonly sequence: number
  }
  | {
    readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/managed-service-cli-proxy-oauth-cancel-result.v1.schema.json'
    readonly contract: 'cordisx.managed-service-cli-proxy-oauth-cancel-result/v1'
    readonly schemaVersion: 1
    readonly requestId: string
    readonly binding: ManagedServiceBindingV1
    readonly status: 'denied' | 'failed' | 'unavailable'
    readonly error: ManagedServiceErrorV1
  }

export interface ManagedServiceCliProxyAccountControlV1 {
  readAccounts(): Promise<ManagedServiceCliProxyAccountsResultV1>
  toggleAccount(request: ManagedServiceCliProxyAccountToggleRequestV1): Promise<ManagedServiceCliProxyAccountToggleResultV1>
  startOAuth(request: ManagedServiceCliProxyOAuthStartRequestV1): Promise<ManagedServiceCliProxyOAuthStartResultV1>
  pollOAuth(sessionId: string): Promise<ManagedServiceCliProxyOAuthStatusV1>
  cancelOAuth(request: ManagedServiceCliProxyOAuthCancelRequestV1): Promise<ManagedServiceCliProxyOAuthCancelResultV1>
}

/** Bound Host-neutral service surface handed to a renderer Manager page. */
export interface ManagedServiceV1 {
  readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/managed-service-subscription.v1.schema.json'
  readonly contract: 'cordisx.managed-service/v1'
  readonly schemaVersion: 1
  readonly binding: ManagedServiceBindingV1
  snapshot(): Promise<ManagedServiceSnapshotResultV1>
  subscribe(afterSequence?: number): Promise<ManagedServiceSubscribeResultV1>
  /**
   * Authenticate requires an explicit user gesture. Hosts MUST reject calls
   * that do not carry a fresh `explicit-click` gesture in the request envelope.
   */
  authenticate(request: ManagedServiceLoginRequestV1): Promise<ManagedServiceLoginResultV1>
  /**
   * Logout requires a fresh explicit click and an owner-bound request. Hosts
   * MUST reject stale bindings, stale sequences, and non-user-initiated calls.
   */
  logout(request: ManagedServiceLogoutRequestV1): Promise<ManagedServiceLogoutResultV1>
  /** Optional, service-kind-specific renderer-safe read (for CLIProxyAPI). */
  readCatalog?(): Promise<ManagedServiceCliProxyCatalogResultV1>
  /** Optional CLIProxyAPI account-subscription control surface (Host-brokered Management API). */
  accountControl?: ManagedServiceCliProxyAccountControlV1
}

/** Host-internal source; not exposed to renderers. */
declare const managedServiceSourceV1Capability: unique symbol
export interface ManagedServiceSourceV1 {
  readonly binding: ManagedServiceBindingV1
  readonly [managedServiceSourceV1Capability]: never
  snapshot(): Promise<ManagedServiceSnapshotResultV1>
  subscribe(afterSequence: number): Promise<ManagedServiceSubscribeResultV1>
  authenticate(request: ManagedServiceLoginRequestV1): Promise<ManagedServiceLoginResultV1>
  logout(request: ManagedServiceLogoutRequestV1): Promise<ManagedServiceLogoutResultV1>
  readCatalog?(): Promise<ManagedServiceCliProxyCatalogResultV1>
  readAccounts?(): Promise<ManagedServiceCliProxyAccountsResultV1>
  toggleAccount?(request: ManagedServiceCliProxyAccountToggleRequestV1): Promise<ManagedServiceCliProxyAccountToggleResultV1>
  startOAuth?(request: ManagedServiceCliProxyOAuthStartRequestV1): Promise<ManagedServiceCliProxyOAuthStartResultV1>
  pollOAuth?(sessionId: string): Promise<ManagedServiceCliProxyOAuthStatusV1>
  cancelOAuth?(request: ManagedServiceCliProxyOAuthCancelRequestV1): Promise<ManagedServiceCliProxyOAuthCancelResultV1>
}

/* ------------------------------------------------------------------------- */
/* Host-internal managed backend types (additive, v1 compatible).            */
/*                                                                            */
/* These types describe the Host's managed-backend runtime (registrar,       */
/* leases, invocation broker, configuration materialization, native           */
/* provider publication). Renderer pages MUST NOT use these types; they      */
/* describe a Node-side surface that is not bridged to the renderer.         */
/* ------------------------------------------------------------------------- */
