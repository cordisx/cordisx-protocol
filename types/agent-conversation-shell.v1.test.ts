import type {
  AgentConversationParticipant,
  AgentConversationShellCommandContext,
  AgentConversationShellHost,
  AgentConversationShellSource,
} from '@cordisx/protocol/agent-conversation-shell/v1'
import { cloneAgentAvatarRef } from '@cordisx/protocol/agent-avatar/v1'
declare const source: AgentConversationShellSource
declare const host: AgentConversationShellHost
const bound = await host.bind({
  requestId: 'request-1',
  ownerGeneration: 'generation-1',
  routeSelection: { scope: 'room-or-new' },
})
if (bound.status === 'accepted') bound.binding.shell satisfies 'agent-desktop'
if (bound.status === 'denied') bound.code satisfies 'policy-denied'
if (bound.status === 'unavailable') bound.code satisfies 'owner-unavailable' | 'generation-replaced' | 'disposed'
const snapshot = await source.snapshot()
const result = await source.subscribe(-1)
if ('handle' in result) {
  result.handle.unsubscribe()
  for await (const page of result.handle.pages) {
    page.updates[0]?.kind satisfies 'snapshot-replaced' | 'item-appended' | 'item-updated' | 'disposed' | undefined
  }
}
if (result.result.status === 'denied') result.result.code satisfies 'policy-denied'
if (result.result.status === 'unavailable') {
  result.result.code satisfies 'owner-unavailable' | 'generation-replaced' | 'disposed'
}
const context: AgentConversationShellCommandContext = {
  binding: { bindingId: 'binding-1', ownerGeneration: 'generation-1' },
  generation: 'generation-1',
  scope: 'composer-submit',
  command: { id: 'chatroom:submit' },
  submitPayload: 'hello',
}
context.submitPayload satisfies string
const participant: AgentConversationParticipant = {
  participantId: 'agent-1',
  role: 'agent',
  displayName: { key: 'agent.name', fallback: 'Agent' },
  avatar: cloneAgentAvatarRef({ kind: 'asset', ref: 'asset:avatar-1', revision: 'revision:avatar-1' }),
}
if (participant.avatar) participant.avatar.kind satisfies 'generated' | 'asset' | 'definition' | 'platform'
source.dispose()
// @ts-expect-error draft stays Host-ephemeral
snapshot.composer.draft
// @ts-expect-error media is absent
snapshot.selection.avatar
// @ts-expect-error avatars belong to participant identity, not timeline items
snapshot.items[0]!.avatar
// @ts-expect-error submit payload only exists in Host-generated command context
snapshot.composer.submitPayload
