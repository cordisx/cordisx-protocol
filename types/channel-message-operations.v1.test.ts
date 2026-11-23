import type { ChannelMessageOperationRequestV1, ChannelMessageOperationsV1 } from './channel-message-operations.v1.js'

const request: ChannelMessageOperationRequestV1 = {
  operation: 'message-edit',
  account: { adapterId: 'feishu', accountId: 'app', tenantId: 'tenant' },
  conversationId: 'oc_chat',
  kind: 'group',
  messageId: 'om_owned',
  operationId: 'edit-1',
  content: { type: 'text', text: 'updated' },
}
declare const capability: ChannelMessageOperationsV1
void capability.execute(request)
void capability.receipt(request, 'edit-1')
// @ts-expect-error paid urgent delivery is not an operation
const unsupported: ChannelMessageOperationRequestV1 = { ...request, operation: 'urgent-sms' }
void unsupported
