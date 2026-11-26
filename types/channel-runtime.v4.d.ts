import type { Context } from '@deepseek-ai/cordis'
import type { ChannelRuntimeV3 } from './channel-runtime.v3.js'
import type { ChannelOutboundV3 } from './channel-outbound.v3.js'

export interface ChannelRuntimeV4 extends ChannelRuntimeV3 {
  readonly outboundV3: ChannelOutboundV3
}

export type ChannelRuntimeContextV4 = Omit<Context, 'channel'> & { readonly channel: ChannelRuntimeV4 }
