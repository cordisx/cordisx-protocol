import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'

const read = async path => JSON.parse(await readFile(new URL(`../${path}`, import.meta.url), 'utf8'))
const ajv = new Ajv2020({ strict: true, allErrors: true })
addFormats(ajv)
for (
  const name of [
    'channel-common.v1',
    'channel-message-send.v1',
    'channel-message-send.v2',
    'channel-outbound-capabilities.v2',
  ]
) {
  ajv.addSchema(await read(`schemas/${name}.schema.json`))
}
const check = name =>
  ajv.getSchema(`https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/${name}.schema.json`)
const original = await read('test-vectors/channel-outbound/v1.json')
const vectors = await read('test-vectors/channel-outbound/v2.json')
const request = {
  ...original.send,
  contract: 'cordisx.channel-message-send/v2',
  schemaVersion: 2,
  content: vectors.content,
}
const send = check('channel-message-send.v2')
assert.equal(send(request), true)
assert.equal(check('channel-message-send.v1')({ ...original.send, content: vectors.content }), false)
for (const content of original.contents) assert.equal(send({ ...request, content }), true)
for (const userId of ['', 'all', 'ALL', 'everyone', 'here', '@name', 'Display Name', 'ou_\nother', 'a'.repeat(257)]) {
  assert.equal(
    send({
      ...request,
      content: { type: 'richtext', blocks: [{ type: 'paragraph', nodes: [{ type: 'mention', userId }] }] },
    }),
    false,
  )
}
for (
  const nodes of [[], Array(129).fill({ type: 'mention', userId: 'ou_verified' }), [{
    type: 'mention',
    userId: 'ou_verified',
    verified: true,
  }], [{ type: 'text', text: 'code', style: 'code' }]]
) {
  assert.equal(send({ ...request, content: { type: 'richtext', blocks: [{ type: 'paragraph', nodes }] } }), false)
}
const capability = {
  ...original.capabilities,
  contract: 'cordisx.channel-outbound-capabilities/v2',
  schemaVersion: 2,
  richtext: vectors.richtext,
}
const caps = check('channel-outbound-capabilities.v2')
assert.equal(caps(capability), true)
assert.equal(caps({ ...capability, richtext: undefined }), false)
assert.equal(caps({ ...capability, types: ['text'] }), false)
assert.equal(caps({ ...capability, richtext: { paragraphs: false, mentions: true } }), false)
assert.equal(caps({ ...capability, types: ['text'], richtext: { paragraphs: false, mentions: false } }), true)

const authority = { adapterId: 'feishu', accountId: 'app', tenantId: 'tenant', conversationId: 'group', generation: 1 }
const evidence = { ...authority, userId: 'ou_verified', authenticated: true, accepted: true }
const verified = (target, userId, sender) =>
  sender.authenticated && sender.accepted && sender.userId === userId
  && Object.keys(authority).every(key => sender[key] === target[key])
assert.equal(verified(authority, 'ou_verified', evidence), true)
for (
  const [key, value] of [['adapterId', 'lark'], ['accountId', 'other'], ['tenantId', 'other'], [
    'conversationId',
    'other',
  ], ['generation', 2]]
) {
  assert.equal(verified({ ...authority, [key]: value }, 'ou_verified', evidence), false)
}
assert.equal(verified(authority, 'ou_forged', evidence), false)
assert.equal(verified(authority, 'ou_verified', { ...evidence, accepted: false }), false)
assert.equal(verified(authority, 'ou_verified', { ...evidence, authenticated: false }), false)
const metadata = await read('package.json')
for (
  const [subpath, file] of [['channel-outbound/v2', 'channel-outbound.v2.d.ts'], [
    'channel-runtime/v3',
    'channel-runtime.v3.d.ts',
  ]]
) {
  assert.equal(metadata.exports[`./${subpath}`], `./types/${file}`)
  assert.equal(metadata.files.includes(`types/${file}`), true)
}
console.log('Channel outbound v2: inline nodes, frozen v1 rejection, capabilities and scoped evidence passed.')
