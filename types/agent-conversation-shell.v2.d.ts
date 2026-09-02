import type { AgentAvatarRef } from './agent-avatar.v1.js'
import type { AgentDefinitionIdentity, AgentDetailReference } from './agents.v1.js'

export interface LocalizedText { key: string; fallback: string; namespace?: string }
export type JsonValue = string | number | boolean | null | readonly JsonValue[] | { readonly [key: string]: JsonValue }
export interface CommandReference { id: string; arguments?: JsonValue }
export interface Disabled { value: boolean; reason?: LocalizedText }
export interface AgentConversationShellBinding { bindingId: string; shell: 'agent-desktop'; ownerGeneration: string; routeSelection: { scope: 'room-or-new'; selectedRoomParam?: string } }
export type AgentConversationParticipant =
  | { participantId: string; role: 'human' | 'system'; displayName: LocalizedText; avatar?: AgentAvatarRef; agentIdentity?: never }
  | { participantId: string; role: 'agent'; displayName: LocalizedText; avatar?: AgentAvatarRef; agentIdentity?: AgentDefinitionIdentity }
export interface AgentConversationActiveRunDescriptor { participantId: string; memberId: string; sessionId: string; lifecycle: { phase: 'active' | 'running' | 'waiting' | 'attention'; updatedAt?: string }; details?: AgentDetailReference }
export interface AgentConversationAction { id: string; label: LocalizedText; icon?: `host:${string}`; command: CommandReference; disabled: Disabled }
export type AgentConversationReactionValue =
  | { kind: 'emoji'; emoji: string }
  | { kind: 'semantic'; token: string }
export interface AgentConversationReaction { reactionId: string; actorParticipantId: string; value: AgentConversationReactionValue; state: 'pending' | 'completed' | 'failed' }
type AgentConversationMemberPresenceBase = { kind: 'member-presence'; itemId: string; sequence: number; participantId: string; memberId: string; sessionId: string; diagnostic?: LocalizedText }
export type AgentConversationMemberPresenceItem =
  | (AgentConversationMemberPresenceBase & { state: 'inviting' | 'creating' | 'joined' | 'ready'; retryable: boolean; retry?: never })
  | (AgentConversationMemberPresenceBase & { state: 'failed'; retryable: false; retry?: never })
  | (AgentConversationMemberPresenceBase & { state: 'failed'; retryable: true; retry?: CommandReference })
export type AgentConversationItem =
  | { kind: 'message'; itemId: string; messageId: string; sequence: number; source: 'session-event' | 'chatroom-acknowledgement'; author: AgentConversationParticipant; body: readonly [{ kind: 'text'; text: LocalizedText }, ...{ kind: 'text'; text: LocalizedText }[]]; reactions: readonly AgentConversationReaction[]; timestamp: string; deliveryState: 'pending' | 'sent' | 'delivered' | 'failed'; runState: 'idle' | 'running' | 'stopped' | 'failed'; ariaLive: 'off' | 'polite'; actions: readonly AgentConversationAction[] }
  | { kind: 'status'; itemId: string; sequence: number; label: LocalizedText; state: 'info' | 'working' | 'warning' | 'error'; ariaLive: 'off' | 'polite' }
  | AgentConversationMemberPresenceItem
export type AgentConversationSelection =
  | { kind: 'no-room' }
  | { kind: 'room'; roomId: string; title: LocalizedText; secondary?: LocalizedText; multiParticipant: false; participantPresentation: 'none'; participants: readonly AgentConversationParticipant[]; activeRuns?: readonly AgentConversationActiveRunDescriptor[] }
  | { kind: 'room'; roomId: string; title: LocalizedText; secondary?: LocalizedText; multiParticipant: true; participantPresentation: 'none' | 'host-initials'; participants: readonly AgentConversationParticipant[]; activeRuns?: readonly AgentConversationActiveRunDescriptor[] }
export interface AgentConversationShellSnapshot { binding: { bindingId: string; ownerGeneration: string }; generation: string; snapshotSequence: number; selection: AgentConversationSelection; items: readonly AgentConversationItem[]; composer: { availability: 'available' | 'unavailable'; placeholder: LocalizedText; disabled: Disabled; submit: CommandReference }; headerActions: readonly AgentConversationAction[] }
export interface AgentConversationShellSubscription { subscriptionId: string; binding: { bindingId: string; ownerGeneration: string }; generation: string; afterSequence: number; snapshotSequence: number }
export type AgentConversationShellUpdate = { kind: 'snapshot-replaced'; sequence: number; snapshot: AgentConversationShellSnapshot } | { kind: 'item-appended' | 'item-updated'; sequence: number; item: AgentConversationItem } | { kind: 'disposed'; sequence: number; reason: 'explicit' | 'owner-disposed' | 'generation-replaced' }
export interface AgentConversationShellPage { subscription: AgentConversationShellSubscription; afterSequence: number; phase: 'replay' | 'live'; updates: readonly AgentConversationShellUpdate[]; nextAfterSequence: number; hasMore: boolean }
export type AgentConversationShellBindRequest = { requestId: string; ownerGeneration: string; routeSelection: { scope: 'room-or-new'; selectedRoomParam?: string } }
export type AgentConversationShellBindResult = { type: 'bind'; status: 'accepted'; code: 'allowed'; binding: AgentConversationShellBinding } | { type: 'bind'; status: 'denied'; code: 'policy-denied' } | { type: 'bind'; status: 'unavailable'; code: 'owner-unavailable' | 'generation-replaced' | 'disposed' }
export type AgentConversationShellResult = { type: 'subscribe'; status: 'accepted'; code: 'allowed'; subscription: AgentConversationShellSubscription } | { type: 'subscribe'; status: 'denied'; code: 'policy-denied' } | { type: 'subscribe'; status: 'unavailable'; code: 'owner-unavailable' | 'generation-replaced' | 'disposed' }
export interface AgentConversationShellSubscriptionHandle { readonly subscription: AgentConversationShellSubscription; readonly pages: AsyncIterable<AgentConversationShellPage>; unsubscribe(): void }
export type AgentConversationShellSubscribeRuntimeResult = { result: Extract<AgentConversationShellResult, { status: 'accepted' }>; handle: AgentConversationShellSubscriptionHandle } | { result: Extract<AgentConversationShellResult, { status: 'denied' | 'unavailable' }> }
export interface AgentConversationShellSource { snapshot(): Promise<AgentConversationShellSnapshot>; subscribe(afterSequence: number): Promise<AgentConversationShellSubscribeRuntimeResult>; dispose(): void }
export interface AgentConversationShellHost { bind(request: AgentConversationShellBindRequest): Promise<AgentConversationShellBindResult> }
export type AgentConversationShellCommandContext = { binding: { bindingId: string; ownerGeneration: string }; generation: string; scope: 'header'; command: CommandReference; itemId?: never; submitPayload?: never } | { binding: { bindingId: string; ownerGeneration: string }; generation: string; scope: 'message'; itemId: string; command: CommandReference; submitPayload?: never } | { binding: { bindingId: string; ownerGeneration: string }; generation: string; scope: 'composer-submit'; command: CommandReference; submitPayload: string }
