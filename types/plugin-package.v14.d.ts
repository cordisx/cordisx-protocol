import type { PluginRuntimeManifestV14 } from './plugin-manifest.v14.js'
import type { PluginRuntimeManifestForPackageV13, PluginRuntimeManifestSchemaForPackageV13, PluginRuntimePackageV13 } from './plugin-package.v13.js'

export * from './plugin-package.v13.js'

export type PluginRuntimeManifestSchemaForPackageV14 =
  | PluginRuntimeManifestSchemaForPackageV13
  | 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/plugin-manifest.v14.schema.json'

export interface PluginRuntimePackageV14
  extends Omit<PluginRuntimePackageV13, '$schema' | 'schemaVersion' | 'runtimeManifest'> {
  readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/plugin-package.v14.schema.json'
  readonly schemaVersion: 14
  readonly runtimeManifest: {
    readonly path: string
    readonly schema: PluginRuntimeManifestSchemaForPackageV14
    readonly digest: `sha256:${string}`
  }
}

export type PluginRuntimeManifestForPackageV14 = PluginRuntimeManifestForPackageV13 | PluginRuntimeManifestV14
