import type { ChannelRuntimeContextV2 } from '@cordisx/protocol/channel-runtime/v2'
import type {
  ChannelMediaSourceV1,
  ChannelMessageSendV1,
  ChannelPreparedMediaHandleV1,
} from '@cordisx/protocol/channel-outbound/v1'
import type { ChannelThreadRef } from './channel-runtime.v1.js'

declare const context: ChannelRuntimeContextV2
declare const target: ChannelThreadRef
declare const source: ChannelMediaSourceV1
declare const handle: ChannelPreparedMediaHandleV1
context.channel.outbound.prepare({
  contract: 'cordisx.channel-media-prepare/v1',
  schemaVersion: 1,
  target,
  type: 'video',
  input: { kind: 'source', source },
})
context.channel.outbound.prepare({
  contract: 'cordisx.channel-media-prepare/v1',
  schemaVersion: 1,
  target,
  type: 'file',
  input: {
    kind: 'bytes',
    bytesBase64: 'YQ==',
    sha256: 'hash',
    size: 1,
    mediaType: 'application/octet-stream',
    format: 'binary',
    filename: 'artifact.bin',
  },
})
const request: ChannelMessageSendV1 = {
  contract: 'cordisx.channel-message-send/v1',
  schemaVersion: 1,
  target,
  kind: 'reply',
  idempotencyKey: 'one',
  content: { type: 'audio', handle },
  fallback: { mode: 'reject' },
}
context.channel.outbound.send(request).then(delivery => delivery.receipt())
context.channel.messages.send({ target, kind: 'reply', text: 'frozen' })
type AssertFalse<Value extends false> = Value
export type RejectUnbrandedHandle = AssertFalse<string extends ChannelPreparedMediaHandleV1 ? true : false>
export type RejectUnbrandedSource = AssertFalse<string extends ChannelMediaSourceV1 ? true : false>
export type RejectMissingFilename = AssertFalse<
  {
    type: 'file'
    mediaType: string
    size: number
    sha256: string
    format: 'binary'
  } extends import('./channel-outbound.v1.js').ChannelMediaMetadataV1 ? true : false
>
export type RejectPathInput = AssertFalse<
  { kind: 'path'; path: string } extends Parameters<typeof context.channel.outbound.prepare>[0]['input'] ? true : false
>
