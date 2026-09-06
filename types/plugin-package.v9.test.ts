import type { PluginRuntimeManifestForPackageV9, PluginRuntimePackageV9 } from './plugin-package.v9.js'

const packageManifest = {
  $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/plugin-package.v9.schema.json',
  schemaVersion: 9,
  id: 'cli-proxy-api',
  version: '0.1.0',
  entry: './dist/runtime/module.js',
  distribution: { mode: 'explicit-local-v1', signature: 'unsupported' },
  compatibility: {
    runtimeAbi: 1,
    protocolSchemas: [
      'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/plugin-manifest.v9.schema.json',
    ],
  },
  dependencies: [],
  runtimeManifest: {
    path: './runtime-manifest.json',
    schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/plugin-manifest.v9.schema.json',
    digest: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  },
  entityTemplates: [{
    agentId: 'cli-proxy.helper',
    entityPath: './entities/cli-proxy.helper/entity.json',
    digest: 'sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
  }],
} satisfies PluginRuntimePackageV9

packageManifest.runtimeManifest
  .schema satisfies 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/plugin-manifest.v9.schema.json'
packageManifest.entityTemplates[0].entityPath satisfies `./entities/${string}/entity.json`

const v8Package = {
  ...packageManifest,
  runtimeManifest: {
    ...packageManifest.runtimeManifest,
    schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/plugin-manifest.v8.schema.json',
  },
} satisfies PluginRuntimePackageV9

const v8Manifest = {
  $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/plugin-manifest.v8.schema.json',
  schemaVersion: 8,
  id: 'chatroom',
  capabilities: [],
  services: [],
} satisfies PluginRuntimeManifestForPackageV9

v8Package.runtimeManifest
  .schema satisfies 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/plugin-manifest.v8.schema.json'
v8Manifest.schemaVersion satisfies 8
