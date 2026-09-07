import type { AgentDetailReference } from './agents.v1.js'
import type { SessionId } from './sessions.v1.js'
import type {
  AgentConversationSelection as SelectionV11,
  AgentConversationShellSnapshot as SnapshotV11,
  AgentConversationShellUpdate as UpdateV11,
  AgentConversationShellPage as PageV11,
  AgentConversationShellSubscriptionHandle as HandleV11,
  AgentConversationShellSubscribeRuntimeResult as ResultV11,
  AgentConversationShellSource as SourceV11,
} from './agent-conversation-shell.v11.js'
export * from './agent-conversation-shell.v11.js'

/** Persisted Room association whose Session is not loaded; running/recovery status is unknown. */
export interface AgentConversationAssociatedSession {
  readonly participantId: string
  readonly memberId: string
  readonly runId: string
  readonly sessionId: SessionId
  readonly state: 'unloaded'
  readonly details?: AgentDetailReference
}
export type AgentConversationSelection =
  | Extract<SelectionV11, { kind: 'no-room' }>
  | (Extract<SelectionV11, { kind: 'room' }> & { associatedSessions?: readonly AgentConversationAssociatedSession[] })
export interface AgentConversationShellSnapshot extends Omit<SnapshotV11, 'selection'> { selection: AgentConversationSelection }
export type AgentConversationShellUpdate =
  | Exclude<UpdateV11, { kind: 'snapshot-replaced' }>
  | { kind: 'snapshot-replaced'; sequence: number; snapshot: AgentConversationShellSnapshot }
export interface AgentConversationShellPage extends Omit<PageV11, 'updates'> { updates: readonly AgentConversationShellUpdate[] }
export interface AgentConversationShellSubscriptionHandle extends Omit<HandleV11, 'pages'> { readonly pages: AsyncIterable<AgentConversationShellPage> }
export type AgentConversationShellSubscribeRuntimeResult =
  | Exclude<ResultV11, { handle: HandleV11 }>
  | { result: Extract<ResultV11, { handle: HandleV11 }>['result']; handle: AgentConversationShellSubscriptionHandle }
export interface AgentConversationShellSource extends Omit<SourceV11, 'snapshot' | 'subscribe'> {
  snapshot(): Promise<AgentConversationShellSnapshot>
  subscribe(afterSequence: number): Promise<AgentConversationShellSubscribeRuntimeResult>
}
