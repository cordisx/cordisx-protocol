import type { PluginRuntimeManifestV10 } from './plugin-manifest.v10.js'
import type {
  PluginRuntimeManifestForPackageV9,
  PluginRuntimeManifestSchemaForPackageV9,
  PluginRuntimePackageV9,
} from './plugin-package.v9.js'
export * from './plugin-package.v9.js'
export type PluginRuntimeManifestSchemaForPackageV10 =
  | PluginRuntimeManifestSchemaForPackageV9
  | 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/plugin-manifest.v10.schema.json'
export interface PluginRuntimePackageV10 extends Omit<PluginRuntimePackageV9, '$schema' | 'schemaVersion' | 'runtimeManifest'> {
  readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/plugin-package.v10.schema.json'
  readonly schemaVersion: 10
  readonly runtimeManifest: {
    readonly path: string
    readonly schema: PluginRuntimeManifestSchemaForPackageV10
    readonly digest: `sha256:${string}`
  }
}
export type PluginRuntimeManifestForPackageV10 = PluginRuntimeManifestForPackageV9 | PluginRuntimeManifestV10
