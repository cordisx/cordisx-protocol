import type { ChannelManagerV9 } from './channel-manager.v9.js'
import type { ChatExecutionSettingsV1 } from './chat-execution-settings.v1.js'
import type { PluginDocumentsV1 } from './plugin-documents.v1.js'
declare const manager: ChannelManagerV9
declare const target: HTMLElement
declare const signal: AbortSignal
manager.mountBindingExecutionForm('opaque', target, { signal })
manager.bindingDisplayPage({ connectionToken: 'opaque' }, signal)
const settings: ChatExecutionSettingsV1 = {
  execution: 'workspace-write',
  approval: 'never',
  workMode: 'plan',
  effort: 'low',
}
const docs: PluginDocumentsV1 = {
  contract: 'cordisx.plugin-documents/v1',
  documents: [{ id: 'usage', title: 'Usage', path: './docs/usage.md' }],
}
void [settings, docs]
// @ts-expect-error Frozen versions do not acquire successor methods.
const bad: ChatExecutionSettingsV1 = { approval: 'on-failure' }
void bad
