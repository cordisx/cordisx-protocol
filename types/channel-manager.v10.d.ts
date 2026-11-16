import type { ChannelManagerV9, ChannelManagerBindingPageV2 } from './channel-manager.v9.js'
import type { RasterImageSnapshotV1 } from './raster-image.v1.js'

export interface ChannelManagerConversationV1 {
  readonly conversationToken: string
  readonly connectionToken: string
  readonly name: string
  readonly kind: 'direct' | 'group' | 'broadcast'
  readonly avatar?: RasterImageSnapshotV1
  readonly bindingCount: number
  readonly activeBindingCount: number
  readonly receivedCount: number
  readonly sentCount: number
  readonly lastActivityAt?: string
}

interface ChannelManagerConversationReadFenceV1 {
  readonly profileId: string
  readonly hostGeneration: string
  readonly snapshotRevision: number
}

export interface ChannelManagerConversationPageV1 extends ChannelManagerConversationReadFenceV1 {
  readonly contract: 'cordisx.channel-manager-conversation-page/v1'
  readonly schemaVersion: 1
  readonly connectionToken: string
  readonly directoryComplete: boolean
  readonly total: number
  readonly conversations: readonly ChannelManagerConversationV1[]
  readonly nextCursor?: string
}

export interface ChannelManagerConversationDetailV1 extends ChannelManagerConversationReadFenceV1 {
  readonly contract: 'cordisx.channel-manager-conversation-detail/v1'
  readonly schemaVersion: 1
  readonly conversation: ChannelManagerConversationV1
}

/** Actual local transport records, never Codex commentary or an unsent final answer. */
export interface ChannelManagerConversationActivityV1 {
  readonly entryId: string
  readonly direction: 'incoming' | 'outgoing'
  readonly state: 'received' | 'queued' | 'processing' | 'retrying' | 'permission-pending' | 'denied' | 'sent' | 'failed' | 'cancelled' | 'unknown'
  readonly occurredAt: string
  readonly text: string
  readonly senderName?: string
  /** Available only when the Host has an actual recorded task attribution. */
  readonly sessionName?: string
  readonly code?: string
}

export interface ChannelManagerConversationActivityPageV1 extends ChannelManagerConversationReadFenceV1 {
  readonly contract: 'cordisx.channel-manager-conversation-activity-page/v1'
  readonly schemaVersion: 1
  readonly conversationToken: string
  readonly source: 'local-transport'
  readonly total: number
  readonly entries: readonly ChannelManagerConversationActivityV1[]
  readonly nextCursor?: string
}

export interface ChannelManagerConversationBindingsPageV1 extends Omit<ChannelManagerBindingPageV2, 'contract' | 'schemaVersion'> {
  readonly contract: 'cordisx.channel-manager-conversation-bindings-page/v1'
  readonly schemaVersion: 1
  readonly conversationToken: string
}

/** Explicit successor; frozen predecessor methods do not acquire message access. */
export interface ChannelManagerV10 extends ChannelManagerV9 {
  conversationPage(request: { readonly connectionToken: string; readonly afterCursor?: string; readonly limit?: number }, signal: AbortSignal): Promise<ChannelManagerConversationPageV1>
  conversationDetail(conversationToken: string, signal: AbortSignal): Promise<ChannelManagerConversationDetailV1>
  conversationActivity(request: { readonly conversationToken: string; readonly afterCursor?: string; readonly limit?: number }, signal: AbortSignal): Promise<ChannelManagerConversationActivityPageV1>
  conversationBindings(request: { readonly conversationToken: string; readonly afterCursor?: string; readonly limit?: number }, signal: AbortSignal): Promise<ChannelManagerConversationBindingsPageV1>
  /** User-triggered navigation to the actual bound local chat; never sends or resumes a turn. */
  openBindingConversation(bindingToken: string, signal: AbortSignal): Promise<{ readonly status: 'opened' | 'unavailable'; readonly code?: string }>
  forOwnConversationService(): ChannelManagerV10 | undefined
}
