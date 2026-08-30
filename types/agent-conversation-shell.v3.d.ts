import type { AgentAvatarRef } from './agent-avatar.v1.js'
import type { AgentDefinitionIdentity, AgentLoopBindingIdentity, AgentLoopTaskDetailsUrl } from './agent-loop.v3.js'

export interface LocalizedText { key: string; fallback: string; namespace?: string }
export type JsonValue = string | number | boolean | null | readonly JsonValue[] | { readonly [key: string]: JsonValue }
export interface CommandReference { id: string; arguments?: JsonValue }
export interface Disabled { value: boolean; reason?: LocalizedText }
export interface AgentConversationShellBinding { bindingId: string; shell: 'agent-desktop'; ownerGeneration: string; routeSelection: { scope: 'room-or-new'; selectedRoomParam?: string } }
export type AgentConversationParticipant =
  | { participantId: string; role: 'human' | 'system'; displayName: LocalizedText; avatar?: AgentAvatarRef; agentIdentity?: never }
  | { participantId: string; role: 'agent'; displayName: LocalizedText; avatar?: AgentAvatarRef; agentIdentity?: AgentDefinitionIdentity }
export interface AgentConversationActiveRunDescriptor { participantId: string; memberId: string; runId: string; lifecycle: { phase: 'active' | 'running' | 'waiting' | 'attention'; updatedAt?: string }; detailsUrl: AgentLoopTaskDetailsUrl }
export interface AgentConversationAction { id: string; label: LocalizedText; icon?: `host:${string}`; command: CommandReference; disabled: Disabled }
export type AgentConversationReactionValue =
  | { kind: 'emoji'; emoji: string }
  | { kind: 'semantic'; token: string }
export interface AgentConversationReaction { reactionId: string; actorParticipantId: string; value: AgentConversationReactionValue; state: 'pending' | 'completed' | 'failed' }
type AgentConversationMemberPresenceBase = { kind: 'member-presence'; itemId: string; sequence: number; participantId: string; memberId: string; runId: string; diagnostic?: LocalizedText }
export type AgentConversationMemberPresenceItem =
  | (AgentConversationMemberPresenceBase & { state: 'inviting' | 'creating' | 'joined' | 'ready'; retryable: boolean; retry?: never })
  | (AgentConversationMemberPresenceBase & { state: 'failed'; retryable: false; retry?: never })
  | (AgentConversationMemberPresenceBase & { state: 'failed'; retryable: true; retry?: CommandReference })
export interface AgentConversationApprovalAction {
  decision: 'approve' | 'deny' | 'cancel'
  command: CommandReference
}
type AgentConversationPendingApprovalActions =
  | readonly [AgentConversationApprovalAction]
  | readonly [AgentConversationApprovalAction, AgentConversationApprovalAction]
  | readonly [AgentConversationApprovalAction, AgentConversationApprovalAction, AgentConversationApprovalAction]
type AgentConversationApprovalItemBase = {
  kind: 'approval'
  itemId: string
  sequence: number
  participantId: string
  memberId: string
  runId: string
  binding: AgentLoopBindingIdentity
  turn: string
  approvalId: string
  approvalKind: 'command' | 'file-change' | 'external-action' | 'other'
  rationale?: LocalizedText
}
export type AgentConversationApprovalItem =
  | (AgentConversationApprovalItemBase & { state: 'pending'; actions: AgentConversationPendingApprovalActions; diagnostic?: never })
  | (AgentConversationApprovalItemBase & { state: 'approved' | 'denied' | 'cancelled'; actions: readonly []; diagnostic?: never })
  | (AgentConversationApprovalItemBase & { state: 'failed'; actions: readonly []; diagnostic: LocalizedText })
type AgentConversationMessageItemBase = {
  kind: 'message'
  itemId: string
  messageId: string
  sequence: number
  body: readonly [{ kind: 'text'; text: LocalizedText }, ...{ kind: 'text'; text: LocalizedText }[]]
  reactions: readonly AgentConversationReaction[]
  timestamp: string
  deliveryState: 'pending' | 'sent' | 'delivered' | 'failed'
  runState: 'idle' | 'running' | 'stopped' | 'failed'
  ariaLive: 'off' | 'polite'
  actions: readonly AgentConversationAction[]
}
export type AgentConversationMessageSemantic =
  | { purpose: 'conversation'; causation?: { operationId: string } }
  | { purpose: 'member-self-introduction'; causation: { operationId: string }; participantId: string; memberId: string; runId: string; binding: AgentLoopBindingIdentity; turn: string }
  | { purpose: 'chatroom-acknowledgement' }
export type AgentConversationMessageItem =
  | (AgentConversationMessageItemBase & { source: 'agent-loop'; author: AgentConversationParticipant; semantic: Extract<AgentConversationMessageSemantic, { purpose: 'conversation' }> })
  | (AgentConversationMessageItemBase & { source: 'agent-loop'; author: Extract<AgentConversationParticipant, { role: 'agent' }> & { agentIdentity: AgentDefinitionIdentity }; semantic: Extract<AgentConversationMessageSemantic, { purpose: 'member-self-introduction' }> })
  | (AgentConversationMessageItemBase & { source: 'chatroom-acknowledgement'; author: AgentConversationParticipant; semantic: Extract<AgentConversationMessageSemantic, { purpose: 'chatroom-acknowledgement' }> })
export type AgentConversationItem =
  | AgentConversationMessageItem
  | { kind: 'status'; itemId: string; sequence: number; label: LocalizedText; state: 'info' | 'working' | 'warning' | 'error'; ariaLive: 'off' | 'polite' }
  | AgentConversationMemberPresenceItem
  | AgentConversationApprovalItem

/**
 * Omission means the selected source does not offer a Room description.
 * `empty` is an explicit capability with no current value.
 */
export type AgentConversationRoomDescription =
  | { state: 'empty' }
  | { state: 'present'; text: LocalizedText }

export interface AgentConversationRoomCollectionParticipantRef {
  participantId: string
  avatar: AgentAvatarRef
}
export type AgentConversationRoomCollectionLeadingVisual =
  | { kind: 'semantic-icon'; icon: `host:${string}` }
  | { kind: 'room-composite-avatar'; roomId: string; participants: readonly AgentConversationRoomCollectionParticipantRef[] }

export type AgentConversationSelection =
  | { kind: 'no-room' }
  | { kind: 'room'; roomId: string; title: LocalizedText; description?: AgentConversationRoomDescription; secondary?: LocalizedText; multiParticipant: false; participantPresentation: 'none'; participants: readonly AgentConversationParticipant[]; activeRuns?: readonly AgentConversationActiveRunDescriptor[] }
  | { kind: 'room'; roomId: string; title: LocalizedText; description?: AgentConversationRoomDescription; secondary?: LocalizedText; multiParticipant: true; participantPresentation: 'none' | 'host-initials'; participants: readonly AgentConversationParticipant[]; activeRuns?: readonly AgentConversationActiveRunDescriptor[] }
export interface AgentConversationShellSnapshot { binding: { bindingId: string; ownerGeneration: string }; generation: string; snapshotSequence: number; selection: AgentConversationSelection; items: readonly AgentConversationItem[]; composer: { availability: 'available' | 'unavailable'; placeholder: LocalizedText; disabled: Disabled; submit: CommandReference }; headerActions: readonly AgentConversationAction[] }
export interface AgentConversationShellSubscription { subscriptionId: string; binding: { bindingId: string; ownerGeneration: string }; generation: string; afterSequence: number; snapshotSequence: number }
export type AgentConversationShellUpdate = { kind: 'snapshot-replaced'; sequence: number; snapshot: AgentConversationShellSnapshot } | { kind: 'item-appended' | 'item-updated'; sequence: number; item: AgentConversationItem } | { kind: 'disposed'; sequence: number; reason: 'explicit' | 'owner-disposed' | 'generation-replaced' }
export interface AgentConversationShellPage { subscription: AgentConversationShellSubscription; afterSequence: number; phase: 'replay' | 'live'; updates: readonly AgentConversationShellUpdate[]; nextAfterSequence: number; hasMore: boolean }
export type AgentConversationShellBindRequest = { requestId: string; ownerGeneration: string; routeSelection: { scope: 'room-or-new'; selectedRoomParam?: string } }
export type AgentConversationShellBindResult = { type: 'bind'; status: 'accepted'; code: 'allowed'; binding: AgentConversationShellBinding } | { type: 'bind'; status: 'denied'; code: 'policy-denied' } | { type: 'bind'; status: 'unavailable'; code: 'owner-unavailable' | 'generation-replaced' | 'disposed' }
export type AgentConversationShellResult = { type: 'subscribe'; status: 'accepted'; code: 'allowed'; subscription: AgentConversationShellSubscription } | { type: 'subscribe'; status: 'denied'; code: 'policy-denied' } | { type: 'subscribe'; status: 'unavailable'; code: 'owner-unavailable' | 'generation-replaced' | 'disposed' }
export interface AgentConversationShellSubscriptionHandle { readonly subscription: AgentConversationShellSubscription; readonly pages: AsyncIterable<AgentConversationShellPage>; unsubscribe(): void }
export type AgentConversationShellSubscribeRuntimeResult = { result: Extract<AgentConversationShellResult, { status: 'accepted' }>; handle: AgentConversationShellSubscriptionHandle } | { result: Extract<AgentConversationShellResult, { status: 'denied' | 'unavailable' }> }

/** Plain user-authored values; schema validation supplies the normative bounds. */
export type AgentConversationRoomDescriptionPatch =
  | { state: 'empty' }
  | { state: 'present'; text: string }
export type AgentConversationRoomSettingsPatch =
  | { name: string; description?: AgentConversationRoomDescriptionPatch }
  | { name?: never; description: AgentConversationRoomDescriptionPatch }
export interface AgentConversationRoomSettingsUpdateRequest {
  requestId: string
  binding: { bindingId: string; ownerGeneration: string }
  generation: string
  roomId: string
  expectedSnapshotSequence: number
  patch: AgentConversationRoomSettingsPatch
}
type AgentConversationRoomSettingsUpdateResultFence = {
  type: 'update-room-settings'
  requestId: string
  binding: { bindingId: string; ownerGeneration: string }
  generation: string
  roomId: string
  expectedSnapshotSequence: number
}
export type AgentConversationRoomSettingsUpdateResult =
  | (AgentConversationRoomSettingsUpdateResultFence & { status: 'applied'; code: 'applied'; snapshotSequence: number; currentSnapshotSequence?: never })
  | (AgentConversationRoomSettingsUpdateResultFence & { status: 'conflict'; code: 'request-conflict' | 'owner-conflict' | 'generation-conflict' | 'room-conflict' | 'snapshot-conflict'; snapshotSequence?: never; currentSnapshotSequence?: number })
  | (AgentConversationRoomSettingsUpdateResultFence & { status: 'unavailable'; code: 'owner-unavailable' | 'settings-unavailable' | 'disposed'; snapshotSequence?: never; currentSnapshotSequence?: never })

export interface AgentConversationShellSource { snapshot(): Promise<AgentConversationShellSnapshot>; subscribe(afterSequence: number): Promise<AgentConversationShellSubscribeRuntimeResult>; updateRoomSettings(request: AgentConversationRoomSettingsUpdateRequest): Promise<AgentConversationRoomSettingsUpdateResult>; dispose(): void }
export interface AgentConversationShellHost { bind(request: AgentConversationShellBindRequest): Promise<AgentConversationShellBindResult> }
export type AgentConversationShellCommandContext = { binding: { bindingId: string; ownerGeneration: string }; generation: string; scope: 'header'; command: CommandReference; itemId?: never; submitPayload?: never } | { binding: { bindingId: string; ownerGeneration: string }; generation: string; scope: 'message' | 'approval'; itemId: string; command: CommandReference; submitPayload?: never } | { binding: { bindingId: string; ownerGeneration: string }; generation: string; scope: 'composer-submit'; command: CommandReference; submitPayload: string }
