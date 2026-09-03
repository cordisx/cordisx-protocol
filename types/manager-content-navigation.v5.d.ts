export * from './manager-content-navigation.v4.js'

import type { LocalizedText } from './manager-content-navigation.v1.js'
import type {
  ManagerContentConfigBindingV1,
  ManagerContentConfigCommandV1,
  ManagerContentConfigJsonValue,
  ManagerContentConfigResultV1,
  ManagerContentConfigScalar,
  ManagerContentConfigSnapshotResultV1,
  ManagerContentConfigSubscriptionClosedV1,
  ManagerContentConfigSubscriptionDescriptorV1,
  ManagerContentConfigSubscriptionPageV1,
  ManagerContentConfigValidationV1,
  ManagerContentNavigationDeclarationV4,
  ManagerContentPluginConfigAppliesV2,
  ManagerContentPluginConfigFormFieldV1,
  ManagerContentPluginConfigFormIconV1,
  ManagerContentPluginConfigSecretSlotV1,
  ManagerContentPluginIdentityV1,
  ManagerContentPluginScopeV1,
  ManagerContentProjectionV3,
} from './manager-content-navigation.v4.js'

export interface ManagerContentPluginConfigLocalizedChoiceV2 {
  /** Exact bounded scalar written by the unchanged manager config command. */
  readonly value: ManagerContentConfigScalar
  /** Host resolves the active locale and must use fallback when resolution misses. */
  readonly label: LocalizedText & { readonly fallback: string }
}

export interface ManagerContentPluginConfigFormFieldV2 extends ManagerContentPluginConfigFormFieldV1 {
  /** Complete, value-unique label set for one finite scalar schema field. */
  readonly choices?: readonly [ManagerContentPluginConfigLocalizedChoiceV2, ...ManagerContentPluginConfigLocalizedChoiceV2[]]
}

export interface ManagerContentPluginConfigFormPresentationV2 {
  readonly version: 2
  readonly fields: readonly ManagerContentPluginConfigFormFieldV2[]
  readonly actions?: { readonly save?: ManagerContentPluginConfigFormIconV1; readonly reset?: ManagerContentPluginConfigFormIconV1 }
}

export type ManagerContentPluginConfigSchemaProjectionV3 =
  | { readonly kind: 'schemastery'; readonly envelope: Readonly<Record<string, ManagerContentConfigJsonValue>>; readonly form?: ManagerContentPluginConfigFormPresentationV2 }
  | { readonly kind: 'standard'; readonly renderable: false }

export interface ManagerContentPluginConfigDescriptorV3 {
  readonly version: 3
  readonly identity: ManagerContentPluginIdentityV1
  readonly scope: ManagerContentPluginScopeV1
  readonly namespace: string
  readonly schema: ManagerContentPluginConfigSchemaProjectionV3
  readonly value: ManagerContentConfigJsonValue
  readonly user?: ManagerContentConfigJsonValue
  readonly revision: number
  readonly lastGoodRevision: number
  readonly applies: ManagerContentPluginConfigAppliesV2
  readonly writable: boolean
  readonly secrets: readonly ManagerContentPluginConfigSecretSlotV1[]
}

export interface ManagerContentPluginConfigFormProjectionV2 {
  readonly kind: 'plugin-config-form'
  readonly binding: ManagerContentConfigBindingV1
  readonly sequence: number
  readonly configuration: ManagerContentPluginConfigDescriptorV3
  readonly draft: {
    readonly baseRevision: number
    readonly dirty: boolean
    readonly value: ManagerContentConfigJsonValue
    readonly validation: ManagerContentConfigValidationV1
  }
}

export interface ManagerContentNavigationDeclarationV5 extends Omit<ManagerContentNavigationDeclarationV4, '$schema' | 'schemaVersion'> {
  readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/manager-content-navigation.v5.schema.json'
  readonly schemaVersion: 5
}

export interface ManagerContentProjectionV4 extends Omit<ManagerContentProjectionV3, '$schema' | 'schemaVersion' | 'body'> {
  readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/manager-content-projection.v4.schema.json'
  readonly schemaVersion: 4
  readonly body?: ManagerContentPluginConfigFormProjectionV2
}

export type ManagerContentConfigUpdateV2 =
  | { readonly kind: 'snapshot-replaced'; readonly sequence: number; readonly body: ManagerContentPluginConfigFormProjectionV2 }
  | { readonly kind: 'disposed'; readonly sequence: number; readonly reason: 'explicit' | 'declaration-replaced' | 'generation-replaced' | 'owner-disposed' }

export interface ManagerContentConfigSubscriptionPageV2 extends Omit<ManagerContentConfigSubscriptionPageV1, '$schema' | 'contract' | 'schemaVersion' | 'updates'> {
  readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/manager-content-config-subscription-page.v2.schema.json'
  readonly contract: 'cordisx.manager-content-config-subscription-page/v2'
  readonly schemaVersion: 2
  readonly updates: readonly ManagerContentConfigUpdateV2[]
}

declare const managerContentConfigSubscriptionV2Capability: unique symbol
declare const managerContentConfigSourceV2Capability: unique symbol

export interface ManagerContentConfigSubscriptionV2 {
  readonly descriptor: ManagerContentConfigSubscriptionDescriptorV1
  readonly pages: AsyncIterable<ManagerContentConfigSubscriptionPageV2>
  readonly closed: Promise<ManagerContentConfigSubscriptionClosedV1>
  readonly [managerContentConfigSubscriptionV2Capability]: never
  unsubscribe(): Promise<ManagerContentConfigSubscriptionClosedV1>
}

export type ManagerContentConfigSubscribeResultV2 =
  | { readonly status: 'subscribed'; readonly subscription: ManagerContentConfigSubscriptionV2 }
  | { readonly status: 'unavailable'; readonly code: 'owner-unavailable' | 'stale-generation' | 'binding-replaced' | 'disposed' }

export type ManagerContentConfigSnapshotResultV2 =
  | { readonly status: 'available'; readonly body: ManagerContentPluginConfigFormProjectionV2 }
  | Exclude<ManagerContentConfigSnapshotResultV1, { status: 'available' }>

/** Host-internal authority seam. Commands/results retain the v1 ledger and CAS contract. */
export interface ManagerContentConfigSourceV2 {
  readonly binding: ManagerContentConfigBindingV1
  readonly [managerContentConfigSourceV2Capability]: never
  snapshot(): Promise<ManagerContentConfigSnapshotResultV2>
  execute(command: ManagerContentConfigCommandV1): Promise<ManagerContentConfigResultV1>
  subscribe(afterSequence: number): Promise<ManagerContentConfigSubscribeResultV2>
}
