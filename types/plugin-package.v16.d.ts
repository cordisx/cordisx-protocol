import type { PluginRuntimeManifestV16 } from './plugin-manifest.v16.js'
import type {
  PluginRuntimeManifestForPackageV15,
  PluginRuntimeManifestSchemaForPackageV15,
  PluginRuntimePackageV15,
} from './plugin-package.v15.js'
export * from './plugin-package.v15.js'

export type PluginRuntimeManifestSchemaForPackageV16 =
  | PluginRuntimeManifestSchemaForPackageV15
  | 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/plugin-manifest.v16.schema.json'

export interface PluginRuntimePackageV16
  extends Omit<PluginRuntimePackageV15, '$schema' | 'schemaVersion' | 'runtimeManifest'> {
  readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/plugin-package.v16.schema.json'
  readonly schemaVersion: 16
  readonly runtimeManifest: {
    readonly path: string
    readonly schema: PluginRuntimeManifestSchemaForPackageV16
    readonly digest: `sha256:${string}`
  }
}

export type PluginRuntimeManifestForPackageV16 = PluginRuntimeManifestForPackageV15 | PluginRuntimeManifestV16
