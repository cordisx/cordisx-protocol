import type { ChannelThreadRef } from './channel-runtime.v1.js'
import type { ChannelMediaPrepareRequestV1, ChannelPreparedMediaV1, ChannelSendHandleV1 } from './channel-outbound.v1.js'
import type { ChannelMessageSendV2, ChannelOutboundCapabilitiesV2, ChannelOutboundContentV2, ChannelRichtextInlineV2, ChannelRichtextBlockV2 } from './channel-outbound.v2.js'

export type ChannelCodeLanguageV3 = 'PYTHON' | 'C' | 'CPP' | 'GO' | 'JAVA' | 'KOTLIN' | 'SWIFT' | 'PHP' | 'RUBY' | 'RUST' | 'JAVASCRIPT' | 'TYPESCRIPT' | 'BASH' | 'SHELL' | 'SQL' | 'JSON' | 'XML' | 'YAML' | 'HTML' | 'THRIFT'

export type ChannelRichtextInlineV3 =
  | ChannelRichtextInlineV2
  | { readonly type: 'link'; readonly text: string; readonly url: string }
  | { readonly type: 'image'; readonly handle: string }

export type ChannelRichtextBlockV3 =
  | Exclude<ChannelRichtextBlockV2, { readonly type: 'paragraph' }>
  | { readonly type: 'paragraph'; readonly nodes: readonly ChannelRichtextInlineV3[] }
  | { readonly type: 'inline-code'; readonly text: string }
  | { readonly type: 'code'; readonly text: string; readonly language?: ChannelCodeLanguageV3 }

export type ChannelOutboundContentV3 =
  | Exclude<ChannelOutboundContentV2, { readonly type: 'richtext' }>
  | { readonly type: 'richtext'; readonly blocks: readonly ChannelRichtextBlockV3[] }

export interface ChannelMessageSendV3 extends Omit<ChannelMessageSendV2, 'contract' | 'schemaVersion' | 'content'> {
  readonly contract: 'cordisx.channel-message-send/v3'
  readonly schemaVersion: 3
  readonly content: ChannelOutboundContentV3
}

export interface ChannelOutboundCapabilitiesV3 extends Omit<ChannelOutboundCapabilitiesV2, 'contract' | 'schemaVersion' | 'richtext'> {
  readonly contract: 'cordisx.channel-outbound-capabilities/v3'
  readonly schemaVersion: 3
  readonly richtext: {
    readonly paragraphs: boolean
    readonly mentions: boolean
    readonly links: boolean
    readonly preparedImages: boolean
    readonly inlineCode: boolean
    readonly inlineCodeMode: 'standalone-paragraph'
    readonly codeLanguages: readonly ChannelCodeLanguageV3[]
  }
}

export interface ChannelOutboundV3 {
  capabilities(target: ChannelThreadRef): Promise<ChannelOutboundCapabilitiesV3>
  prepare(request: ChannelMediaPrepareRequestV1): Promise<ChannelPreparedMediaV1>
  send(request: ChannelMessageSendV3): Promise<ChannelSendHandleV1>
}
