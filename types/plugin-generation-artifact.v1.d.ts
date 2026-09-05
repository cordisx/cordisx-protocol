export type PluginGenerationSharedImportV1 =
  | 'cordisx/contracts'
  | 'cordisx/react'
  | 'cordisx/react/jsx-dev-runtime'
  | 'cordisx/react/jsx-runtime'
  | 'cordisx/ui'
  | 'react'
  | 'react/jsx-dev-runtime'
  | 'react/jsx-runtime'
  | 'react-dom'
  | 'react-dom/client'

export type PluginGenerationAssetMediaTypeV1 =
  | 'application/wasm'
  | 'font/woff'
  | 'font/woff2'
  | 'image/avif'
  | 'image/gif'
  | 'image/jpeg'
  | 'image/png'
  | 'image/svg+xml'
  | 'image/webp'

export interface PluginGenerationModuleFileV1 {
  readonly path: string
  readonly kind: 'module'
  readonly mediaType: 'text/javascript'
  readonly digest: `sha256:${string}`
  readonly byteLength: number
  /** Artifact-root logical paths of statically imported modules. */
  readonly imports: readonly string[]
  /** Artifact-root logical paths of dynamically imported modules. */
  readonly dynamicImports: readonly string[]
  /** Artifact-root logical paths of styles required when this module evaluates. */
  readonly styles: readonly string[]
  /** Artifact-root logical paths of assets referenced directly by this module. */
  readonly assets: readonly string[]
}

export interface PluginGenerationStylesheetFileV1 {
  readonly path: string
  readonly kind: 'stylesheet'
  readonly mediaType: 'text/css'
  readonly digest: `sha256:${string}`
  readonly byteLength: number
  /** Artifact-root logical paths of assets referenced by this stylesheet. */
  readonly assets: readonly string[]
}

export interface PluginGenerationAssetFileV1 {
  readonly path: string
  readonly kind: 'asset'
  readonly mediaType: PluginGenerationAssetMediaTypeV1
  readonly digest: `sha256:${string}`
  readonly byteLength: number
}

export type PluginGenerationFileV1 =
  | PluginGenerationModuleFileV1
  | PluginGenerationStylesheetFileV1
  | PluginGenerationAssetFileV1

/** Immutable, path-confined browser ESM graph for one plugin module generation. */
export interface PluginGenerationArtifactV1 {
  readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/plugin-generation-artifact.v1.schema.json'
  readonly contract: 'cordisx.plugin-generation-artifact/v1'
  readonly schemaVersion: 1
  readonly format: 'browser-esm-graph'
  readonly entry: string
  /** Styles in the entry's transitive static-import closure. */
  readonly initialStyles: readonly string[]
  /** Exact closed Host-resolved bare specifiers used by the emitted modules. */
  readonly sharedImports: readonly PluginGenerationSharedImportV1[]
  readonly files: readonly PluginGenerationFileV1[]
}
