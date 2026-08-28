import type { AgentConversationShellHost, AgentConversationShellSource } from './agent-conversation-shell.v1.js'
declare const source: AgentConversationShellSource
declare const host: AgentConversationShellHost
const bound = await host.bind({ requestId: 'request-1', ownerGeneration: 'generation-1', routeSelection: { scope: 'room-or-new' } })
if (bound.status === 'accepted') bound.binding.shell satisfies 'agent-desktop'
if (bound.status === 'denied') bound.code satisfies 'policy-denied'
const snapshot = await source.snapshot()
const result = await source.subscribe(-1)
if ('handle' in result) for await (const page of result.handle.pages) page.updates[0]?.kind satisfies 'snapshot-replaced' | 'item-appended' | 'item-updated' | 'disposed' | undefined
source.dispose()
// @ts-expect-error draft stays Host-ephemeral
snapshot.composer.draft
// @ts-expect-error media is absent
snapshot.selection.avatar
// @ts-expect-error submit payload only exists in Host-generated command context
snapshot.composer.submitPayload
