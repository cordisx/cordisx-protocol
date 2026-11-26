import type {
  ChannelHistoricalResourceReadRequestV1,
  ChannelHistoricalResourceRequestV1,
  ChannelHistoricalResourceResultV1,
} from './channel-historical-resources.v1.js'

const request: ChannelHistoricalResourceRequestV1 = {
  account: { adapterId: 'feishu', accountId: 'app', tenantId: 'tenant' },
  conversationId: 'oc_chat',
  kind: 'group',
  messageId: 'om_resource',
  index: 0,
}
export const read: ChannelHistoricalResourceReadRequestV1 = { ...request, offset: 0, length: 65536 }
export const expired: ChannelHistoricalResourceResultV1 = {
  status: 'ok',
  messageId: request.messageId,
  index: request.index,
  type: 'image',
  resource: { state: 'expired' },
}
export const unavailable: ChannelHistoricalResourceResultV1 = { status: 'unavailable', code: 'RESOURCE_UNAVAILABLE' }
