import type {
  PluginApprovalAuthorityCapabilityDeclarationV8,
  PluginManifestCapabilityDeclarationV6,
  PluginManifestChannelAdapterServiceV6,
} from './plugin-manifest.v8.js'

export * from './plugin-manifest.v8.js'

export type PluginManifestProtocolSchemaV9 =
  `https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/${string}.v${number}.schema.json`

export interface PluginManifestPlatformProviderServiceV9 {
  readonly id: string
  readonly kind: 'platform-provider'
  /** Configuration and external authority remain Host-owned. */
  readonly owner: 'host'
  readonly schema: PluginManifestProtocolSchemaV9
  readonly applicationMode: 'service-restart' | 'app-restart'
  readonly entry: string
}

export type PluginManifestServiceV9 =
  | PluginManifestChannelAdapterServiceV6
  | PluginManifestPlatformProviderServiceV9

export interface PluginRuntimeManifestV9 {
  readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/plugin-manifest.v9.schema.json'
  readonly schemaVersion: 9
  readonly id: string
  readonly name?: string
  readonly capabilities: readonly (
    | PluginManifestCapabilityDeclarationV6
    | PluginApprovalAuthorityCapabilityDeclarationV8
  )[]
  readonly services: readonly PluginManifestServiceV9[]
}
