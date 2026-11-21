import type {
  ChannelProviderContinuationRequestV1,
  ChannelProviderContinuationResultV1,
} from './channel-provider-continuation.v1.js'

const request: ChannelProviderContinuationRequestV1 = {
  contract: 'cordisx.channel-provider-continuation/v1',
  operationId: 'operation',
  sourceSessionId: 'source',
  expectedRevision: 1,
  target: { providerId: 'example', model: 'model' },
  history: 'inherit',
}
const result: ChannelProviderContinuationResultV1 = {
  state: 'applied',
  operationId: request.operationId,
  destinationSessionId: 'destination',
}
void result
