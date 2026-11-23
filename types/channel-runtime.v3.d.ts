import type { Context } from '@deepseek-ai/cordis'
import type { ChannelRuntimeV2 } from './channel-runtime.v2.js'
import type { ChannelOutboundV2 } from './channel-outbound.v2.js'

export interface ChannelRuntimeV3 extends ChannelRuntimeV2 {
  readonly outboundV2: ChannelOutboundV2
}

export type ChannelRuntimeContextV3 = Omit<Context, 'channel'> & { readonly channel: ChannelRuntimeV3 }
