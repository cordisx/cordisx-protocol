export * from './manager-settings-navigation.v1.js'

import type {
  ManagerSettingsNavigationContributionProjectionV1,
  ManagerSettingsNavigationGroupCatalogV1,
  ManagerSettingsNavigationGroupId,
} from './manager-settings-navigation.v1.js'

export interface ManagerSettingsNavigationSurfaceV9Identity {
  readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/surface-contribution.v9.schema.json'
  readonly schemaVersion: 9
}

export interface ManagerSettingsNavigationLegacyRuntimeIdentity {
  readonly $schema?: never
  readonly schemaVersion?: never
}

export type ManagerSettingsNavigationRuntimeIdentityV2 =
  | ManagerSettingsNavigationSurfaceV9Identity
  | ManagerSettingsNavigationLegacyRuntimeIdentity

export type ManagerSettingsNavigationSurfaceProvenanceV2 =
  | Readonly<ManagerSettingsNavigationSurfaceV9Identity & { readonly kind: 'versioned' }>
  | Readonly<{ readonly kind: 'legacy-unversioned' }>

export interface ManagerSettingsNavigationContributionProjectionV2
  extends Omit<ManagerSettingsNavigationContributionProjectionV1, 'surfaceSchemaVersion'>
{
  readonly surfaceProvenance: ManagerSettingsNavigationSurfaceProvenanceV2
  readonly declaredGroup?: ManagerSettingsNavigationGroupId
}

export interface ManagerSettingsNavigationProjectionV2 {
  readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/manager-settings-navigation-projection.v2.schema.json'
  readonly contract: 'cordisx.manager-settings-navigation-projection/v2'
  readonly schemaVersion: 2
  readonly catalog: ManagerSettingsNavigationGroupCatalogV1
  readonly contributions: readonly ManagerSettingsNavigationContributionProjectionV2[]
}
