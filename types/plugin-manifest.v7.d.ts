import type { PluginManifestCapabilityDeclarationV6, PluginManifestChannelAdapterServiceV6 } from './plugin-manifest.v6.js'

export interface PluginRuntimeManifestV7 {
  readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/plugin-manifest.v7.schema.json'
  readonly schemaVersion: 7
  readonly id: string
  readonly name?: string
  readonly capabilities: readonly PluginManifestCapabilityDeclarationV6[]
  readonly services: readonly PluginManifestChannelAdapterServiceV6[]
  readonly execution: {
    readonly realm: 'isolated-worker'
    readonly interfaces: readonly ['ui.transient-canvas/v1']
  }
}
