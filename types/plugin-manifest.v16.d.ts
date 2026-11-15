import type { PluginRuntimeManifestV15 } from './plugin-manifest.v15.js'
import type { StartupDeclarationV1 } from './startup.v1.js'
export * from './plugin-manifest.v15.js'

export type PluginManifestChannelExactCapabilityNameV16 = 'channel.accounts.connect' | 'channel.bindings.write'

/** An optional request declaration, never an account wildcard or a persisted scope. */
export interface PluginManifestChannelExactCapabilityDeclarationV16 {
  readonly name: PluginManifestChannelExactCapabilityNameV16
  readonly required: false
  readonly scope: { readonly runtime: 'exact-request' }
}

export interface PluginRuntimeManifestV16
  extends Omit<PluginRuntimeManifestV15, '$schema' | 'schemaVersion' | 'capabilities' | 'startup'> {
  readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/plugin-manifest.v16.schema.json'
  readonly schemaVersion: 16
  readonly capabilities: readonly (
    | PluginRuntimeManifestV15['capabilities'][number]
    | PluginManifestChannelExactCapabilityDeclarationV16
  )[]
  /** Progressive startup remains opt-in. An ordinary Channel service needs no startup plan. */
  readonly startup?: StartupDeclarationV1
}
