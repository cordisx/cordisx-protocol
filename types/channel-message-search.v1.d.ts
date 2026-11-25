import type { ChannelHistoryAccountV1, ChannelRemoteMessageV1 } from './channel-remote-history.v1.js'

export interface ChannelMessageSearchRequestV1 {
  readonly account: ChannelHistoryAccountV1
  readonly conversationId: string
  readonly kind: 'direct' | 'group'
  readonly query: string
  readonly startTime: string
  readonly endTime: string
  readonly pageSize?: number
  readonly pageToken?: string
}
export interface ChannelMessageSearchPageV1 {
  readonly status: 'ok'
  readonly source: 'remote'
  readonly account: ChannelHistoryAccountV1
  readonly conversation: { readonly id: string; readonly kind: 'direct' | 'group' }
  readonly query: string
  readonly startTime: string
  readonly endTime: string
  readonly hasMore: boolean
  readonly pageToken?: string
  readonly messages: readonly ChannelRemoteMessageV1[]
}
export type ChannelMessageSearchResultV1 = ChannelMessageSearchPageV1 | {
  readonly status: 'rejected' | 'unavailable'
  readonly code: string
  readonly diagnostic?: { readonly stage: string; readonly httpStatus?: number; readonly platformCode?: number }
}
