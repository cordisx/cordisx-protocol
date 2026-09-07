import type { PluginRuntimeManifestV13 } from './plugin-manifest.v13.js'
import type {
  PluginRuntimeManifestForPackageV12,
  PluginRuntimeManifestSchemaForPackageV12,
  PluginRuntimePackageV12,
} from './plugin-package.v12.js'

export * from './plugin-package.v12.js'

export type PluginRuntimeManifestSchemaForPackageV13 =
  | PluginRuntimeManifestSchemaForPackageV12
  | 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/plugin-manifest.v13.schema.json'

export interface PluginRuntimePackageV13
  extends Omit<PluginRuntimePackageV12, '$schema' | 'schemaVersion' | 'runtimeManifest'> {
  readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/plugin-package.v13.schema.json'
  readonly schemaVersion: 13
  readonly runtimeManifest: {
    readonly path: string
    readonly schema: PluginRuntimeManifestSchemaForPackageV13
    readonly digest: `sha256:${string}`
  }
}

export type PluginRuntimeManifestForPackageV13 = PluginRuntimeManifestForPackageV12 | PluginRuntimeManifestV13
