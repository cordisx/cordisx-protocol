import type { ChannelRemoteHistoryRequestV1, ChannelRemoteHistoryResultV1 } from './channel-remote-history.v1.js'
const request: ChannelRemoteHistoryRequestV1 = {
  account: { adapterId: 'feishu', accountId: 'app', tenantId: 'tenant' },
  conversationId: 'oc_chat',
  kind: 'group',
  startTime: '1',
  endTime: '2',
}
const page: ChannelRemoteHistoryResultV1 = {
  status: 'ok',
  source: 'remote',
  account: request.account,
  conversation: { id: request.conversationId, kind: request.kind },
  startTime: '1',
  endTime: '2',
  order: 'asc',
  hasMore: false,
  messages: [],
}
void page
// @ts-expect-error The account and time bounds are required.
const invalid: ChannelRemoteHistoryRequestV1 = { conversationId: 'oc_chat', kind: 'group' }
void invalid
