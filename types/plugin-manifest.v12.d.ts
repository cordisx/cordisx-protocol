import type { PluginRuntimeManifestV11 } from './plugin-manifest.v11.js'
import type { AgentTaskRequestCapabilityV1, AgentTaskAnswerCapabilityV1 } from './agent-task-permission.v1.js'
export * from './plugin-manifest.v11.js'
export interface PluginRuntimeManifestV12 extends Omit<PluginRuntimeManifestV11, '$schema' | 'schemaVersion' | 'capabilities'> {
  readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/plugin-manifest.v12.schema.json'
  readonly schemaVersion: 12
  readonly capabilities: readonly (PluginRuntimeManifestV11['capabilities'][number] | AgentTaskRequestCapabilityV1 | AgentTaskAnswerCapabilityV1)[]
}
