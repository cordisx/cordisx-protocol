import type { ChannelHistoryAccountV1, ChannelRemoteMessageV1 } from './channel-remote-history.v1.js'

export interface ChannelThreadHistoryRequestV1 {
  readonly account: ChannelHistoryAccountV1
  readonly conversationId: string
  readonly kind: 'direct' | 'group'
  readonly threadId: string
  readonly anchorMessageId: string
  readonly pageSize?: number
  readonly pageToken?: string
  readonly order?: 'asc' | 'desc'
}
export interface ChannelThreadHistoryPageV1 {
  readonly status: 'ok'
  readonly source: 'remote'
  readonly account: ChannelHistoryAccountV1
  readonly conversation: { readonly id: string; readonly kind: 'direct' | 'group' }
  readonly threadId: string
  readonly anchorMessageId: string
  readonly order: 'asc' | 'desc'
  readonly hasMore: boolean
  readonly pageToken?: string
  readonly messages: readonly ChannelRemoteMessageV1[]
}
export type ChannelThreadHistoryResultV1 = ChannelThreadHistoryPageV1 | {
  readonly status: 'rejected' | 'unavailable'
  readonly code: string
  readonly diagnostic?: { readonly stage: string; readonly httpStatus?: number; readonly platformCode?: number }
}
