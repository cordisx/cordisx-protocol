import type { PluginRuntimeManifestV12 } from './plugin-manifest.v12.js'

export * from './plugin-manifest.v12.js'

export type PluginManifestRuntimeExactCapabilityNameV13 =
  | 'tasks.content.read'
  | 'tasks.create'
  | 'tasks.control'
  | 'turns.submit'
  | 'turns.control'

export interface PluginManifestRuntimeExactRequestScopeV13 {
  readonly runtime: 'exact-request'
}

export interface PluginManifestRuntimeExactCapabilityDeclarationV13 {
  readonly name: PluginManifestRuntimeExactCapabilityNameV13
  readonly required: false
  readonly scope: PluginManifestRuntimeExactRequestScopeV13
}

export interface PluginRuntimeManifestV13
  extends Omit<PluginRuntimeManifestV12, '$schema' | 'schemaVersion' | 'capabilities'> {
  readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/plugin-manifest.v13.schema.json'
  readonly schemaVersion: 13
  readonly capabilities: readonly (
    | PluginRuntimeManifestV12['capabilities'][number]
    | PluginManifestRuntimeExactCapabilityDeclarationV13
  )[]
}
