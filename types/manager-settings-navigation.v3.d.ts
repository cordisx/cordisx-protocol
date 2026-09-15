export * from './manager-settings-navigation.v2.js'

import type { LocalizedText } from './manager-content-navigation.v1.js'
import type {
  ManagerSettingsNavigationGroupId,
  ManagerSettingsNavigationInsertionGroup,
  ManagerSettingsNavigationSurfaceV9Identity,
} from './manager-settings-navigation.v2.js'

export type ManagerSettingsNavigationGroupIdV2 =
  | 'resources'
  | 'development'
  | 'collaboration'
  | 'external-accounts'
  | 'other'

export interface ManagerSettingsNavigationGroupDefinitionV2 {
  readonly id: ManagerSettingsNavigationGroupIdV2
  readonly label: LocalizedText & { readonly fallback: string }
  readonly order: 100 | 200 | 300 | 400 | 1000
}

export interface ManagerSettingsNavigationGroupCatalogV2 {
  readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/manager-settings-navigation-groups.v2.schema.json'
  readonly contract: 'cordisx.manager-settings-navigation-groups/v2'
  readonly schemaVersion: 2
  readonly groups: readonly [
    ManagerSettingsNavigationGroupDefinitionV2 & { readonly id: 'resources'; readonly order: 100 },
    ManagerSettingsNavigationGroupDefinitionV2 & { readonly id: 'development'; readonly order: 200 },
    ManagerSettingsNavigationGroupDefinitionV2 & { readonly id: 'collaboration'; readonly order: 300 },
    ManagerSettingsNavigationGroupDefinitionV2 & { readonly id: 'external-accounts'; readonly order: 400 },
    ManagerSettingsNavigationGroupDefinitionV2 & { readonly id: 'other'; readonly order: 1000 },
  ]
  readonly fallbackGroup: 'other'
}

export interface ManagerSettingsNavigationSurfaceV11Identity {
  readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/surface-contribution.v11.schema.json'
  readonly schemaVersion: 11
}

export type ManagerSettingsNavigationRuntimeIdentityV3 =
  | ManagerSettingsNavigationSurfaceV9Identity
  | ManagerSettingsNavigationSurfaceV11Identity
  | Readonly<{ readonly $schema?: never; readonly schemaVersion?: never }>

export type ManagerSettingsNavigationSurfaceProvenanceV3 =
  | Readonly<ManagerSettingsNavigationSurfaceV9Identity & { readonly kind: 'versioned' }>
  | Readonly<ManagerSettingsNavigationSurfaceV11Identity & { readonly kind: 'versioned' }>
  | Readonly<{ readonly kind: 'legacy-unversioned' }>

interface ManagerSettingsNavigationContributionProjectionBaseV3 {
  readonly owner: string
  readonly id: string
  readonly insertionGroup: ManagerSettingsNavigationInsertionGroup
  readonly order: number
}

export type ManagerSettingsNavigationContributionProjectionV3 =
  | Readonly<
    ManagerSettingsNavigationContributionProjectionBaseV3 & {
      readonly surfaceProvenance: ManagerSettingsNavigationSurfaceV9Identity & { readonly kind: 'versioned' }
      readonly declaredGroup: ManagerSettingsNavigationGroupId
      readonly effectiveGroup: ManagerSettingsNavigationGroupId
      readonly assignment: 'declared'
    }
  >
  | Readonly<
    ManagerSettingsNavigationContributionProjectionBaseV3 & {
      readonly surfaceProvenance: ManagerSettingsNavigationSurfaceV11Identity & { readonly kind: 'versioned' }
      readonly declaredGroup: ManagerSettingsNavigationGroupIdV2
      readonly effectiveGroup: ManagerSettingsNavigationGroupIdV2
      readonly assignment: 'declared'
    }
  >
  | Readonly<
    ManagerSettingsNavigationContributionProjectionBaseV3 & {
      readonly surfaceProvenance:
        | (ManagerSettingsNavigationSurfaceV9Identity & { readonly kind: 'versioned' })
        | (ManagerSettingsNavigationSurfaceV11Identity & { readonly kind: 'versioned' })
      readonly declaredGroup?: never
      readonly effectiveGroup: 'other'
      readonly assignment: 'unassigned-fallback'
    }
  >
  | Readonly<
    ManagerSettingsNavigationContributionProjectionBaseV3 & {
      readonly surfaceProvenance: { readonly kind: 'legacy-unversioned' }
      readonly declaredGroup?: never
      readonly effectiveGroup: 'other'
      readonly assignment: 'legacy-fallback'
    }
  >

export interface ManagerSettingsNavigationProjectionV3 {
  readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/manager-settings-navigation-projection.v3.schema.json'
  readonly contract: 'cordisx.manager-settings-navigation-projection/v3'
  readonly schemaVersion: 3
  readonly catalog: ManagerSettingsNavigationGroupCatalogV2
  readonly contributions: readonly ManagerSettingsNavigationContributionProjectionV3[]
}
