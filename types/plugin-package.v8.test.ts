import type { PluginRuntimePackageV8 } from './plugin-package.v8.js'
const manifestSchema = 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/plugin-manifest.v8.schema.json' as const
const packageDocument = { $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/plugin-package.v8.schema.json', schemaVersion: 8, id: 'chatroom', version: '1.0.0', entry: './index.mjs', distribution: { mode: 'explicit-local-v1', signature: 'unsupported' }, compatibility: { runtimeAbi: 1, protocolSchemas: [manifestSchema] }, dependencies: [], runtimeManifest: { path: './runtime.json', schema: manifestSchema, digest: `sha256:${'1'.repeat(64)}` } } satisfies PluginRuntimePackageV8
packageDocument.compatibility.protocolSchemas[0] satisfies string
