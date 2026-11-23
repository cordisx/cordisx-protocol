import type { ChannelThreadRef } from './channel-runtime.v1.js'
import type { ChannelMediaPrepareRequestV1, ChannelOutboundContentV1, ChannelOutboundCapabilitiesV1, ChannelPreparedMediaV1, ChannelMessageSendV1, ChannelSendHandleV1 } from './channel-outbound.v1.js'

export type ChannelRichtextInlineV2 =
  | { readonly type: 'text'; readonly text: string; readonly style: 'plain' | 'strong' | 'emphasis' }
  | { readonly type: 'mention'; readonly userId: string }

export type ChannelRichtextBlockV2 =
  | { readonly text: string; readonly style: 'plain' | 'strong' | 'emphasis' | 'code' }
  | { readonly type: 'paragraph'; readonly nodes: readonly ChannelRichtextInlineV2[] }

export type ChannelOutboundContentV2 =
  | Exclude<ChannelOutboundContentV1, { readonly type: 'richtext' }>
  | { readonly type: 'richtext'; readonly blocks: readonly ChannelRichtextBlockV2[] }

export interface ChannelMessageSendV2 extends Omit<ChannelMessageSendV1, 'contract' | 'schemaVersion' | 'content'> {
  readonly contract: 'cordisx.channel-message-send/v2'
  readonly schemaVersion: 2
  readonly content: ChannelOutboundContentV2
}

export interface ChannelOutboundCapabilitiesV2 extends Omit<ChannelOutboundCapabilitiesV1, 'contract' | 'schemaVersion'> {
  readonly contract: 'cordisx.channel-outbound-capabilities/v2'
  readonly schemaVersion: 2
  readonly richtext: { readonly paragraphs: boolean; readonly mentions: boolean }
}

export interface ChannelOutboundV2 {
  capabilities(target: ChannelThreadRef): Promise<ChannelOutboundCapabilitiesV2>
  prepare(request: ChannelMediaPrepareRequestV1): Promise<ChannelPreparedMediaV1>
  send(request: ChannelMessageSendV2): Promise<ChannelSendHandleV1>
}
