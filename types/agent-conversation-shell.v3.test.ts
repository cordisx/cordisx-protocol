import type {
  AgentConversationRoomDescription,
  AgentConversationRoomCollectionLeadingVisual,
  AgentConversationRoomCollectionParticipantRef,
  AgentConversationRoomSettingsPatch,
  AgentConversationRoomSettingsUpdateRequest,
  AgentConversationRoomSettingsUpdateResult,
  AgentConversationSelection,
  AgentConversationApprovalItem,
  AgentConversationMessageItem,
  AgentConversationShellSource
} from '@cordisx/protocol/agent-conversation-shell/v3'
import type { AgentAvatarRef } from '@cordisx/protocol/agent-avatar/v1'

declare const source: AgentConversationShellSource
declare const formalAvatar: AgentAvatarRef
const approvalCommandContext = { binding: { bindingId: 'shell-binding-1', ownerGeneration: 'owner-1' }, generation: 'shell-1', scope: 'approval', itemId: 'approval-item-1', command: { id: 'chatroom.approval.approve' } } satisfies import('@cordisx/protocol/agent-conversation-shell/v3').AgentConversationShellCommandContext
approvalCommandContext.scope satisfies 'approval'
const selfIntroductionAuthor = { participantId: 'agent-1', role: 'agent', displayName: { key: 'agent.one', fallback: 'Reviewer' }, agentIdentity: { agentId: 'reviewer', revision: 'definition-1' } } as const
const selfIntroductionMessage: AgentConversationMessageItem = {
  kind: 'message',
  itemId: 'message-item-introduction-1',
  messageId: 'message-introduction-1',
  sequence: 3,
  source: 'session-event',
  semantic: { purpose: 'member-self-introduction', correlation: { requestMessageId: 'message-request-1' }, participantId: selfIntroductionAuthor.participantId, memberId: 'member-1', sessionId: 'session-1' },
  author: selfIntroductionAuthor,
  body: [{ kind: 'text', text: { key: 'message.introduction', fallback: 'Hello, I am Reviewer.' } }],
  reactions: [],
  timestamp: '2026-08-31T00:00:01.000Z',
  deliveryState: 'delivered',
  runState: 'idle',
  ariaLive: 'polite',
  actions: []
}
const conversationMessage: AgentConversationMessageItem = { ...selfIntroductionMessage, messageId: 'message-conversation-1', semantic: { purpose: 'conversation' } }
const acknowledgementMessage: AgentConversationMessageItem = { ...conversationMessage, source: 'chatroom-acknowledgement', semantic: { purpose: 'chatroom-acknowledgement' } }
void selfIntroductionMessage
void conversationMessage
void acknowledgementMessage

const pendingApproval: AgentConversationApprovalItem = {
  kind: 'approval',
  itemId: 'approval-item-1',
  sequence: 2,
  participantId: 'agent-1',
  memberId: 'member-1',
  sessionId: 'session-1',
  turn: 1,
  approvalId: 'approval-1',
  approvalKind: 'command',
  state: 'pending',
  rationale: { key: 'approval.command', fallback: 'Allow this command?' },
  actions: [
    { decision: 'approve', command: { id: 'chatroom.approval.approve', arguments: { approvalId: 'approval-1' } } },
    { decision: 'deny', command: { id: 'chatroom.approval.deny', arguments: { approvalId: 'approval-1' } } }
  ]
}
pendingApproval.actions[0]?.decision satisfies 'approve' | 'deny' | 'cancel' | undefined
const failedApproval: AgentConversationApprovalItem = { ...pendingApproval, state: 'failed', actions: [], diagnostic: { key: 'approval.failed', fallback: 'Decision failed' } }
void failedApproval

const emptyDescription: AgentConversationRoomDescription = { state: 'empty' }
const presentDescription: AgentConversationRoomDescription = { state: 'present', text: { key: 'room.description', fallback: 'A room for protocol work' } }
const roomParticipantVisual: AgentConversationRoomCollectionParticipantRef = {
  participantId: 'agent-1',
  avatar: formalAvatar
}
const newRoomVisual: AgentConversationRoomCollectionLeadingVisual = { kind: 'semantic-icon', icon: 'host:action.add' }
const roomCompositeVisual: AgentConversationRoomCollectionLeadingVisual = {
  kind: 'room-composite-avatar',
  roomId: 'room-1',
  participants: [roomParticipantVisual]
}
newRoomVisual.icon satisfies `host:${string}`
if (roomCompositeVisual.kind === 'room-composite-avatar') roomCompositeVisual.participants[0]?.avatar.kind satisfies 'generated' | 'asset' | 'definition' | 'platform' | undefined
const selection: AgentConversationSelection = {
  kind: 'room',
  roomId: 'room-1',
  title: { key: 'room.name', fallback: 'Protocol room' },
  description: emptyDescription,
  multiParticipant: true,
  participantPresentation: 'host-initials',
  participants: []
}
if (selection.kind === 'room' && selection.description?.state === 'present') selection.description.text.fallback satisfies string
void presentDescription
void newRoomVisual
void roomCompositeVisual

const namePatch: AgentConversationRoomSettingsPatch = { name: 'Updated room' }
const clearDescriptionPatch: AgentConversationRoomSettingsPatch = { description: { state: 'empty' } }
const replaceDescriptionPatch: AgentConversationRoomSettingsPatch = { name: 'Updated room', description: { state: 'present', text: 'New introduction' } }
void namePatch
void clearDescriptionPatch
void replaceDescriptionPatch

const request: AgentConversationRoomSettingsUpdateRequest = {
  requestId: 'settings-1',
  binding: { bindingId: 'binding-1', ownerGeneration: 'owner-1' },
  generation: 'shell-1',
  roomId: 'room-1',
  expectedSnapshotSequence: 12,
  patch: replaceDescriptionPatch
}
const mutation = await source.updateRoomSettings(request)
mutation.type satisfies 'update-room-settings'
mutation.requestId satisfies string
mutation.binding.ownerGeneration satisfies string
mutation.generation satisfies string
mutation.roomId satisfies string
mutation.expectedSnapshotSequence satisfies number
if (mutation.status === 'applied') {
  mutation.code satisfies 'applied'
  mutation.snapshotSequence satisfies number
}
if (mutation.status === 'conflict') {
  mutation.code satisfies 'request-conflict' | 'owner-conflict' | 'generation-conflict' | 'room-conflict' | 'snapshot-conflict'
  // @ts-expect-error conflict never reports an applied snapshot
  mutation.snapshotSequence satisfies number
}
if (mutation.status === 'unavailable') {
  mutation.code satisfies 'owner-unavailable' | 'settings-unavailable' | 'disposed'
}

const applied: AgentConversationRoomSettingsUpdateResult = {
  type: 'update-room-settings',
  requestId: request.requestId,
  binding: request.binding,
  generation: request.generation,
  roomId: request.roomId,
  expectedSnapshotSequence: request.expectedSnapshotSequence,
  status: 'applied',
  code: 'applied',
  snapshotSequence: 13
}
void applied

// @ts-expect-error settings patch must mutate at least one field
const emptyPatch: AgentConversationRoomSettingsPatch = {}
void emptyPatch
// @ts-expect-error mutation description present state requires plain text
const localizedMutationDescription: AgentConversationRoomSettingsPatch = { description: { state: 'present', text: { key: 'room.description', fallback: 'Description' } } }
void localizedMutationDescription
// @ts-expect-error selected Room descriptions use localized presentation, not mutation text
const plainSelectionDescription: AgentConversationRoomDescription = { state: 'present', text: 'Description' }
void plainSelectionDescription
// @ts-expect-error settings mutation cannot carry callbacks
const callbackPatch: AgentConversationRoomSettingsPatch = { name: 'Room', callback: () => undefined }
void callbackPatch
// @ts-expect-error settings mutation cannot carry storage or route data
const storagePatch: AgentConversationRoomSettingsPatch = { name: 'Room', storageKey: 'rooms/room-1' }
void storagePatch
// @ts-expect-error collection participant visuals require a formal AgentAvatarRef
const rawAvatarVisual: AgentConversationRoomCollectionLeadingVisual = { kind: 'room-composite-avatar', roomId: 'room-1', participants: [{ participantId: 'agent-1', avatar: '/avatars/agent.png' }] }
void rawAvatarVisual
// @ts-expect-error collection visual payloads cannot carry callbacks
const callbackVisual: AgentConversationRoomCollectionLeadingVisual = { kind: 'semantic-icon', icon: 'host:action.add', onClick: () => undefined }
void callbackVisual
// @ts-expect-error pending approvals require at least one Host command action
const actionlessPendingApproval: AgentConversationApprovalItem = { ...pendingApproval, actions: [] }
void actionlessPendingApproval
// @ts-expect-error terminal approvals cannot retain commands
const actionableTerminalApproval: AgentConversationApprovalItem = { ...pendingApproval, state: 'approved' }
void actionableTerminalApproval
// @ts-expect-error failed approvals require a diagnostic
const undiagnosedFailedApproval: AgentConversationApprovalItem = { ...pendingApproval, state: 'failed', actions: [] }
void undiagnosedFailedApproval
// @ts-expect-error approval actions are structured commands, never callbacks
const callbackApproval: AgentConversationApprovalItem = { ...pendingApproval, actions: [{ decision: 'approve', command: { id: 'chatroom.approval.approve' }, callback: () => undefined }] }
void callbackApproval
// @ts-expect-error every v3 message requires semantic provenance
const semanticlessMessage: AgentConversationMessageItem = { ...conversationMessage, semantic: undefined }
void semanticlessMessage
// @ts-expect-error acknowledgements cannot claim Session-backed conversation semantics
const mismatchedAcknowledgement: AgentConversationMessageItem = { ...acknowledgementMessage, semantic: { purpose: 'conversation' } }
void mismatchedAcknowledgement
// @ts-expect-error self-introduction messages must be authored by an Agent
const humanIntroduction: AgentConversationMessageItem = { ...selfIntroductionMessage, author: { participantId: 'human-1', role: 'human', displayName: { key: 'human.one', fallback: 'Human' } } }
void humanIntroduction
