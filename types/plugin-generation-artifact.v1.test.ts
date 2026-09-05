import type {
  PluginGenerationArtifactV1,
  PluginGenerationAssetMediaTypeV1,
  PluginGenerationSharedImportV1,
} from './plugin-generation-artifact.v1.js'

const digest = 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as const
const artifact = {
  $schema:
    'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/plugin-generation-artifact.v1.schema.json',
  contract: 'cordisx.plugin-generation-artifact/v1',
  schemaVersion: 1,
  format: 'browser-esm-graph',
  entry: './module.js',
  initialStyles: ['./styles/entry.css'],
  sharedImports: ['cordisx/react', 'react-dom/client'],
  files: [
    {
      path: './module.js',
      kind: 'module',
      mediaType: 'text/javascript',
      digest,
      byteLength: 128,
      imports: ['./chunks/shared.js'],
      dynamicImports: ['./chunks/lazy.js'],
      styles: ['./styles/entry.css'],
      assets: [],
    },
    {
      path: './chunks/shared.js',
      kind: 'module',
      mediaType: 'text/javascript',
      digest,
      byteLength: 64,
      imports: [],
      dynamicImports: [],
      styles: [],
      assets: [],
    },
    {
      path: './chunks/lazy.js',
      kind: 'module',
      mediaType: 'text/javascript',
      digest,
      byteLength: 64,
      imports: ['./chunks/shared.js'],
      dynamicImports: [],
      styles: ['./styles/lazy.css'],
      assets: ['./images/icon.png'],
    },
    { path: './styles/entry.css', kind: 'stylesheet', mediaType: 'text/css', digest, byteLength: 32, assets: [] },
    {
      path: './styles/lazy.css',
      kind: 'stylesheet',
      mediaType: 'text/css',
      digest,
      byteLength: 32,
      assets: ['./fonts/body.woff2'],
    },
    { path: './images/icon.png', kind: 'asset', mediaType: 'image/png', digest, byteLength: 16 },
    { path: './fonts/body.woff2', kind: 'asset', mediaType: 'font/woff2', digest, byteLength: 16 },
  ],
} as const satisfies PluginGenerationArtifactV1

artifact.sharedImports[0] satisfies PluginGenerationSharedImportV1
artifact.files[5].mediaType satisfies PluginGenerationAssetMediaTypeV1

// @ts-expect-error Arbitrary bare imports are not Host-resolved shared modules.
const external: PluginGenerationSharedImportV1 = 'example-library'

// @ts-expect-error Script-like assets are modules, not static assets.
const scriptAsset: PluginGenerationAssetMediaTypeV1 = 'application/javascript'

void external
void scriptAsset
