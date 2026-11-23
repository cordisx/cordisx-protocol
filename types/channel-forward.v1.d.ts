import type { ChannelConversationRef } from './channel-runtime.v1.js'

export interface ChannelForwardRequestV1 {
  readonly contract: 'cordisx.channel-forward/v1'
  readonly schemaVersion: 1
  readonly operation: 'forward' | 'merge-forward'
  readonly operationId: string
  readonly source: ChannelConversationRef
  readonly target: ChannelConversationRef
  readonly messageIds: readonly string[]
}

export type ChannelForwardReceiptV1 = {
  readonly contract: 'cordisx.channel-forward-receipt/v1'
  readonly schemaVersion: 1
  readonly operationId: string
  readonly operation: 'forward' | 'merge-forward'
} & (
  | { readonly state: 'sending' }
  | { readonly state: 'sent' | 'partial'; readonly externalMessageId: string; readonly invalidMessageIds: readonly string[] }
  | { readonly state: 'failed' | 'unknown'; readonly code: string }
)

export interface ChannelForwardV1 {
  forward(request: ChannelForwardRequestV1): Promise<ChannelForwardReceiptV1>
  receipt(operationId: string): Promise<ChannelForwardReceiptV1 | undefined>
}
