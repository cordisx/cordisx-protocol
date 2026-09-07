import type { PluginRuntimeManifestV12 } from './plugin-manifest.v12.js'
import type {
  PluginRuntimeManifestForPackageV11,
  PluginRuntimeManifestSchemaForPackageV11,
  PluginRuntimePackageV11,
} from './plugin-package.v11.js'
export * from './plugin-package.v11.js'
export type PluginRuntimeManifestSchemaForPackageV12 =
  | PluginRuntimeManifestSchemaForPackageV11
  | 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/plugin-manifest.v12.schema.json'
export interface PluginRuntimePackageV12 extends Omit<PluginRuntimePackageV11, '$schema' | 'schemaVersion' | 'runtimeManifest'> {
  readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/plugin-package.v12.schema.json'
  readonly schemaVersion: 12
  readonly runtimeManifest: {
    readonly path: string
    readonly schema: PluginRuntimeManifestSchemaForPackageV12
    readonly digest: `sha256:${string}`
  }
}
export type PluginRuntimeManifestForPackageV12 = PluginRuntimeManifestForPackageV11 | PluginRuntimeManifestV12
