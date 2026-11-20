import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import Ajv2020 from 'ajv/dist/2020.js'
const ajv = new Ajv2020({ strict: true })
const load = async name => JSON.parse(await readFile(new URL(`../schemas/${name}.v1.schema.json`, import.meta.url)))
const request = ajv.compile(await load('channel-message-read-request'))
const result = ajv.compile(await load('channel-message-read-result'))
const input = {
  account: { adapterId: 'feishu', accountId: 'app', tenantId: 'tenant' },
  conversationId: 'oc_chat',
  kind: 'group',
  messageId: 'om_parent',
}
assert.equal(request(input), true)
assert.equal(request({ ...input, messageId: '' }), false)
assert.equal(request({ ...input, account: { ...input.account, tenantId: '' } }), false)
assert.equal(request({ ...input, token: 'not-allowed' }), false)
assert.equal(
  result({ status: 'ok', message: { messageId: 'om_parent', parentId: 'om_older', sender: { name: 'Alice' } } }),
  true,
)
assert.equal(result({ status: 'unavailable', code: 'CHANNEL_MESSAGE_READ_FAILED' }), true)
assert.equal(result({ status: 'ok', message: {} }), false)
assert.equal(result({ status: 'ok', message: { messageId: 'om_parent', secret: 'not-allowed' } }), false)
