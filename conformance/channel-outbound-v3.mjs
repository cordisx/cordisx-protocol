import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'

const read = async file => JSON.parse(await readFile(new URL(`../${file}`, import.meta.url), 'utf8'))
const ajv = new Ajv2020({ strict: true, allErrors: true })
addFormats(ajv)
for (
  const name of [
    'channel-common.v1',
    'channel-message-send.v1',
    'channel-message-send.v2',
    'channel-message-send.v3',
    'channel-outbound-capabilities.v3',
  ]
) {
  ajv.addSchema(await read(`schemas/${name}.schema.json`))
}
const check = name =>
  ajv.getSchema(`https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/${name}.schema.json`)
const original = await read('test-vectors/channel-outbound/v1.json')
const vectors = await read('test-vectors/channel-outbound/v3.json')
const request = {
  ...original.send,
  contract: 'cordisx.channel-message-send/v3',
  schemaVersion: 3,
  content: vectors.content,
}
const send = check('channel-message-send.v3')
assert.equal(send(request), true, JSON.stringify(send.errors))
for (const version of [1, 2]) {
  assert.equal(
    check(`channel-message-send.v${version}`)({
      ...original.send,
      contract: `cordisx.channel-message-send/v${version}`,
      schemaVersion: version,
      content: vectors.content,
    }),
    false,
  )
}
for (const content of original.contents) assert.equal(send({ ...request, content }), true)
const richtext = blocks => ({ ...request, content: { type: 'richtext', blocks } })
for (
  const url of [
    'javascript:x',
    'file:///tmp/a',
    '//example.org',
    'https://user:password@example.org',
    'https://example.org\\bad',
    'https://example.org/a\nb',
  ]
) {
  assert.equal(send(richtext([{ type: 'paragraph', nodes: [{ type: 'link', text: 'label', url }] }])), false)
}
for (
  const block of [
    { type: 'paragraph', nodes: [{ type: 'inline-code', text: 'mixed' }] },
    { type: 'paragraph', nodes: [{ type: 'image', handle: 'img_vendor' }] },
    { type: 'paragraph', nodes: [{ type: 'image', handle: 'media:valid', image_key: 'forged' }] },
    { type: 'inline-code', text: 'a\nb' },
    { type: 'inline-code', text: '   ' },
    { type: 'code', text: 'x', language: 'unknown' },
  ]
) assert.equal(send(richtext([block])), false)
const capability = {
  ...original.capabilities,
  contract: 'cordisx.channel-outbound-capabilities/v3',
  schemaVersion: 3,
  richtext: vectors.richtext,
}
const caps = check('channel-outbound-capabilities.v3')
assert.equal(caps(capability), true, JSON.stringify(caps.errors))
assert.equal(caps({ ...capability, richtext: { ...vectors.richtext, paragraphs: false } }), false)
assert.equal(caps({ ...capability, richtext: { ...vectors.richtext, inlineCodeMode: 'mixed-native' } }), false)
assert.equal(caps({ ...capability, richtext: { ...vectors.richtext, codeLanguages: ['unknown'] } }), false)
const metadata = await read('package.json')
for (
  const [entry, file] of [['channel-outbound/v3', 'channel-outbound.v3.d.ts'], [
    'channel-runtime/v4',
    'channel-runtime.v4.d.ts',
  ]]
) {
  assert.equal(metadata.exports[`./${entry}`], `./types/${file}`)
  assert.equal(metadata.files.includes(`types/${file}`), true)
}
console.log('Channel outbound v3: typed composition, safe structure, frozen facades and acquisition exports passed.')
