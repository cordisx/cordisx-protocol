import type { ChannelOutboundContentV3, ChannelOutboundV3 } from './channel-outbound.v3.js'
import type { ChannelOutboundContentV2 } from './channel-outbound.v2.js'
import type { ChannelRuntimeContextV4 } from './channel-runtime.v4.js'

const content: ChannelOutboundContentV3 = {
  type: 'richtext',
  blocks: [
    {
      type: 'paragraph',
      nodes: [{ type: 'link', text: 'Docs', url: 'https://example.org' }, { type: 'image', handle: 'media:owned' }],
    },
    { type: 'inline-code', text: 'literal code' },
    { type: 'code', text: 'return 42', language: 'GO' },
  ],
}
// @ts-expect-error Frozen v2 does not accept successor blocks.
const old: ChannelOutboundContentV2 = content
declare const context: ChannelRuntimeContextV4
const outbound: ChannelOutboundV3 = context.channel.outboundV3
void [old, outbound]
