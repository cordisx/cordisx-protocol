import type { ManagedServiceAuthStateV1 } from './managed-service.v1.js'
import type { ManagedServiceProjectionV1 } from './managed-service-runtime.v1.js'

export interface StartupCapabilityRefV1 {
  readonly pluginId: string
  readonly capabilityId: string
}

export type StartupWaitPolicyV1 = 'background' | 'when-selected' | 'always'
export type StartupModeV1 = 'interactive' | 'command'
export type StartupConditionV1 =
  | { readonly kind: 'service-ready' | 'authenticated' | 'catalog-known' | 'provider-published' }
  | { readonly kind: 'milestone'; readonly milestoneId: string }

export interface StartupCapabilityBaseV1 {
  readonly id: string
  readonly serviceId: string
  readonly dependsOn: readonly StartupCapabilityRefV1[]
  readonly wait: Readonly<Record<StartupModeV1, StartupWaitPolicyV1>>
  readonly milestones: readonly string[]
  readonly success: { readonly allOf: readonly StartupConditionV1[] }
}

export type StartupCapabilityDeclarationV1 = StartupCapabilityBaseV1 & (
  | { readonly kind: 'provider'; readonly providerId: string; readonly compositionOrigin: string }
  | { readonly kind: 'capability' }
)

export interface StartupPageDeclarationV1 {
  readonly pageId: string
  /** Observation requirements never block page registration or navigation. */
  readonly observes: readonly StartupCapabilityRefV1[]
  readonly actions: readonly {
    readonly actionId: string
    readonly requires: readonly StartupCapabilityRefV1[]
  }[]
}

export interface StartupDeclarationV1 {
  readonly contract: 'cordisx.startup-declaration/v1'
  readonly capabilities: readonly StartupCapabilityDeclarationV1[]
  readonly pages: readonly StartupPageDeclarationV1[]
}

export type StartupStateV1 =
  | 'unknown' | 'declared' | 'preparing' | 'auth-required' | 'catalog-pending'
  | 'ready' | 'failed' | 'stopped' | 'revoked'

export type StartupActionReasonV1 =
  | 'unknown-target' | 'not-prepared' | 'preparing' | 'authentication-required'
  | 'catalog-pending' | 'catalog-empty' | 'model-unavailable' | 'dependency-not-ready'
  | 'milestone-pending' | 'provider-unpublished' | 'failed' | 'stopped' | 'revoked'
  | 'permission-denied' | 'unsupported' | 'stale-generation' | 'binding-unavailable'

export type StartupActionAvailabilityV1 =
  | { readonly available: true }
  | { readonly available: false; readonly reason: StartupActionReasonV1 }

export interface StartupIdentityV1 extends StartupCapabilityRefV1 {
  readonly serviceId: string | null
  readonly providerId: string | null
}

export interface StartupGenerationV1 {
  readonly host: string
  readonly plugin: string | null
  readonly service: string | null
}

export type StartupCatalogV1 =
  | { readonly state: 'unknown' | 'pending' | 'not-applicable' }
  | { readonly state: 'known'; readonly generation: string; readonly modelIds: readonly string[] }
  | { readonly state: 'failed' }

/** Safe identifiers only: no binding handle, port, origin URL, credential or raw diagnostic. */
export interface StartupProjectionV1 {
  readonly identity: StartupIdentityV1
  readonly generation: StartupGenerationV1
  readonly state: StartupStateV1
  readonly service: 'unknown' | ManagedServiceProjectionV1['state']
  readonly process: 'unknown' | 'not-started' | 'starting' | 'running' | 'stopped' | 'failed'
  readonly health: 'unknown' | ManagedServiceProjectionV1['health']
  readonly authentication: 'unknown' | 'not-required' | ManagedServiceAuthStateV1
  readonly catalog: StartupCatalogV1
  readonly provider: 'not-applicable' | 'unpublished' | 'published' | 'revoked'
  readonly milestones: readonly { readonly milestoneId: string; readonly state: 'pending' | 'satisfied' | 'failed' }[]
  readonly actions: {
    readonly execute: StartupActionAvailabilityV1
    readonly authenticate: StartupActionAvailabilityV1
    readonly retry: StartupActionAvailabilityV1
  }
}

export interface StartupCursorV1 {
  readonly scopeId: string
  readonly hostGeneration: string
  readonly epoch: string
  readonly sequence: number
}

export interface StartupSnapshotV1 {
  readonly contract: 'cordisx.startup-snapshot/v1'
  readonly cursor: StartupCursorV1
  readonly entries: readonly StartupProjectionV1[]
  readonly pages: readonly {
    readonly pluginId: string
    readonly pageId: string
    readonly actions: readonly { readonly actionId: string; readonly availability: StartupActionAvailabilityV1 }[]
  }[]
}

/** Full snapshots make removals, generation replacement and gap recovery unambiguous. */
export type StartupConnectionV1 =
  | { readonly state: 'connected' }
  | { readonly state: 'disconnected' | 'reconnecting'; readonly reason: 'transport-unavailable' | 'timeout' }

export type StartupEventV1 =
  | { readonly kind: 'connection'; readonly connection: StartupConnectionV1 }
  | { readonly kind: 'snapshot'; readonly reason: 'initial' | 'update' | 'gap' | 'epoch-changed'; readonly snapshot: StartupSnapshotV1 }
  | { readonly kind: 'closed'; readonly reason: 'unsubscribed' | 'scope-revoked' | 'host-replaced'; readonly cursor: StartupCursorV1 }

export interface StartupSubscriptionV1 {
  close(): void
}

/** Host-issued scope, available before execution binding. No prepare or mutation methods. */
export interface StartupObserverV1 {
  readonly contract: 'cordisx.startup-observer/v1'
  read(options?: { readonly signal?: AbortSignal }): Promise<StartupSnapshotV1>
  subscribe(
    listener: (event: StartupEventV1) => void,
    options?: { readonly after?: StartupCursorV1; readonly signal?: AbortSignal },
  ): Promise<StartupSubscriptionV1>
}

export interface StartupMilestoneReportV1 {
  readonly contract: 'cordisx.startup-milestone/v1'
  readonly target: StartupCapabilityRefV1
  readonly generation: { readonly host: string; readonly plugin: string; readonly service: string }
  readonly milestoneId: string
  readonly sequence: number
  readonly state: 'satisfied' | 'failed'
}

export type StartupDiscoveredCatalogV1 =
  | { readonly state: 'pending' | 'failed' }
  | {
      readonly state: 'known'
      readonly generation: string
      readonly modelIds: readonly string[]
      readonly digest: `sha256:${string}`
    }

export interface StartupCatalogReportV1 {
  readonly contract: 'cordisx.startup-catalog-report/v1'
  readonly target: StartupCapabilityRefV1
  readonly generation: { readonly host: string; readonly plugin: string; readonly service: string }
  readonly sequence: number
  readonly catalog: StartupDiscoveredCatalogV1
}

/** Issued only to the declaring Node service owner, never to a renderer. */
export interface StartupReporterV1 {
  reportCatalog(input: StartupCatalogReportV1): Promise<
    | { readonly status: 'accepted' }
    | { readonly status: 'rejected'; readonly reason: 'not-owner' | 'undeclared' | 'stale-generation' | 'stale-sequence' | 'revoked' | 'invalid-catalog' | 'not-provider' }
  >
  report(input: StartupMilestoneReportV1): Promise<
    | { readonly status: 'accepted' }
    | { readonly status: 'rejected'; readonly reason: 'not-owner' | 'undeclared' | 'stale-generation' | 'stale-sequence' | 'revoked' }
  >
}

export interface StartupContextV1 {
  readonly startup: StartupObserverV1
}
