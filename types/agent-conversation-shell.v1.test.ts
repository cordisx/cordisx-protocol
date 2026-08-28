import type { AgentConversationShellSource } from './agent-conversation-shell.v1.js'
declare const source: AgentConversationShellSource
const snapshot = await source.snapshot()
const result = await source.subscribe(-1)
if ('handle' in result) result.handle.unsubscribe()
source.dispose()
// @ts-expect-error draft stays Host-ephemeral
snapshot.composer.draft
// @ts-expect-error media is absent
snapshot.selection.avatar
