import type {
  PluginManifestManagedBackendRuntimeResourceV14,
  PluginManifestManagedBackendServiceV14,
  PluginRuntimeManifestV14,
} from './plugin-manifest.v14.js'

const resource: PluginManifestManagedBackendRuntimeResourceV14 = {
  path: './schemas/managed-service-definition.v1.schema.json',
  mode: 'data',
  digest: 'sha256:0000000000000000000000000000000000000000000000000000000000000000',
  byteLength: 1,
}
void resource

const svc: PluginManifestManagedBackendServiceV14 = {
  id: 'cli-proxy',
  kind: 'managed-backend',
  owner: 'host',
  entry: './dist/cli-proxy.mjs',
  definitionSchema:
    'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/managed-service-definition.v1.schema.json',
  runtimeResources: [resource],
  consumerGrants: [{ pluginId: 'plugin-codex-host', operations: ['invoke.models'] }],
}
void svc

declare const m: PluginRuntimeManifestV14
m.schemaVersion === 14
// @ts-expect-error services includes host-owned entries with kind 'managed-backend'
m.services[0]!.kind === 'channel-adapter'
