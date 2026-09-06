import type { PluginRuntimeManifestV9 } from './plugin-manifest.v9.js'
import type { ExtensionPointInteractionCapabilityV1 } from './extension-point-visual.v1.js'
export * from './plugin-manifest.v9.js'
export interface PluginRuntimeManifestV10 extends Omit<PluginRuntimeManifestV9, '$schema' | 'schemaVersion' | 'capabilities'> {
  readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/plugin-manifest.v10.schema.json'
  readonly schemaVersion: 10
  readonly capabilities: readonly (PluginRuntimeManifestV9['capabilities'][number] | ExtensionPointInteractionCapabilityV1)[]
}
