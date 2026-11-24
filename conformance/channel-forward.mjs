import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'

const read = async name => JSON.parse(await readFile(new URL(`../${name}`, import.meta.url), 'utf8'))
const ajv = new Ajv2020({ strict: true })
addFormats(ajv)
ajv.addSchema(await read('schemas/channel-common.v1.schema.json'))
const validate = ajv.compile(await read('schemas/channel-forward.v1.schema.json'))
const vectors = await read('test-vectors/channel-forward/v1.json')
assert.equal(validate(vectors.request), true)
assert.equal(validate({ ...vectors.request, operation: 'merge-forward', messageIds: ['om_one', 'om_two'] }), true)
for (const invalid of vectors.invalid) assert.equal(validate({ ...vectors.request, ...invalid }), false)
assert.equal(
  validate({
    ...vectors.request,
    operation: 'merge-forward',
    messageIds: Array.from({ length: 101 }, (_, index) => `om_${index}`),
  }),
  false,
)
const receipt = ajv.compile(await read('schemas/channel-forward-receipt.v1.schema.json'))
const base = {
  contract: 'cordisx.channel-forward-receipt/v1',
  schemaVersion: 1,
  operation: 'forward',
  operationId: 'one',
}
assert.equal(receipt({ ...base, state: 'sent', externalMessageId: 'om_result', invalidMessageIds: [] }), true)
assert.equal(receipt({ ...base, state: 'sent', invalidMessageIds: [] }), false)
assert.equal(receipt({ ...base, state: 'sent', externalMessageId: 'om_result', invalidMessageIds: ['om_one'] }), false)
assert.equal(receipt({ ...base, state: 'unknown', code: 'UNCERTAIN' }), true)
assert.equal(receipt({ ...base, state: 'unknown', externalMessageId: 'claimed' }), false)
assert.equal(
  receipt({ ...base, state: 'partial', externalMessageId: 'om_result', invalidMessageIds: ['om_one'] }),
  true,
)
console.log('Channel forwarding v1 conformance passed')
