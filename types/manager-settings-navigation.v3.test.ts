import type {
  ManagerSettingsNavigationGroupCatalogV2,
  ManagerSettingsNavigationProjectionV3,
  ManagerSettingsNavigationRuntimeIdentityV3,
  ManagerSettingsNavigationSurfaceV11Identity,
} from './manager-settings-navigation.v3.js'

const catalog = {
  $schema:
    'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/manager-settings-navigation-groups.v2.schema.json',
  contract: 'cordisx.manager-settings-navigation-groups/v2',
  schemaVersion: 2,
  groups: [
    { id: 'resources', label: { key: 'manager.navigation.resources', fallback: 'Resources' }, order: 100 },
    { id: 'development', label: { key: 'manager.navigation.development', fallback: 'Development' }, order: 200 },
    { id: 'collaboration', label: { key: 'manager.navigation.collaboration', fallback: 'Collaboration' }, order: 300 },
    {
      id: 'external-accounts',
      label: { key: 'manager.navigation.external-accounts', fallback: 'External accounts' },
      order: 400,
    },
    { id: 'other', label: { key: 'manager.navigation.other', fallback: 'Other' }, order: 1000 },
  ],
  fallbackGroup: 'other',
} as const satisfies ManagerSettingsNavigationGroupCatalogV2

const versionedV11 = {
  $schema:
    'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/surface-contribution.v11.schema.json',
  schemaVersion: 11,
} as const satisfies ManagerSettingsNavigationSurfaceV11Identity

const legacy = {} as const satisfies ManagerSettingsNavigationRuntimeIdentityV3

declare const projection: ManagerSettingsNavigationProjectionV3
projection.contributions[0]?.surfaceProvenance.kind satisfies 'versioned' | 'legacy-unversioned' | undefined
projection.contributions[0]?.effectiveGroup satisfies
  | 'resources'
  | 'development'
  | 'collaboration'
  | 'external-accounts'
  | 'other'
  | undefined

void catalog
void versionedV11
void legacy
