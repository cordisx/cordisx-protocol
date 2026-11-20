/** Optional, source-scoped single-message read for following a reply chain. */
export interface ChannelMessageReadRequestV1 {
  readonly account: { readonly adapterId: string; readonly accountId: string; readonly tenantId: string }
  readonly conversationId: string
  readonly kind: 'direct' | 'group'
  readonly messageId: string
}
export interface ChannelReferencedMessageV1 {
  readonly messageId: string
  readonly parentId?: string
  readonly type?: string
  readonly sender?: { readonly id?: string; readonly idType?: string; readonly type?: string; readonly name?: string }
  /** Untrusted platform message body, possibly truncated by the Host. */
  readonly content?: string
  readonly truncated?: boolean
}
export type ChannelMessageReadResultV1 =
  | { readonly status: 'ok'; readonly message: ChannelReferencedMessageV1 }
  | { readonly status: 'rejected' | 'unavailable'; readonly code: string }
