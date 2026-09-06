import type { PluginManifestPlatformProviderServiceV9, PluginRuntimeManifestV9 } from './plugin-manifest.v9.js'

const providerService = {
  id: 'providers-runtime',
  kind: 'platform-provider',
  owner: 'host',
  schema:
    'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/cli-proxy-provider-runtime-config.v1.schema.json',
  applicationMode: 'service-restart',
  entry: './services/providers-runtime.mjs',
} satisfies PluginManifestPlatformProviderServiceV9

const manifest = {
  $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/plugin-manifest.v9.schema.json',
  schemaVersion: 9,
  id: 'cli-proxy-api',
  capabilities: [],
  services: [providerService],
} satisfies PluginRuntimeManifestV9

manifest.services[0].kind satisfies 'platform-provider'
providerService.owner satisfies 'host'
