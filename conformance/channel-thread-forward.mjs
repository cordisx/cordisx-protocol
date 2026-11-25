import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'

const read = async name => JSON.parse(await readFile(new URL(`../${name}`, import.meta.url), 'utf8'))
const ajv = new Ajv2020({ strict: true })
addFormats(ajv)
ajv.addSchema(await read('schemas/channel-common.v1.schema.json'))
const validate = ajv.compile(await read('schemas/channel-thread-forward.v1.schema.json'))
const vectors = await read('test-vectors/channel-thread-forward/v1.json')
const request = vectors.request
assert.equal(validate(request), true)
for (
  const invalid of [
    { ...request, messageIds: ['om_anchor'] },
    { ...request, operation: 'forward' },
    { ...request, threadId: '' },
    { ...request, anchorMessageId: '' },
    { ...request, operationId: 'x'.repeat(129) },
    { ...request, threadId: '\n' },
    { ...request, target: { ...request.target, kind: 'broadcast' } },
    { ...request, target: { ...request.target, replyMode: 'thread' } },
  ]
) assert.equal(validate(invalid), false)
const receipt = ajv.compile(await read('schemas/channel-thread-forward-receipt.v1.schema.json'))
assert.equal(receipt(vectors.sent), true)
const { externalMessageId, ...base } = vectors.sent
assert.equal(receipt(base), false)
assert.equal(receipt({ ...base, state: 'sending' }), true)
assert.equal(receipt({ ...base, state: 'unknown', code: 'FORWARD_EFFECT_UNCERTAIN' }), true)
assert.equal(receipt({ ...base, state: 'failed', code: 'SOURCE_MESSAGE_DENIED' }), true)
assert.equal(receipt({ ...vectors.sent, state: 'partial' }), false)
assert.equal(receipt({ ...vectors.sent, invalidMessageIds: [] }), false)
assert.equal(receipt({ ...base, state: 'unknown', code: 'private error text' }), false)
console.log(
  'Whole-thread forwarding v1 shape conformance passed; authorization and native effects require Host evidence',
)
