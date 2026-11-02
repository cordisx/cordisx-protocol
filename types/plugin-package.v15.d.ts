import type { PluginRuntimeManifestV15 } from './plugin-manifest.v15.js'
import type { PluginRuntimeManifestForPackageV14, PluginRuntimeManifestSchemaForPackageV14, PluginRuntimePackageV14 } from './plugin-package.v14.js'

export * from './plugin-package.v14.js'

export type PluginRuntimeManifestSchemaForPackageV15 =
  | PluginRuntimeManifestSchemaForPackageV14
  | 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/plugin-manifest.v15.schema.json'

export interface PluginRuntimePackageV15
  extends Omit<PluginRuntimePackageV14, '$schema' | 'schemaVersion' | 'runtimeManifest'> {
  readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/plugin-package.v15.schema.json'
  readonly schemaVersion: 15
  readonly runtimeManifest: {
    readonly path: string
    readonly schema: PluginRuntimeManifestSchemaForPackageV15
    readonly digest: `sha256:${string}`
  }
}

export type PluginRuntimeManifestForPackageV15 = PluginRuntimeManifestForPackageV14 | PluginRuntimeManifestV15
