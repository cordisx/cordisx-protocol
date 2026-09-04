import type { PluginRuntimeManifestV8 } from './plugin-manifest.v8.js'

/** Explicit local package whose runtime manifest is exactly plugin-manifest/v8. */
export interface PluginRuntimePackageV8 {
  readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/plugin-package.v8.schema.json'
  readonly schemaVersion: 8
  readonly id: string
  readonly version: string
  readonly entry: string
  readonly readme?: string
  readonly canonicalSource?: string
  readonly distribution: { readonly mode: 'explicit-local-v1'; readonly signature: 'unsupported' }
  readonly compatibility: { readonly runtimeAbi: number; readonly protocolSchemas: readonly string[] }
  readonly dependencies: readonly { readonly id: string; readonly range: string }[]
  readonly runtimeManifest: {
    readonly path: string
    readonly schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/plugin-manifest.v8.schema.json'
    readonly digest: `sha256:${string}`
  }
}

export type PluginRuntimeManifestForPackageV8 = PluginRuntimeManifestV8
