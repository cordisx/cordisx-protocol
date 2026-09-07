import type { PluginRuntimeManifestV10 } from './plugin-manifest.v10.js'
import type { UsageReadCapabilityV1 } from './usage.v1.js'
export * from './plugin-manifest.v10.js'
export interface PluginRuntimeManifestV11 extends Omit<PluginRuntimeManifestV10, '$schema' | 'schemaVersion' | 'capabilities'> {
  readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/plugin-manifest.v11.schema.json'
  readonly schemaVersion: 11
  readonly capabilities: readonly (PluginRuntimeManifestV10['capabilities'][number] | UsageReadCapabilityV1)[]
}
