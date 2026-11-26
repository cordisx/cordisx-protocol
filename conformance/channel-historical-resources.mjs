import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import Ajv2020 from 'ajv/dist/2020.js'

const schema = async name => JSON.parse(await readFile(new URL(`../schemas/${name}`, import.meta.url), 'utf8'))
const ajv = new Ajv2020({ strict: true })
ajv.addSchema(await schema('channel-remote-history-request.v1.schema.json'))
const request = ajv.compile(await schema('channel-historical-resource-request.v1.schema.json'))
const result = ajv.compile(await schema('channel-historical-resource-result.v1.schema.json'))
const vector = JSON.parse(
  await readFile(new URL('../test-vectors/channel-historical-resources.v1.json', import.meta.url), 'utf8'),
)
assert.equal(request(vector.request), true)
assert.equal(result(vector.result), true)
for (
  const invalid of [
    { ...vector.request, fileKey: 'key' },
    { ...vector.request, url: 'https://example.test' },
    { ...vector.request, index: 16 },
    { ...vector.request, length: 65537 },
    { ...vector.request, offset: -1 },
  ]
) {
  assert.equal(request(invalid), false)
}
const missingRange = { ...vector.request }
delete missingRange.length
assert.equal(request(missingRange), false)
assert.equal(result({ ...vector.result, resource: { state: 'expired' } }), false)
assert.equal(result({ ...vector.result, resource: { ...vector.result.resource, localFile: '/tmp/private' } }), false)
for (const state of ['expired', 'not-prepared', 'unavailable']) {
  const status = { ...vector.result, resource: { state } }
  delete status.chunk
  assert.equal(result(status), true)
}
const chunkConsistent = value => {
  const { chunk, resource } = value
  if (!chunk) return true
  if (resource.state !== 'ready') return false
  const bytes = Buffer.from(chunk.base64, 'base64')
  return bytes.length > 0 && bytes.length <= 65536 && chunk.nextOffset === chunk.offset + bytes.length
    && chunk.nextOffset <= resource.attachment.size && chunk.hasMore === (chunk.nextOffset < resource.attachment.size)
}
assert.equal(chunkConsistent(vector.result), true)
assert.equal(chunkConsistent({ ...vector.result, chunk: { ...vector.result.chunk, nextOffset: 3 } }), false)
assert.equal(chunkConsistent({ ...vector.result, chunk: { ...vector.result.chunk, hasMore: true } }), false)
assert.equal(result({ status: 'unavailable', code: 'CHANNEL_RESOURCE_PERMISSION_DENIED' }), true)
