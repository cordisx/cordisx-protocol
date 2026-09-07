import type {
  AgentConversationItem as ItemV10,
  AgentConversationMessageItem as MessageV10,
  AgentConversationMessageSource as SourceV10,
  AgentConversationShellSnapshot as SnapshotV10,
  AgentConversationShellUpdate as UpdateV10,
  AgentConversationShellPage as PageV10,
  AgentConversationShellSubscriptionHandle as HandleV10,
  AgentConversationShellSubscribeRuntimeResult as ResultV10,
  AgentConversationShellSource as ShellSourceV10,
} from './agent-conversation-shell.v10.js'
export * from './agent-conversation-shell.v10.js'

/** A persisted Room human-input fact. It is neither a SessionEvent nor Agent execution. */
export interface AgentConversationRoomUserMessageSource {
  readonly kind: 'room-user-message'
  readonly roomId: string
  readonly messageId: string
  /** Original Room coordinate; the presentation sequence can interleave other sources. */
  readonly sequence: number
}
export type AgentConversationMessageSource = SourceV10 | AgentConversationRoomUserMessageSource
export type AgentConversationRoomUserMessage =
  Omit<Extract<MessageV10, { semantic: { purpose: 'conversation' } }>, 'source' | 'author'> & {
    source: AgentConversationRoomUserMessageSource
    author: Extract<MessageV10['author'], { role: 'human' | 'system' }> & { role: 'human' }
  }
export type AgentConversationMessageItem = MessageV10 | AgentConversationRoomUserMessage
export type AgentConversationItem = ItemV10 | AgentConversationRoomUserMessage
export interface AgentConversationShellSnapshot extends Omit<SnapshotV10, 'items'> { items: readonly AgentConversationItem[] }
export type AgentConversationShellUpdate =
  | Exclude<UpdateV10, { kind: 'snapshot-replaced' | 'item-appended' | 'item-updated' }>
  | { kind: 'snapshot-replaced'; sequence: number; snapshot: AgentConversationShellSnapshot }
  | { kind: 'item-appended' | 'item-updated'; sequence: number; item: AgentConversationItem }
export interface AgentConversationShellPage extends Omit<PageV10, 'updates'> { updates: readonly AgentConversationShellUpdate[] }
export interface AgentConversationShellSubscriptionHandle extends Omit<HandleV10, 'pages'> { readonly pages: AsyncIterable<AgentConversationShellPage> }
export type AgentConversationShellSubscribeRuntimeResult =
  | Exclude<ResultV10, { handle: HandleV10 }>
  | { result: Extract<ResultV10, { handle: HandleV10 }>['result']; handle: AgentConversationShellSubscriptionHandle }
export interface AgentConversationShellSource extends Omit<ShellSourceV10, 'snapshot' | 'subscribe'> {
  snapshot(): Promise<AgentConversationShellSnapshot>
  subscribe(afterSequence: number): Promise<AgentConversationShellSubscribeRuntimeResult>
}
