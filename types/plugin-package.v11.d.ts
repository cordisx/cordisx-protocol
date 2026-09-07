import type { PluginRuntimeManifestV11 } from './plugin-manifest.v11.js'
import type {
  PluginRuntimeManifestForPackageV10,
  PluginRuntimeManifestSchemaForPackageV10,
  PluginRuntimePackageV10,
} from './plugin-package.v10.js'
export * from './plugin-package.v10.js'
export type PluginRuntimeManifestSchemaForPackageV11 =
  | PluginRuntimeManifestSchemaForPackageV10
  | 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/plugin-manifest.v11.schema.json'
export interface PluginRuntimePackageV11 extends Omit<PluginRuntimePackageV10, '$schema' | 'schemaVersion' | 'runtimeManifest'> {
  readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/plugin-package.v11.schema.json'
  readonly schemaVersion: 11
  readonly runtimeManifest: {
    readonly path: string
    readonly schema: PluginRuntimeManifestSchemaForPackageV11
    readonly digest: `sha256:${string}`
  }
}
export type PluginRuntimeManifestForPackageV11 = PluginRuntimeManifestForPackageV10 | PluginRuntimeManifestV11
