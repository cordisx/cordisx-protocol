import type { ChannelMessageReadRequestV1, ChannelMessageReadResultV1 } from './channel-message-read.v1.js'
const request: ChannelMessageReadRequestV1 = {
  account: { adapterId: 'feishu', accountId: 'app', tenantId: 'tenant' },
  conversationId: 'oc_chat',
  kind: 'group',
  messageId: 'om_parent',
}
const result: ChannelMessageReadResultV1 = {
  status: 'ok',
  message: { messageId: request.messageId, parentId: 'om_older', sender: { name: 'Alice' } },
}
void result
// @ts-expect-error The account and conversation scope are mandatory.
const invalid: ChannelMessageReadRequestV1 = { messageId: 'om_parent' }
void invalid
