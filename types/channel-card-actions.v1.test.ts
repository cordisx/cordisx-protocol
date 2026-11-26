import type {
  ChannelCardActionRequestV1,
  ChannelCardActionResultV1,
  ChannelCardActionsV1,
} from './channel-card-actions.v1.js'

declare const actions: ChannelCardActionsV1
const request: ChannelCardActionRequestV1 = {
  account: { adapterId: 'feishu', accountId: 'app', tenantId: 'tenant' },
  conversationId: 'oc_chat',
  kind: 'direct',
  operation: 'card-action-publish',
  operationId: 'publish',
  messageId: 'om_notice',
  expectedVersion: 0,
  template: 'action-notice',
  title: 'Review',
  body: 'Choose',
  actions: [{ id: 'review', label: 'Review' }],
  expiresInSeconds: 60,
}
void actions.execute(request)
// @ts-expect-error action readback requires normalized events and pagination state
const incomplete: ChannelCardActionResultV1 = {
  status: 'ok',
  operation: 'card-action-read',
  messageId: 'om_notice',
  version: 1,
  expiresAt: 'date',
}
void incomplete
// @ts-expect-error a continuing page requires a cursor
const cursorMissing: ChannelCardActionResultV1 = {
  status: 'ok',
  operation: 'card-action-read',
  messageId: 'om_notice',
  version: 1,
  expiresAt: 'date',
  events: [],
  hasMore: true,
}
void cursorMissing
