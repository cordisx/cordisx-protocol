import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import Ajv2020 from 'ajv/dist/2020.js'

const schema = async name => JSON.parse(await readFile(new URL(`../schemas/${name}`, import.meta.url), 'utf8'))
const ajv = new Ajv2020({ strict: true })
ajv.addSchema(await schema('channel-remote-history-request.v1.schema.json'))
ajv.addSchema(await schema('channel-remote-history-result.v1.schema.json'))
const validate = ajv.compile(await schema('channel-thread-history-request.v1.schema.json'))
const request = {
  account: { adapterId: 'feishu', accountId: 'app', tenantId: 'tenant' },
  conversationId: 'oc_chat',
  kind: 'group',
  threadId: 'omt_topic',
  anchorMessageId: 'om_anchor',
}
assert.equal(validate(request), true)
assert.equal(
  validate({ ...request, account: { ...request.account, adapterId: 'wecom' }, threadId: 'opaque-topic' }),
  true,
)
for (
  const invalid of [
    { ...request, pageSize: 0 },
    { ...request, pageSize: 51 },
    { ...request, threadId: '' },
    { ...request, anchorMessageId: '' },
    { ...request, startTime: '1' },
    { ...request, pageToken: '\n' },
    { ...request, pageToken: 'x'.repeat(2049) },
    { ...request, account: { ...request.account, tenantId: '' } },
  ]
) assert.equal(validate(invalid), false)
const result = ajv.compile(await schema('channel-thread-history-result.v1.schema.json'))
const page = {
  status: 'ok',
  source: 'remote',
  account: request.account,
  conversation: { id: request.conversationId, kind: request.kind },
  threadId: request.threadId,
  anchorMessageId: request.anchorMessageId,
  order: 'asc',
  hasMore: false,
  messages: [{ messageId: 'om_sibling', threadId: 'omt_topic', mentions: [] }],
}
assert.equal(result(page), true)
assert.equal(result({ ...page, hasMore: true }), false)
assert.equal(result({ ...page, hasMore: true, pageToken: 'next' }), true)
assert.equal(result({ ...page, startTime: '1' }), false)
assert.equal(result({ status: 'unavailable', code: 'CHANNEL_THREAD_HISTORY_TIMEOUT' }), true)
assert.equal(result({ status: 'ok', messages: [] }), false)
