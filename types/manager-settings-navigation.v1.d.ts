import type { LocalizedText, RouteReference } from './manager-content-navigation.v1.js'

export type ManagerSettingsNavigationGroupId = 'resources' | 'development' | 'collaboration' | 'other'
export type ManagerSettingsNavigationInsertionGroup = 'before-settings' | 'after-settings'
export type ManagerSettingsNavigationSurfaceSchemaVersion = 5 | 6 | 7 | 8 | 9

export interface ManagerSettingsNavigationGroupDefinition {
  readonly id: ManagerSettingsNavigationGroupId
  readonly label: LocalizedText & { readonly fallback: string }
  readonly order: 100 | 200 | 300 | 1000
}

export interface ManagerSettingsNavigationGroupCatalogV1 {
  readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/manager-settings-navigation-groups.v1.schema.json'
  readonly contract: 'cordisx.manager-settings-navigation-groups/v1'
  readonly schemaVersion: 1
  readonly groups: readonly [
    ManagerSettingsNavigationGroupDefinition & { readonly id: 'resources'; readonly order: 100 },
    ManagerSettingsNavigationGroupDefinition & { readonly id: 'development'; readonly order: 200 },
    ManagerSettingsNavigationGroupDefinition & { readonly id: 'collaboration'; readonly order: 300 },
    ManagerSettingsNavigationGroupDefinition & { readonly id: 'other'; readonly order: 1000 },
  ]
  readonly fallbackGroup: 'other'
}

export interface ManagerSettingsNavigationGroupReferenceV1 {
  readonly id: ManagerSettingsNavigationGroupId
}

export interface ManagerSettingsNavigationItemV2 {
  readonly route: RouteReference
  readonly navigationGroup?: ManagerSettingsNavigationGroupReferenceV1
}

export type ManagerSettingsNavigationGroupAssignment =
  | 'declared'
  | 'legacy-fallback'
  | 'unassigned-fallback'

export interface ManagerSettingsNavigationContributionProjectionV1 {
  readonly owner: string
  readonly id: string
  readonly surfaceSchemaVersion: ManagerSettingsNavigationSurfaceSchemaVersion
  readonly insertionGroup: ManagerSettingsNavigationInsertionGroup
  readonly declaredGroup?: ManagerSettingsNavigationGroupId
  readonly effectiveGroup: ManagerSettingsNavigationGroupId
  readonly assignment: ManagerSettingsNavigationGroupAssignment
  readonly order: number
}

export interface ManagerSettingsNavigationProjectionV1 {
  readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/manager-settings-navigation-projection.v1.schema.json'
  readonly contract: 'cordisx.manager-settings-navigation-projection/v1'
  readonly schemaVersion: 1
  readonly catalog: ManagerSettingsNavigationGroupCatalogV1
  readonly contributions: readonly ManagerSettingsNavigationContributionProjectionV1[]
}
