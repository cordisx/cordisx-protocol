import type {
  PluginManifestRuntimeExactCapabilityDeclarationV13,
  PluginRuntimeManifestV13,
} from './plugin-manifest.v13.js'
import type { PluginRuntimeManifestForPackageV13, PluginRuntimePackageV13 } from './plugin-package.v13.js'
import type { AgentTaskRequestCapabilityV1 } from './agent-task-permission.v1.js'

const exactCreate = {
  name: 'tasks.create',
  required: false,
  scope: { runtime: 'exact-request' },
} satisfies PluginManifestRuntimeExactCapabilityDeclarationV13

const taskApproval = {
  name: 'approvals.request',
  required: false,
  scope: { task: { kind: 'agent-task-command', commandId: 'create-provider-task' } },
} satisfies AgentTaskRequestCapabilityV1

const manifest = {
  $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/plugin-manifest.v13.schema.json',
  schemaVersion: 13,
  id: 'cli-proxy-api',
  capabilities: [taskApproval, exactCreate],
  services: [],
} satisfies PluginRuntimeManifestV13

const packageManifest = {
  $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/plugin-package.v13.schema.json',
  schemaVersion: 13,
  id: 'cli-proxy-api',
  version: '0.1.0',
  entry: './dist/runtime/module.js',
  distribution: { mode: 'explicit-local-v1', signature: 'unsupported' },
  compatibility: {
    runtimeAbi: 1,
    protocolSchemas: [
      'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/plugin-manifest.v13.schema.json',
    ],
  },
  dependencies: [],
  runtimeManifest: {
    path: './runtime-manifest.json',
    schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/plugin-manifest.v13.schema.json',
    digest: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  },
} satisfies PluginRuntimePackageV13

manifest satisfies PluginRuntimeManifestForPackageV13
packageManifest.runtimeManifest
  .schema satisfies 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/plugin-manifest.v13.schema.json'

const requiredExactRequest = {
  name: 'tasks.control',
  // @ts-expect-error exact-request declarations cannot block activation
  required: true,
  scope: { runtime: 'exact-request' },
} satisfies PluginManifestRuntimeExactCapabilityDeclarationV13
void requiredExactRequest

const unsupportedExactRequest = {
  // @ts-expect-error catalog reads retain their existing static scope contract
  name: 'tasks.catalog.read',
  required: false,
  scope: { runtime: 'exact-request' },
} satisfies PluginManifestRuntimeExactCapabilityDeclarationV13
void unsupportedExactRequest
