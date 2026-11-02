import type { PluginRuntimeManifestV14 } from './plugin-manifest.v14.js'
import type { StartupDeclarationV1 } from './startup.v1.js'
export * from './plugin-manifest.v14.js'

export interface PluginRuntimeManifestV15 extends Omit<PluginRuntimeManifestV14, '$schema' | 'schemaVersion'> {
  readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/plugin-manifest.v15.schema.json'
  readonly schemaVersion: 15
  readonly startup: StartupDeclarationV1
}
