import type { ChannelForwardReceiptV1, ChannelForwardRequestV1, ChannelForwardV1 } from './channel-forward.v1.js'

const receipt: ChannelForwardReceiptV1 = {
  contract: 'cordisx.channel-forward-receipt/v1',
  schemaVersion: 1,
  operation: 'forward',
  operationId: 'one',
  state: 'sent',
  externalMessageId: 'om_result',
  invalidMessageIds: [],
}
declare const request: ChannelForwardRequestV1
declare const forward: ChannelForwardV1
void forward.forward(request)
void forward.receipt(receipt.operationId)
