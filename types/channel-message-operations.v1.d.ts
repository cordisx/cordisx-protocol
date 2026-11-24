export type ChannelMessageOperationV1 =
  | 'message-edit' | 'message-recall' | 'pin-add' | 'pin-remove' | 'pin-list'
  | 'read-users' | 'reaction-list' | 'card-update'

export interface ChannelMessageOperationTargetV1 {
  readonly account: { readonly adapterId: string; readonly accountId: string; readonly tenantId: string }
  readonly conversationId: string
  readonly kind: 'direct' | 'group'
}

export type ChannelRestrictedCardV1 = {
  readonly template: 'notice' | 'status'
  readonly title: string
  readonly body: string
  readonly status?: 'pending' | 'running' | 'completed' | 'failed'
}

export type ChannelMessageOperationRequestV1 = ChannelMessageOperationTargetV1 & (
  | { readonly operation: 'message-edit'; readonly operationId: string; readonly messageId: string;
      readonly content: { readonly type: 'text'; readonly text: string } |
        { readonly type: 'richtext'; readonly blocks: readonly { readonly text: string;
          readonly style: 'plain' | 'strong' | 'emphasis' | 'code' }[] } }
  | { readonly operation: 'message-recall' | 'pin-add' | 'pin-remove'; readonly operationId: string;
      readonly messageId: string }
  | { readonly operation: 'card-update'; readonly operationId: string; readonly messageId: string;
      readonly card: ChannelRestrictedCardV1 }
  | { readonly operation: 'pin-list'; readonly pageSize?: number; readonly pageToken?: string;
      readonly startTime?: string; readonly endTime?: string }
  | { readonly operation: 'read-users'; readonly messageId: string; readonly pageSize?: number;
      readonly pageToken?: string }
  | { readonly operation: 'reaction-list'; readonly messageId: string; readonly pageSize?: number;
      readonly pageToken?: string; readonly emojiType?: string }
)

export type ChannelMessageOperationItemV1 =
  | { readonly type: 'pin'; readonly messageId: string; readonly createdAt?: string }
  | { readonly type: 'reader'; readonly userId: string; readonly readAt?: string }
  | { readonly type: 'reaction'; readonly reactionId: string; readonly emojiType: string;
      readonly operatorId?: string; readonly operatorType?: 'app' | 'user'; readonly createdAt?: string }

export type ChannelMessageOperationResultV1 =
  | { readonly status: 'ok'; readonly operation: ChannelMessageOperationV1; readonly messageId?: string;
      readonly operationId?: string; readonly items?: readonly ChannelMessageOperationItemV1[];
      readonly hasMore?: boolean; readonly pageToken?: string }
  | { readonly status: 'rejected' | 'unavailable' | 'failed' | 'unknown'; readonly code: string;
      readonly operationId?: string }

export interface ChannelMessageOperationCapabilityV1 {
  readonly operation: ChannelMessageOperationV1
  readonly implementation: 'supported' | 'unsupported' | 'internal-only'
  readonly authorization: 'not-verified'
  readonly scope: 'own-message' | 'source-message' | 'conversation'
  readonly write: boolean
  readonly permissionAlternatives: readonly string[]
  readonly restrictions: readonly string[]
}

export interface ChannelMessageOperationsV1 {
  capabilities(target: ChannelMessageOperationTargetV1): Promise<readonly ChannelMessageOperationCapabilityV1[]>
  execute(request: ChannelMessageOperationRequestV1): Promise<ChannelMessageOperationResultV1>
  receipt(target: ChannelMessageOperationTargetV1, operationId: string): Promise<ChannelMessageOperationResultV1 | null>
}
