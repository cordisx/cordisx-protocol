import type { ChannelConversationRef } from './channel-runtime.v1.js'

export type ChannelThreadForwardConversationV1 = Omit<ChannelConversationRef, 'kind'> & {
  readonly kind: 'direct' | 'group'
}
export interface ChannelThreadForwardRequestV1 {
  readonly contract: 'cordisx.channel-thread-forward/v1'
  readonly schemaVersion: 1
  readonly operation: 'thread-forward'
  readonly operationId: string
  readonly source: ChannelThreadForwardConversationV1
  readonly target: ChannelThreadForwardConversationV1
  readonly threadId: string
  readonly anchorMessageId: string
}
export type ChannelThreadForwardReceiptV1 = {
  readonly contract: 'cordisx.channel-thread-forward-receipt/v1'
  readonly schemaVersion: 1
  readonly operation: 'thread-forward'
  readonly operationId: string
} & (
  | { readonly state: 'sending' }
  | { readonly state: 'sent'; readonly externalMessageId: string }
  | { readonly state: 'failed' | 'unknown'; readonly code: string }
)
export interface ChannelThreadForwardV1 {
  forward(request: ChannelThreadForwardRequestV1): Promise<ChannelThreadForwardReceiptV1>
  receipt(operationId: string): Promise<ChannelThreadForwardReceiptV1 | undefined>
}
