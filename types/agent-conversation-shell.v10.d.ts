import type {
  AgentConversationItem as ItemV9,
  AgentConversationMessageItem as MessageV9,
  AgentConversationMessageSource as SourceV9,
  AgentConversationShellSnapshot as SnapshotV9,
  AgentConversationShellUpdate as UpdateV9,
  AgentConversationShellPage as PageV9,
  AgentConversationShellSubscriptionHandle as HandleV9,
  AgentConversationShellSubscribeRuntimeResult as ResultV9,
  AgentConversationShellSource as ShellSourceV9,
} from './agent-conversation-shell.v9.js'
export * from './agent-conversation-shell.v9.js'

/** A persisted plugin message created by an authenticated command handler, never a SessionEvent. */
export interface AgentConversationPluginCommandSource {
  readonly kind: 'plugin-command'
  readonly roomId: string
  readonly messageId: string
  readonly sessionId: string
  readonly participantId: string
  readonly memberId: string
  readonly runId: string
  readonly operationId: string
  /** Original plugin Room sequence; presentation sequence may interleave other items. */
  readonly sequence: number
}
export type AgentConversationMessageSource = SourceV9 | AgentConversationPluginCommandSource
export type AgentConversationPluginCommandMessage =
  Omit<Extract<MessageV9, { semantic: { purpose: 'conversation' } }>, 'source' | 'author'> & {
    source: AgentConversationPluginCommandSource
    author: Extract<MessageV9['author'], { role: 'agent' }>
  }
export type AgentConversationMessageItem = MessageV9 | AgentConversationPluginCommandMessage
export type AgentConversationItem = ItemV9 | AgentConversationPluginCommandMessage
export interface AgentConversationShellSnapshot extends Omit<SnapshotV9, 'items'> { items: readonly AgentConversationItem[] }
export type AgentConversationShellUpdate =
  | Exclude<UpdateV9, { kind: 'snapshot-replaced' | 'item-appended' | 'item-updated' }>
  | { kind: 'snapshot-replaced'; sequence: number; snapshot: AgentConversationShellSnapshot }
  | { kind: 'item-appended' | 'item-updated'; sequence: number; item: AgentConversationItem }
export interface AgentConversationShellPage extends Omit<PageV9, 'updates'> { updates: readonly AgentConversationShellUpdate[] }
export interface AgentConversationShellSubscriptionHandle extends Omit<HandleV9, 'pages'> { readonly pages: AsyncIterable<AgentConversationShellPage> }
export type AgentConversationShellSubscribeRuntimeResult =
  | Exclude<ResultV9, { handle: HandleV9 }>
  | { result: Extract<ResultV9, { handle: HandleV9 }>['result']; handle: AgentConversationShellSubscriptionHandle }
export interface AgentConversationShellSource extends Omit<ShellSourceV9, 'snapshot' | 'subscribe'> {
  snapshot(): Promise<AgentConversationShellSnapshot>
  subscribe(afterSequence: number): Promise<AgentConversationShellSubscribeRuntimeResult>
}
