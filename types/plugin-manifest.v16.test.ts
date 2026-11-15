import type {
  PluginManifestChannelExactCapabilityDeclarationV16,
  PluginRuntimeManifestV16,
} from './plugin-manifest.v16.js'
import type { PluginRuntimeManifestForPackageV16, PluginRuntimePackageV16 } from './plugin-package.v16.js'

const exact = {
  name: 'channel.accounts.connect',
  required: false,
  scope: { runtime: 'exact-request' },
} satisfies PluginManifestChannelExactCapabilityDeclarationV16
const manifest = {
  $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/plugin-manifest.v16.schema.json',
  schemaVersion: 16,
  id: 'channel',
  capabilities: [exact],
  services: [],
} satisfies PluginRuntimeManifestV16
manifest satisfies PluginRuntimeManifestForPackageV16
const descriptor = {
  $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/plugin-package.v16.schema.json',
  schemaVersion: 16,
  id: 'channel',
  version: '0.1.1',
  entry: './dist/channel.js',
  distribution: { mode: 'explicit-local-v1', signature: 'unsupported' },
  compatibility: { runtimeAbi: 1, protocolSchemas: [manifest.$schema] },
  dependencies: [],
  runtimeManifest: {
    path: './runtime-manifest.json',
    schema: manifest.$schema,
    digest: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  },
} satisfies PluginRuntimePackageV16
void descriptor

const invalid = {
  // @ts-expect-error receive is not added to exact Channel writes
  name: 'channel.events.receive',
  // @ts-expect-error an unresolved exact request cannot block activation
  required: true,
  scope: { runtime: 'exact-request' },
} satisfies PluginManifestChannelExactCapabilityDeclarationV16
void invalid
