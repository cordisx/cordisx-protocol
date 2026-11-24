import type { ChannelRuntimeContextV3 } from '@cordisx/protocol/channel-runtime/v3'
import type { ChannelMessageSendV2 } from '@cordisx/protocol/channel-outbound/v2'
import type { ChannelMessageSendV1 } from '@cordisx/protocol/channel-outbound/v1'

declare const context: ChannelRuntimeContextV3
declare const original: ChannelMessageSendV1
const request: ChannelMessageSendV2 = {
  ...original,
  contract: 'cordisx.channel-message-send/v2',
  schemaVersion: 2,
  content: {
    type: 'richtext',
    blocks: [{
      type: 'paragraph',
      nodes: [{ type: 'mention', userId: 'ou_verified' }, { type: 'text', text: ' please review', style: 'plain' }],
    }, { text: 'legacy line', style: 'code' }],
  },
}
context.channel.outboundV2.send(request).then(handle => handle.receipt())
context.channel.outbound.send(original)
// @ts-expect-error v2 wire documents must not enter frozen outbound v1
context.channel.outbound.send(request)
// @ts-expect-error v3 keeps adaptersV2 frozen; it does not add v2 send nodes
context.channel.adaptersV2.register({ outboundCapabilities: { richtext: { mentions: true } } })
