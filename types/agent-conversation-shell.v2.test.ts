import type { AgentConversationActiveRunDescriptor, AgentConversationItem, AgentConversationMemberPresenceItem, AgentConversationParticipant, AgentConversationReaction, AgentConversationShellCommandContext, AgentConversationShellHost, AgentConversationShellSource, CommandReference } from '@cordisx/protocol/agent-conversation-shell/v2'
import { cloneAgentAvatarRef } from '@cordisx/protocol/agent-avatar/v1'

declare const source: AgentConversationShellSource
declare const host: AgentConversationShellHost
const bound = await host.bind({ requestId: 'request-1', ownerGeneration: 'generation-1', routeSelection: { scope: 'room-or-new' } })
if (bound.status === 'accepted') bound.binding.shell satisfies 'agent-desktop'
if (bound.status === 'denied') bound.code satisfies 'policy-denied'
if (bound.status === 'unavailable') bound.code satisfies 'owner-unavailable' | 'generation-replaced' | 'disposed'
const snapshot = await source.snapshot()
const result = await source.subscribe(-1)
if ('handle' in result) { result.handle.unsubscribe(); for await (const page of result.handle.pages) page.updates[0]?.kind satisfies 'snapshot-replaced' | 'item-appended' | 'item-updated' | 'disposed' | undefined }
if (result.result.status === 'denied') result.result.code satisfies 'policy-denied'
if (result.result.status === 'unavailable') result.result.code satisfies 'owner-unavailable' | 'generation-replaced' | 'disposed'
const context: AgentConversationShellCommandContext = { binding: { bindingId: 'binding-1', ownerGeneration: 'generation-1' }, generation: 'generation-1', scope: 'composer-submit', command: { id: 'chatroom:submit' }, submitPayload: 'hello' }
context.submitPayload satisfies string
const participant: AgentConversationParticipant = { participantId: 'agent-1', role: 'agent', displayName: { key: 'agent.name', fallback: 'Agent' }, avatar: cloneAgentAvatarRef({ kind: 'asset', ref: 'asset:avatar-1', revision: 'revision:avatar-1' }), agentIdentity: { agentId: 'reviewer', revision: 'definition-4' } }
if (participant.avatar) participant.avatar.kind satisfies 'generated' | 'asset' | 'definition' | 'platform'
participant.agentIdentity?.agentId satisfies string | undefined
const activeRun: AgentConversationActiveRunDescriptor = { participantId: participant.participantId, memberId: 'member-1', sessionId: 'session-1', lifecycle: { phase: 'running', updatedAt: '2026-08-31T01:00:00.000Z' }, details: { kind: 'host', ref: 'task-1' } }
activeRun.details?.kind satisfies 'host' | undefined
const reaction: AgentConversationReaction = { reactionId: 'reaction-1', actorParticipantId: participant.participantId, value: { kind: 'emoji', emoji: '👍' }, state: 'completed' }
const message: AgentConversationItem = { kind: 'message', itemId: 'item-1', messageId: 'message-1', sequence: 0, source: 'session-event', author: participant, body: [{ kind: 'text', text: { key: 'message.one', fallback: 'Done' } }], reactions: [reaction], timestamp: '2026-08-31T01:00:00.000Z', deliveryState: 'delivered', runState: 'idle', ariaLive: 'polite', actions: [] }
const presence: AgentConversationMemberPresenceItem = { kind: 'member-presence', itemId: 'presence-1', sequence: 1, participantId: participant.participantId, memberId: 'member-1', sessionId: 'session-1', state: 'failed', retryable: true, diagnostic: { key: 'presence.failed', fallback: 'Agent failed to join' }, retry: { id: 'chatroom:retry-member', arguments: { memberId: 'member-1', sessionId: 'session-1' } } }
void message
void presence
source.dispose()
// @ts-expect-error draft stays Host-ephemeral
snapshot.composer.draft
// @ts-expect-error media is absent
snapshot.selection.avatar
// @ts-expect-error avatars belong to participant identity, not timeline items
snapshot.items[0]!.avatar
// @ts-expect-error active runs belong to the room snapshot, not a participant or message author
participant.activeRuns
// @ts-expect-error human/system participants cannot assert an Agent Definition identity
const humanAgentIdentity: AgentConversationParticipant = { participantId: 'human-1', role: 'human', displayName: { key: 'human.name', fallback: 'Human' }, agentIdentity: { agentId: 'reviewer', revision: 'definition-4' } }
void humanAgentIdentity
// @ts-expect-error Host shell active runs do not expose private runtime bindings
const leakedBinding: AgentConversationActiveRunDescriptor = { ...activeRun, taskDetails: { bindingId: 'binding-private', generation: 1 } }
void leakedBinding
// @ts-expect-error message source is a closed union
const invalidMessageSource: AgentConversationItem = { ...message, source: 'connector' }
void invalidMessageSource
// @ts-expect-error retry commands require failed and retryable presence
const invalidPresenceRetry: AgentConversationMemberPresenceItem = { ...presence, state: 'creating', retryable: true, retry: { id: 'chatroom:retry-member' } }
void invalidPresenceRetry
// @ts-expect-error command arguments are JSON data and cannot carry callbacks
const callbackCommand: CommandReference = { id: 'chatroom:retry-member', arguments: { callback: () => undefined } }
void callbackCommand
// @ts-expect-error submit payload only exists in Host-generated command context
snapshot.composer.submitPayload
