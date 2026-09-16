import type { PluginRuntimeManifestV13 } from './plugin-manifest.v13.js'
export * from './plugin-manifest.v13.js'

export type PluginManifestManagedBackendServiceKindV14 = 'managed-backend'
export type PluginManifestManagedBackendServiceOwnerV14 = 'host'
export type PluginManifestManagedBackendRuntimeResourceModeV14 = 'executable' | 'data'
export type PluginManifestManagedBackendPlatformV14 = 'darwin' | 'linux' | 'win32'
export type PluginManifestManagedBackendArchitectureV14 = 'arm64' | 'x64'

export interface PluginManifestManagedBackendRuntimeResourceV14 {
  readonly path: `./${string}`
  readonly mode: PluginManifestManagedBackendRuntimeResourceModeV14
  readonly digest: `sha256:${string}`
  readonly byteLength: number
  readonly platforms?: readonly PluginManifestManagedBackendPlatformV14[]
  readonly architectures?: readonly PluginManifestManagedBackendArchitectureV14[]
}

export interface PluginManifestManagedBackendConsumerGrantV14 {
  readonly pluginId: string
  readonly operations: readonly string[]
}

export interface PluginManifestManagedBackendServiceV14 {
  readonly id: string
  readonly kind: PluginManifestManagedBackendServiceKindV14
  readonly owner: PluginManifestManagedBackendServiceOwnerV14
  readonly entry: string
  readonly definitionSchema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/managed-service-definition.v1.schema.json'
  readonly runtimeResources: readonly PluginManifestManagedBackendRuntimeResourceV14[]
  readonly consumerGrants: readonly PluginManifestManagedBackendConsumerGrantV14[]
}

export interface PluginRuntimeManifestV14 extends Omit<PluginRuntimeManifestV13, '$schema' | 'schemaVersion' | 'services'> {
  readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/plugin-manifest.v14.schema.json'
  readonly schemaVersion: 14
  readonly services: readonly (PluginRuntimeManifestV13['services'][number] | PluginManifestManagedBackendServiceV14)[]
}
