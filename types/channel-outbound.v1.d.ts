import type { ChannelOutboundDelivery, ChannelThreadRef } from './channel-runtime.v1.js'

declare const sourceScope: unique symbol
declare const mediaScope: unique symbol

export type ChannelMediaSourceV1 = string & { readonly [sourceScope]: true }
export type ChannelPreparedMediaHandleV1 = string & { readonly [mediaScope]: true }
export type ChannelOutboundTypeV1 = 'text' | 'image' | 'audio' | 'file' | 'video' | 'richtext' | 'card'
export type ChannelMediaTypeV1 = 'image' | 'audio' | 'file' | 'video'
export type ChannelMediaFormatV1 = 'png' | 'jpeg' | 'opus' | 'mp4' | 'pdf' | 'binary'

export type ChannelMediaMetadataV1 = {
  readonly mediaType: string
  readonly size: number
  readonly sha256: string
} & (
  | { readonly type: 'image'; readonly format: 'png' | 'jpeg'; readonly filename?: string; readonly durationMs?: never }
  | { readonly type: 'audio'; readonly format: 'opus'; readonly filename?: string; readonly durationMs?: number }
  | { readonly type: 'file'; readonly format: 'pdf' | 'binary'; readonly filename: string; readonly durationMs?: never }
  | { readonly type: 'video'; readonly format: 'mp4'; readonly filename: string; readonly durationMs?: number }
)

export type ChannelMediaPrepareRequestV1 = {
  readonly contract: 'cordisx.channel-media-prepare/v1'
  readonly schemaVersion: 1
  readonly target: ChannelThreadRef
} & (
  | { readonly type: ChannelMediaTypeV1; readonly input: { readonly kind: 'source'; readonly source: ChannelMediaSourceV1 } }
  | { [MediaType in ChannelMediaTypeV1]: {
    readonly type: MediaType
    readonly input: { readonly kind: 'bytes'; readonly bytesBase64: string } & Omit<Extract<ChannelMediaMetadataV1, { readonly type: MediaType }>, 'type'>
  } }[ChannelMediaTypeV1]
)

export type ChannelPreparedMediaV1 = ChannelMediaMetadataV1 & {
  readonly contract: 'cordisx.channel-prepared-media/v1'
  readonly schemaVersion: 1
  readonly handle: ChannelPreparedMediaHandleV1
  readonly expiresAt: string
}

export type ChannelOutboundContentV1 =
  | { readonly type: 'text'; readonly text: string }
  | { readonly type: ChannelMediaTypeV1; readonly handle: ChannelPreparedMediaHandleV1 }
  | { readonly type: 'richtext'; readonly blocks: readonly { readonly text: string; readonly style: 'plain' | 'strong' | 'emphasis' | 'code' }[] }
  | { readonly type: 'card'; readonly title: string; readonly body: string }

export interface ChannelMessageSendV1 {
  readonly contract: 'cordisx.channel-message-send/v1'
  readonly schemaVersion: 1
  readonly target: ChannelThreadRef
  readonly kind: ChannelOutboundDelivery['kind']
  readonly idempotencyKey: string
  readonly content: ChannelOutboundContentV1
  readonly fallback: { readonly mode: 'reject' } | { readonly mode: 'text'; readonly text: string }
}

export interface ChannelOutboundCapabilitiesV1 {
  readonly contract: 'cordisx.channel-outbound-capabilities/v1'
  readonly schemaVersion: 1
  readonly target: ChannelThreadRef
  readonly types: readonly ChannelOutboundTypeV1[]
  readonly maxMediaBytes: number
}

export type ChannelSendReceiptV1 = {
  readonly contract: 'cordisx.channel-send-receipt/v1'
  readonly schemaVersion: 1
  readonly deliveryId: string
  readonly idempotencyKey: string
  readonly requestedType: ChannelOutboundTypeV1
  readonly effectiveType: ChannelOutboundTypeV1
  readonly downgraded: boolean
} & (
  | { readonly status: 'queued' | 'sending' | 'retrying' | 'cancelled' }
  | { readonly status: 'sent'; readonly externalMessageId: string; readonly recallHandle?: string }
  | { readonly status: 'failed' | 'unknown'; readonly code: string }
)

export interface ChannelSendHandleV1 {
  readonly deliveryId: string
  receipt(): Promise<ChannelSendReceiptV1>
  cancel(): Promise<'cancelled' | 'irreversible' | 'not-found'>
}

export interface ChannelOutboundV1 {
  capabilities(target: ChannelThreadRef): Promise<ChannelOutboundCapabilitiesV1>
  prepare(request: ChannelMediaPrepareRequestV1): Promise<ChannelPreparedMediaV1>
  send(request: ChannelMessageSendV1): Promise<ChannelSendHandleV1>
}

export type ChannelResolvedMediaV1 = ChannelMediaMetadataV1 & {
  readonly bytes: Uint8Array
}

export interface ChannelAdapterMediaV1 {
  resolve(handle: ChannelPreparedMediaHandleV1, deliveryId: string): Promise<ChannelResolvedMediaV1>
}

export interface ChannelMessageDeliveryV1 {
  readonly deliveryId: string
  readonly request: ChannelMessageSendV1
  readonly createdAt: string
}
