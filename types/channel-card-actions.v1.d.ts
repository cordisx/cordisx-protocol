import type { ChannelMessageOperationTargetV1 } from './channel-message-operations.v1.js'

export interface ChannelCardActionDefinitionV1 {
  readonly id: string
  readonly label: string
}

export type ChannelCardActionRequestV1 = ChannelMessageOperationTargetV1 & (
  | { readonly operation: 'card-action-publish'; readonly operationId: string; readonly messageId: string;
      readonly expectedVersion: number; readonly template: 'action-notice'; readonly title: string;
      readonly body: string; readonly actions: readonly ChannelCardActionDefinitionV1[];
      readonly operatorIds?: readonly string[]; readonly expiresInSeconds: number }
  | { readonly operation: 'card-action-read'; readonly messageId: string; readonly version: number;
      readonly pageSize?: number; readonly pageToken?: string }
  | { readonly operation: 'card-action-receipt'; readonly operationId: string }
)

export interface ChannelCardActionEventV1 {
  readonly eventId: string
  readonly messageId: string
  readonly version: number
  readonly actionId: string
  readonly operatorId: string
  readonly receivedAt: string
}

export type ChannelCardActionResultV1 =
  | { readonly status: 'ok'; readonly operation: 'card-action-publish'; readonly messageId: string;
      readonly version: number; readonly expiresAt: string; readonly operationId: string }
  | ({ readonly status: 'ok'; readonly operation: 'card-action-read'; readonly messageId: string;
      readonly version: number; readonly expiresAt: string; readonly events: readonly ChannelCardActionEventV1[] }
    & ({ readonly hasMore: false } | { readonly hasMore: true; readonly pageToken: string }))
  | { readonly status: 'rejected' | 'unavailable' | 'failed' | 'unknown'; readonly code: string;
      readonly operationId?: string }

export interface ChannelCardActionsV1 {
  execute(request: ChannelCardActionRequestV1): Promise<ChannelCardActionResultV1 | null>
}
