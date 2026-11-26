import type { ChannelHistoryAccountV1 } from './channel-remote-history.v1.js'

export interface ChannelHistoricalResourceRequestV1 {
  readonly account: ChannelHistoryAccountV1
  readonly conversationId: string
  readonly kind: 'direct' | 'group'
  readonly messageId: string
  readonly index: number
}
export interface ChannelHistoricalResourceReadRequestV1 extends ChannelHistoricalResourceRequestV1 {
  readonly offset: number
  readonly length: number
}
export type ChannelHistoricalResourceStateV1 = {
  readonly state: 'ready'
  readonly expiresAt: number
  readonly attachment: {
    readonly type: 'attachment'
    readonly handle: string
    readonly mediaType: string
    readonly size: number
    readonly name?: string
  }
} | { readonly state: 'expired' | 'not-prepared' | 'unavailable' }
export type ChannelHistoricalResourceResultV1 = {
  readonly status: 'ok'
  readonly messageId: string
  readonly index: number
  readonly type: 'image' | 'file' | 'audio' | 'video'
  readonly resource: ChannelHistoricalResourceStateV1
  readonly chunk?: {
    readonly offset: number
    readonly base64: string
    readonly nextOffset: number
    readonly hasMore: boolean
  }
} | { readonly status: 'rejected' | 'unavailable'; readonly code: string }
