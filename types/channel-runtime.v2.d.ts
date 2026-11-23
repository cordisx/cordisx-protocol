import type { Context } from '@deepseek-ai/cordis'
import type {
  ChannelAdapterConnection,
  ChannelAdapterDefinition,
  ChannelAdapterHandle,
  ChannelAdapterHost,
  ChannelRuntimeV1,
  ChannelSendResult,
} from './channel-runtime.v1.js'
import type { ChannelAdapterMediaV1, ChannelMessageDeliveryV1, ChannelOutboundTypeV1, ChannelOutboundV1 } from './channel-outbound.v1.js'

export interface ChannelAdapterHostV2 extends ChannelAdapterHost {
  readonly media: ChannelAdapterMediaV1
}

export interface ChannelAdapterConnectionV2 extends ChannelAdapterConnection {
  sendMessage(delivery: ChannelMessageDeliveryV1): Promise<ChannelSendResult>
}

export interface ChannelAdapterDefinitionV2 extends Omit<ChannelAdapterDefinition, 'start'> {
  readonly outboundCapabilities: {
    readonly types: readonly ChannelOutboundTypeV1[]
    readonly maxMediaBytes: number
  }
  start(host: ChannelAdapterHostV2): Promise<ChannelAdapterConnectionV2>
}

export interface ChannelRuntimeV2 extends ChannelRuntimeV1 {
  readonly outbound: ChannelOutboundV1
  readonly adaptersV2: {
    register(definition: ChannelAdapterDefinitionV2): Promise<ChannelAdapterHandle>
  }
}

export type ChannelRuntimeContextV2 = Omit<Context, 'channel'> & { readonly channel: ChannelRuntimeV2 }
