/** Version 1 of the optional, read-only remote Channel history operation. */
export interface ChannelHistoryAccountV1 {
  readonly adapterId: string
  readonly accountId: string
  readonly tenantId: string
}
export interface ChannelRemoteHistoryRequestV1 {
  readonly account: ChannelHistoryAccountV1
  readonly conversationId: string
  readonly kind: 'direct' | 'group'
  /** Decimal Unix seconds. The start must precede the end. */
  readonly startTime: string
  readonly endTime: string
  readonly pageSize?: number
  readonly pageToken?: string
  readonly order?: 'asc' | 'desc'
}
export interface ChannelHistoryParticipantV1 {
  readonly id: string
  readonly idType: string
  readonly name?: string
  readonly tenantId?: string
}
export interface ChannelRemoteMessageV1 {
  readonly messageId?: string
  readonly type?: string
  readonly createTime?: string
  readonly deleted?: boolean
  readonly updated?: boolean
  readonly content?: string
  readonly threadId?: string
  readonly rootId?: string
  readonly parentId?: string
  readonly sender?: ChannelHistoryParticipantV1 & { readonly type: string }
  readonly mentions: readonly (ChannelHistoryParticipantV1 & { readonly key: string })[]
}
export interface ChannelRemoteHistoryPageV1 {
  readonly status: 'ok'
  readonly source: 'remote'
  readonly account: ChannelHistoryAccountV1
  readonly conversation: { readonly id: string; readonly kind: 'direct' | 'group' }
  readonly startTime: string
  readonly endTime: string
  readonly order: 'asc' | 'desc'
  readonly hasMore: boolean
  readonly pageToken?: string
  readonly messages: readonly ChannelRemoteMessageV1[]
}
export type ChannelRemoteHistoryResultV1 = ChannelRemoteHistoryPageV1 | {
  readonly status: 'rejected' | 'unavailable'
  readonly code: string
  readonly diagnostic?: { readonly stage: string; readonly httpStatus?: number; readonly platformCode?: number }
}
