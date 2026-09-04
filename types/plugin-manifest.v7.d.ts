import type { PluginManifestCapabilityDeclarationV6, PluginManifestChannelAdapterServiceV6 } from './plugin-manifest.v6.js'

export type PluginManifestCapabilityDeclarationV7 = PluginManifestCapabilityDeclarationV6 & {
  readonly name: Exclude<PluginManifestCapabilityDeclarationV6['name'], 'ui.host-dom.read' | 'ui.host-dom.modify'>
}

export interface PluginRuntimeManifestV7 {
  readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/plugin-manifest.v7.schema.json'
  readonly schemaVersion: 7
  readonly id: string
  readonly name?: string
  /** Isolated canvas plugins never receive either Host DOM capability. */
  readonly capabilities: readonly PluginManifestCapabilityDeclarationV7[]
  readonly services: readonly PluginManifestChannelAdapterServiceV6[]
  readonly execution: {
    readonly realm: 'isolated-worker'
    readonly interfaces: readonly ['ui.transient-canvas/v1']
  }
}
