/** Installed-package compile witness for the v16 successor, kept out of the generic distribution runner. */
export const channelExactConsumerFixture = `
import type { PluginRuntimeManifestV16 } from '@cordisx/protocol/plugin-manifest/v16'
import type { PluginRuntimePackageV16 } from '@cordisx/protocol/plugin-package/v16'
const channelManifestV16 = { $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/plugin-manifest.v16.schema.json', schemaVersion: 16, id: 'channel', capabilities: [{ name: 'channel.accounts.connect', required: false, scope: { runtime: 'exact-request' } }], services: [] } satisfies PluginRuntimeManifestV16
const channelPackageV16 = { $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/plugin-package.v16.schema.json', schemaVersion: 16, id: 'channel', version: '0.1.1', entry: './dist/channel.js', distribution: { mode: 'explicit-local-v1', signature: 'unsupported' }, compatibility: { runtimeAbi: 1, protocolSchemas: [channelManifestV16.$schema] }, dependencies: [], runtimeManifest: { path: './runtime-manifest.json', schema: channelManifestV16.$schema, digest: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' } } satisfies PluginRuntimePackageV16
void channelPackageV16
`
