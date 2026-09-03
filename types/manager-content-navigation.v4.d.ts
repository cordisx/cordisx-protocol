import type { LocalizedText } from './manager-content-navigation.v1.js'
import type {
  ManagerContentNavigationDeclarationV3,
  ManagerContentNavigationSubjectV3,
  ManagerContentNavigationTabV3,
  ManagerContentProjectionV2,
  ManagerContentRecordSummaryV3,
} from './manager-content-navigation.v3.js'

export type ManagerContentConfigJsonValue = string | number | boolean | null | readonly ManagerContentConfigJsonValue[] | { readonly [key: string]: ManagerContentConfigJsonValue }
export type ManagerContentConfigScalar = string | number | boolean | null
export type ManagerContentConfigFieldPath = readonly [string, ...string[]]

export interface ManagerContentConfigMissingDefaultV1 {
  readonly path: ManagerContentConfigFieldPath
  readonly value: ManagerContentConfigScalar
}

export interface ManagerContentPluginConfigFormBodyV1 {
  readonly kind: 'plugin-config-form'
  /** Exact owner-local Config namespace; owner/profile/generation are Host-bound. */
  readonly namespace: string
  readonly defaultMaterialization?: {
    readonly mode: 'missing-only'
    readonly fields: readonly [ManagerContentConfigMissingDefaultV1, ...ManagerContentConfigMissingDefaultV1[]]
  }
}

export interface ManagerContentNavigationDeclarationV4 {
  readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/manager-content-navigation.v4.schema.json'
  readonly schemaVersion: 4
  readonly id: ManagerContentNavigationDeclarationV3['id']
  readonly route: ManagerContentNavigationDeclarationV3['route']
  readonly parentRoute?: ManagerContentNavigationDeclarationV3['parentRoute']
  readonly header: ManagerContentNavigationDeclarationV3['header']
  readonly subject?: ManagerContentNavigationSubjectV3
  readonly recordSummary?: ManagerContentRecordSummaryV3
  readonly tabs?: ReadonlyArray<ManagerContentNavigationTabV3>
  /** Presence replaces the plugin-owned body mount with one Host-owned body. */
  readonly body?: ManagerContentPluginConfigFormBodyV1
}

export interface ManagerContentPluginIdentityV1 {
  readonly source: string
  readonly pluginId: string
}

export interface ManagerContentPluginScopeV1 {
  readonly profileId: string
  readonly generation: string
}

export type ManagerContentPluginConfigAppliesV2 = 'live' | 'plugin-restart' | 'service-restart' | 'app-restart'

export interface ManagerContentPluginConfigSecretSlotV1 {
  readonly path: ManagerContentConfigFieldPath
  readonly set: boolean
}

export type ManagerContentPluginConfigFormIconV1 = 'host:calendar' | 'host:clock' | 'host:palette' | 'host:tags' | 'host:folder' | 'host:key' | 'host:settings' | 'host:info' | 'host:files' | 'host:save' | 'host:reset'
export type ManagerContentPluginConfigFormTextV1 = string | Readonly<Record<string, string>>
export interface ManagerContentPluginConfigFormGroupV1 { readonly id: string; readonly title?: ManagerContentPluginConfigFormTextV1; readonly description?: ManagerContentPluginConfigFormTextV1; readonly icon?: ManagerContentPluginConfigFormIconV1 }
export type ManagerContentPluginConfigPresenterKindV1 = 'choice.select' | 'choice.radio' | 'choice.segmented' | 'number.input' | 'number.stepper' | 'number.slider' | 'array.scalar-tags' | 'array.scalar-rows' | 'array.object-auto' | 'array.object-dialog' | 'array.object-page'
export interface ManagerContentPluginConfigPresenterV1 { readonly version: 1; readonly kind: ManagerContentPluginConfigPresenterKindV1; readonly options?: { readonly density?: 'compact' | 'regular'; readonly maxInlineItems?: number; readonly allowReorder?: boolean } }
export interface ManagerContentPluginConfigFormFieldV1 { readonly path: ManagerContentConfigFieldPath; readonly icon?: ManagerContentPluginConfigFormIconV1; readonly group?: ManagerContentPluginConfigFormGroupV1; readonly presenter?: ManagerContentPluginConfigPresenterV1 }
export interface ManagerContentPluginConfigFormPresentationV1 {
  readonly version: 1
  readonly fields: readonly ManagerContentPluginConfigFormFieldV1[]
  readonly actions?: { readonly save?: ManagerContentPluginConfigFormIconV1; readonly reset?: ManagerContentPluginConfigFormIconV1 }
}

export type ManagerContentPluginConfigSchemaProjectionV2 =
  | { readonly kind: 'schemastery'; readonly envelope: Readonly<Record<string, ManagerContentConfigJsonValue>>; readonly form?: ManagerContentPluginConfigFormPresentationV1 }
  | { readonly kind: 'standard'; readonly renderable: false }

export interface ManagerContentPluginConfigDescriptorV2 {
  readonly version: 2
  readonly identity: ManagerContentPluginIdentityV1
  readonly scope: ManagerContentPluginScopeV1
  readonly namespace: string
  readonly schema: ManagerContentPluginConfigSchemaProjectionV2
  readonly value: ManagerContentConfigJsonValue
  readonly user?: ManagerContentConfigJsonValue
  readonly revision: number
  readonly lastGoodRevision: number
  readonly applies: ManagerContentPluginConfigAppliesV2
  readonly writable: boolean
  readonly secrets: readonly ManagerContentPluginConfigSecretSlotV1[]
}

export interface ManagerContentConfigBindingV1 {
  readonly bindingId: string
  readonly identity: ManagerContentPluginIdentityV1
  readonly scope: ManagerContentPluginScopeV1
  readonly declarationId: string
  readonly namespace: string
}

export interface ManagerContentConfigValidationIssueV1 {
  readonly path?: ManagerContentConfigFieldPath
  readonly code: string
  readonly message: LocalizedText & { readonly fallback: string }
}

export type ManagerContentConfigValidationV1 =
  | { readonly state: 'unvalidated' }
  | { readonly state: 'valid' }
  | { readonly state: 'invalid'; readonly issues: readonly [ManagerContentConfigValidationIssueV1, ...ManagerContentConfigValidationIssueV1[]] }

export interface ManagerContentPluginConfigFormProjectionV1 {
  readonly kind: 'plugin-config-form'
  readonly binding: ManagerContentConfigBindingV1
  readonly sequence: number
  readonly configuration: ManagerContentPluginConfigDescriptorV2
  readonly draft: {
    readonly baseRevision: number
    readonly dirty: boolean
    readonly value: ManagerContentConfigJsonValue
    readonly validation: ManagerContentConfigValidationV1
  }
}

export interface ManagerContentProjectionV3 extends Omit<ManagerContentProjectionV2, '$schema' | 'schemaVersion'> {
  readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/manager-content-projection.v3.schema.json'
  readonly schemaVersion: 3
  readonly body?: ManagerContentPluginConfigFormProjectionV1
}

export type ManagerContentConfigOperationV1 =
  | { readonly op: 'set'; readonly path: ManagerContentConfigFieldPath; readonly value: ManagerContentConfigJsonValue }
  | { readonly op: 'unset'; readonly path: ManagerContentConfigFieldPath }
export type ManagerContentConfigOperationsV1 = readonly [ManagerContentConfigOperationV1, ...ManagerContentConfigOperationV1[]]

interface ManagerContentConfigCommandFenceV1 {
  readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/manager-content-config-command.v1.schema.json'
  readonly contract: 'cordisx.manager-content-config-command/v1'
  readonly schemaVersion: 1
  readonly commandId: string
  readonly binding: ManagerContentConfigBindingV1
  readonly expectedRevision: number
}

export type ManagerContentConfigCommandV1 =
  | (ManagerContentConfigCommandFenceV1 & { readonly operation: 'draft.validate'; readonly operations: ManagerContentConfigOperationsV1 })
  | (ManagerContentConfigCommandFenceV1 & { readonly operation: 'draft.save'; readonly mutationId: string; readonly operations: ManagerContentConfigOperationsV1 })
  | (ManagerContentConfigCommandFenceV1 & { readonly operation: 'defaults.materialize'; readonly materializationId: string })

interface ManagerContentConfigResultFenceV1 {
  readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/manager-content-config-result.v1.schema.json'
  readonly contract: 'cordisx.manager-content-config-result/v1'
  readonly schemaVersion: 1
  readonly commandId: string
  readonly binding: ManagerContentConfigBindingV1
  readonly expectedRevision: number
  readonly operation: ManagerContentConfigCommandV1['operation']
}

export type ManagerContentConfigResultV1 =
  | (ManagerContentConfigResultFenceV1 & { readonly status: 'validated'; readonly code: 'valid'; readonly revision: number; readonly validation: Extract<ManagerContentConfigValidationV1, { state: 'valid' }> })
  | (ManagerContentConfigResultFenceV1 & { readonly status: 'applied'; readonly code: 'saved' | 'defaults-materialized'; readonly revision: number; readonly applies: Exclude<ManagerContentPluginConfigAppliesV2, 'app-restart'>; readonly resultingGeneration: string })
  | (ManagerContentConfigResultFenceV1 & { readonly status: 'staged'; readonly code: 'saved' | 'defaults-materialized'; readonly revision: number; readonly applies: 'app-restart' })
  | (ManagerContentConfigResultFenceV1 & { readonly status: 'preserved'; readonly code: 'values-present' | 'already-materialized'; readonly revision: number })
  | (ManagerContentConfigResultFenceV1 & { readonly status: 'conflict'; readonly code: 'revision-conflict' | 'command-conflict'; readonly revision: number; readonly currentRevision: number })
  | (ManagerContentConfigResultFenceV1 & { readonly status: 'rejected'; readonly code: 'validation-failed' | 'secret-path' | 'default-not-declared' | 'default-schema-mismatch'; readonly revision: number; readonly validation?: Extract<ManagerContentConfigValidationV1, { state: 'invalid' }> })
  | (ManagerContentConfigResultFenceV1 & { readonly status: 'unavailable'; readonly code: 'not-writable' | 'owner-unavailable' | 'stale-generation' | 'binding-replaced' | 'disposed' | 'persistence-failed' | 'plugin-restart-failed' | 'service-restart-failed' | 'rollback-failed'; readonly revision: number })

export interface ManagerContentConfigSubscriptionDescriptorV1 {
  readonly subscriptionId: string
  readonly binding: ManagerContentConfigBindingV1
  readonly afterSequence: number
  readonly replayThrough: number
}

export type ManagerContentConfigUpdateV1 =
  | { readonly kind: 'snapshot-replaced'; readonly sequence: number; readonly body: ManagerContentPluginConfigFormProjectionV1 }
  | { readonly kind: 'disposed'; readonly sequence: number; readonly reason: 'explicit' | 'declaration-replaced' | 'generation-replaced' | 'owner-disposed' }

export interface ManagerContentConfigSubscriptionPageV1 {
  readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/manager-content-config-subscription-page.v1.schema.json'
  readonly contract: 'cordisx.manager-content-config-subscription-page/v1'
  readonly schemaVersion: 1
  readonly subscription: ManagerContentConfigSubscriptionDescriptorV1
  readonly phase: 'replay' | 'live'
  readonly updates: readonly ManagerContentConfigUpdateV1[]
  readonly nextAfterSequence: number
  readonly hasMore: boolean
}

export interface ManagerContentConfigSubscriptionClosedV1 {
  readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/manager-content-config-subscription-close.v1.schema.json'
  readonly contract: 'cordisx.manager-content-config-subscription-close/v1'
  readonly schemaVersion: 1
  readonly subscriptionId: string
  readonly binding: ManagerContentConfigBindingV1
  readonly status: 'closed'
  readonly code: 'unsubscribed' | 'explicit' | 'declaration-replaced' | 'generation-replaced' | 'owner-disposed' | 'permission-revoked' | 'connection-replaced' | 'observer-failed'
}

declare const managerContentConfigSubscriptionCapability: unique symbol
declare const managerContentConfigSourceCapability: unique symbol

export interface ManagerContentConfigSubscriptionV1 {
  readonly descriptor: ManagerContentConfigSubscriptionDescriptorV1
  readonly pages: AsyncIterable<ManagerContentConfigSubscriptionPageV1>
  readonly closed: Promise<ManagerContentConfigSubscriptionClosedV1>
  readonly [managerContentConfigSubscriptionCapability]: never
  unsubscribe(): Promise<ManagerContentConfigSubscriptionClosedV1>
}

export type ManagerContentConfigSubscribeResultV1 =
  | { readonly status: 'subscribed'; readonly subscription: ManagerContentConfigSubscriptionV1 }
  | { readonly status: 'unavailable'; readonly code: 'owner-unavailable' | 'stale-generation' | 'binding-replaced' | 'disposed' }

export type ManagerContentConfigSnapshotResultV1 =
  | { readonly status: 'available'; readonly body: ManagerContentPluginConfigFormProjectionV1 }
  | { readonly status: 'unavailable'; readonly code: 'owner-unavailable' | 'stale-generation' | 'binding-replaced' | 'disposed' }

/** Host-internal authority seam. This capability is never exposed through plugin ctx. */
export interface ManagerContentConfigSourceV1 {
  readonly binding: ManagerContentConfigBindingV1
  readonly [managerContentConfigSourceCapability]: never
  snapshot(): Promise<ManagerContentConfigSnapshotResultV1>
  execute(command: ManagerContentConfigCommandV1): Promise<ManagerContentConfigResultV1>
  subscribe(afterSequence: number): Promise<ManagerContentConfigSubscribeResultV1>
}
