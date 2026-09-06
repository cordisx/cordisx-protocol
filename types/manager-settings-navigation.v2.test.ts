import type {
  ManagerSettingsNavigationProjectionV2,
  ManagerSettingsNavigationRuntimeIdentityV2,
  ManagerSettingsNavigationSurfaceV9Identity,
} from './manager-settings-navigation.v2.js'

const versioned = {
  $schema:
    'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/surface-contribution.v9.schema.json',
  schemaVersion: 9,
} as const satisfies ManagerSettingsNavigationSurfaceV9Identity

const legacy = {} as const satisfies ManagerSettingsNavigationRuntimeIdentityV2

declare const projection: ManagerSettingsNavigationProjectionV2
projection.contributions[0]?.surfaceProvenance.kind satisfies 'versioned' | 'legacy-unversioned' | undefined

void versioned
void legacy
