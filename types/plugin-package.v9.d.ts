import type { PluginRuntimeManifestV9 } from './plugin-manifest.v9.js'
import type { PluginRuntimeManifestV8 } from './plugin-manifest.v8.js'
import type { EntityTemplateDeclaration } from './entities.v1.js'

export * from './plugin-package.v8.js'

export type PluginRuntimeManifestSchemaForPackageV9 =
  | 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/plugin-manifest.v1.schema.json'
  | 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/plugin-manifest.v2.schema.json'
  | 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/plugin-manifest.v3.schema.json'
  | 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/plugin-manifest.v4.schema.json'
  | 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/plugin-manifest.v5.schema.json'
  | 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/plugin-manifest.v8.schema.json'
  | 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/plugin-manifest.v9.schema.json'

export type LegacyPluginRuntimeManifestForPackageV9 = Readonly<Record<string, unknown>> & (
  | {
    readonly $schema:
      'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/plugin-manifest.v1.schema.json'
    readonly schemaVersion: 1
  }
  | {
    readonly $schema:
      'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/plugin-manifest.v2.schema.json'
    readonly schemaVersion: 2
  }
  | {
    readonly $schema:
      'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/plugin-manifest.v3.schema.json'
    readonly schemaVersion: 3
  }
  | {
    readonly $schema:
      'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/plugin-manifest.v4.schema.json'
    readonly schemaVersion: 4
  }
  | {
    readonly $schema:
      'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/plugin-manifest.v5.schema.json'
    readonly schemaVersion: 5
  }
)

/** Explicit local package whose runtime manifest may use plugin-manifest/v9. */
export interface PluginRuntimePackageV9 {
  readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/plugin-package.v9.schema.json'
  readonly schemaVersion: 9
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
    readonly schema: PluginRuntimeManifestSchemaForPackageV9
    readonly digest: `sha256:${string}`
  }
  readonly entityTemplates?: readonly EntityTemplateDeclaration[]
}

export type PluginRuntimeManifestForPackageV9 =
  | LegacyPluginRuntimeManifestForPackageV9
  | PluginRuntimeManifestV8
  | PluginRuntimeManifestV9
