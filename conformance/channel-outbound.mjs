import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'
import { OutboundModel, validateBytes } from './channel-outbound-model.mjs'

const read = async path => JSON.parse(await readFile(new URL(`../${path}`, import.meta.url), 'utf8'))
const ajv = new Ajv2020({ strict: true, allErrors: true })
addFormats(ajv)
const names = [
  'channel-common',
  'channel-media-prepare',
  'channel-prepared-media',
  'channel-message-send',
  'channel-message-delivery',
  'channel-outbound-capabilities',
  'channel-send-receipt',
]
for (const name of names) ajv.addSchema(await read(`schemas/${name}.v1.schema.json`))
const check = name =>
  ajv.getSchema(`https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/${name}.v1.schema.json`)
const vectors = await read('test-vectors/channel-outbound/v1.json')
const send = check('channel-message-send')
for (const content of vectors.contents) {
  assert.equal(send({ ...vectors.send, content }), true)
  assert.equal(send({ ...vectors.send, content: { ...content, url: 'https://invalid.example' } }), false)
}
for (const extra of [{ path: '/etc/passwd' }, { taskId: 'forged' }, { account: {} }, { operationId: 'unregistered' }]) {
  assert.equal(send({ ...vectors.send, ...extra }), false)
}
assert.equal(send({ ...vectors.send, fallback: { mode: 'automatic' } }), false)
assert.equal(send({ ...vectors.send, content: { type: 'image', handle: 'https://invalid.example' } }), false)
const prepare = check('channel-media-prepare')
assert.equal(prepare(vectors.prepare), true)
assert.equal(validateBytes(vectors.prepare).toString(), 'a')
for (
  const input of [
    { ...vectors.prepare.input, path: '/etc/passwd' },
    { ...vectors.prepare.input, size: 131073 },
    { ...vectors.prepare.input, bytesBase64: 'YQ' },
    { ...vectors.prepare.input, sha256: 'BAD' },
  ]
) assert.equal(prepare({ ...vectors.prepare, input }), false)
for (
  const input of [
    { ...vectors.prepare.input, size: 2 },
    { ...vectors.prepare.input, sha256: '0'.repeat(64) },
    { ...vectors.prepare.input, bytesBase64: 'YR==' },
    { ...vectors.prepare.input, bytesBase64: Buffer.alloc(131073).toString('base64') },
  ]
) assert.throws(() => validateBytes({ ...vectors.prepare, input }))
const bounded = Buffer.alloc(131072)
assert.equal(
  validateBytes({
    ...vectors.prepare,
    input: {
      ...vectors.prepare.input,
      bytesBase64: bounded.toString('base64'),
      size: bounded.length,
      sha256: createHash('sha256').update(bounded).digest('hex'),
    },
  }).length,
  131072,
)
assert.throws(() => validateBytes({ ...vectors.prepare, extra: 'x'.repeat(196608) }))
assert.equal(check('channel-prepared-media')(vectors.prepared), true)
assert.equal(check('channel-prepared-media')({ ...vectors.prepared, filename: undefined }), false)
assert.equal(check('channel-prepared-media')({ ...vectors.prepared, filename: '../artifact.bin' }), false)
for (const filename of [' name.bin', 'name.bin ', '.', '..', 'name.', 'name\u0000.bin', 'a'.repeat(256)]) {
  assert.equal(check('channel-prepared-media')({ ...vectors.prepared, filename }), false)
}
assert.equal(check('channel-prepared-media')({ ...vectors.prepared, filename: 'a'.repeat(255) }), true)
assert.equal(check('channel-prepared-media')({ ...vectors.prepared, filename: '😀'.repeat(255) }), true)
assert.equal(check('channel-prepared-media')({ ...vectors.prepared, format: 'pdf', filename: 'file.bin' }), false)
assert.equal(check('channel-prepared-media')({ ...vectors.prepared, format: 'pdf', filename: 'file.PDF' }), true)
assert.equal(check('channel-prepared-media')({ ...vectors.prepared, durationMs: 1 }), false)
assert.equal(prepare({ ...vectors.prepare, input: { ...vectors.prepare.input, format: 'png' } }), false)
assert.equal(prepare({ ...vectors.prepare, input: { ...vectors.prepare.input, filename: undefined } }), false)
assert.equal(check('channel-outbound-capabilities')(vectors.capabilities), true)
assert.equal(
  check('channel-message-delivery')({
    deliveryId: 'delivery',
    request: vectors.send,
    createdAt: '2026-11-23T00:00:00Z',
  }),
  true,
)
for (const status of ['queued', 'sending', 'retrying', 'cancelled', 'sent', 'failed', 'unknown']) {
  const receipt = {
    ...vectors.receipt,
    status,
    ...(status === 'sent'
      ? { externalMessageId: 'external' }
      : ['failed', 'unknown'].includes(status)
      ? { code: 'CHANNEL_SEND_FAILED' }
      : {}),
  }
  assert.equal(check('channel-send-receipt')(receipt), true)
}
assert.equal(check('channel-send-receipt')({ ...vectors.receipt, status: 'sent' }), false)
assert.equal(check('channel-send-receipt')({ ...vectors.receipt, externalMessageId: 'fake' }), false)
const scope = { owner: 'caller', profile: 'profile', generation: 1, taskVerified: true, targetAllowed: true }
const model = new OutboundModel()
const handle = model.prepare(scope, vectors.send.target, 'image', Buffer.from('immutable'))
const request = { ...vectors.send, content: { type: 'image', handle } }
for (
  const mutation of [{ owner: 'other' }, { profile: 'other' }, { generation: 2 }, { taskVerified: false }, {
    targetAllowed: false,
  }]
) assert.throws(() => model.send({ ...scope, ...mutation }, request, ['image']))
assert.throws(() => model.send(scope, { ...request, target: { ...request.target, threadId: 'other' } }, ['image']))
assert.throws(() => model.send(scope, { ...request, content: { type: 'video', handle } }, ['video']))
assert.throws(() => model.send(scope, request, ['text']))
const delivery = model.send(scope, request, ['image'])
assert.equal(model.send(scope, request, ['text']), delivery)
assert.throws(() => model.send(scope, { ...request, kind: 'failure' }, ['image']))
const adapter = { deliveryId: delivery.deliveryId, generation: 1, accountId: request.target.accountId }
assert.equal(model.resolve(adapter, handle, delivery).toString(), 'immutable')
for (const mutation of [{ accountId: 'other' }, { generation: 2 }, { deliveryId: 'other' }]) {
  assert.throws(() => model.resolve({ ...adapter, ...mutation }, handle, delivery))
}
const downgraded = model.send(scope, {
  ...request,
  idempotencyKey: 'fallback',
  fallback: { mode: 'text', text: 'explicit fallback' },
}, ['text'])
assert.equal(downgraded.effectiveType, 'text')
assert.throws(() => model.resolve({ ...adapter, deliveryId: downgraded.deliveryId }, handle, downgraded))
model.media.get(handle).revoked = true
assert.throws(() => model.resolve(adapter, handle, delivery))
assert.throws(() => model.send(scope, request, ['image']))
const frozen = await readFile(new URL('../types/channel-runtime.v1.d.ts', import.meta.url))
assert.equal(
  createHash('sha256').update(frozen).digest('hex'),
  'd55677f2f63538d0cb5438f8e62c8ba8f77bf40f9d2d66c075c32d93cd6d8a3d',
)
const metadata = await read('package.json')
for (
  const [subpath, file] of [['channel-outbound/v1', 'channel-outbound.v1.d.ts'], [
    'channel-runtime/v2',
    'channel-runtime.v2.d.ts',
  ]]
) {
  assert.equal(metadata.exports[`./${subpath}`], `./types/${file}`)
  assert.equal(metadata.files.includes(`types/${file}`), true)
}
console.log(
  'Channel outbound: shapes, bytes bounds/integrity, scoped model, fallback, receipts, idempotency and frozen v1 passed.',
)
