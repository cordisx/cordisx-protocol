import type {
  ManagerSettingsNavigationGroupCatalogV1,
  ManagerSettingsNavigationItemV2,
  ManagerSettingsNavigationProjectionV1,
} from './manager-settings-navigation.v1.js'

const catalog = {
  $schema:
    'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/manager-settings-navigation-groups.v1.schema.json',
  contract: 'cordisx.manager-settings-navigation-groups/v1',
  schemaVersion: 1,
  groups: [
    { id: 'resources', label: { key: 'manager.navigation.resources', fallback: 'Resources' }, order: 100 },
    { id: 'development', label: { key: 'manager.navigation.development', fallback: 'Development' }, order: 200 },
    { id: 'collaboration', label: { key: 'manager.navigation.collaboration', fallback: 'Collaboration' }, order: 300 },
    { id: 'other', label: { key: 'manager.navigation.other', fallback: 'Other' }, order: 1000 },
  ],
  fallbackGroup: 'other',
} as const satisfies ManagerSettingsNavigationGroupCatalogV1

const item = {
  route: { id: 'plugins' },
  navigationGroup: { id: 'resources' },
} as const satisfies ManagerSettingsNavigationItemV2

const projection = {
  $schema:
    'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/manager-settings-navigation-projection.v1.schema.json',
  contract: 'cordisx.manager-settings-navigation-projection/v1',
  schemaVersion: 1,
  catalog,
  contributions: [{
    owner: 'example',
    id: 'plugins',
    surfaceSchemaVersion: 9,
    insertionGroup: 'before-settings',
    declaredGroup: 'resources',
    effectiveGroup: 'resources',
    assignment: 'declared',
    order: 100,
  }],
} as const satisfies ManagerSettingsNavigationProjectionV1

void item
void projection
