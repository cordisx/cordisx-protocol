import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import Ajv2020 from 'ajv/dist/2020.js'
const schema = JSON.parse(
  await readFile(new URL('../schemas/channel-remote-history-request.v1.schema.json', import.meta.url), 'utf8'),
)
const validate = new Ajv2020({ strict: true }).compile(schema)
const request = {
  account: { adapterId: 'feishu', accountId: 'app', tenantId: 'tenant' },
  conversationId: 'oc_chat',
  kind: 'group',
  startTime: '1',
  endTime: '2',
}
assert.equal(validate(request), true)
for (
  const invalid of [
    { ...request, pageSize: 51 },
    { ...request, pageSize: 0 },
    { ...request, startTime: 'today' },
    { ...request, conversationId: 'ou_user' },
    { ...request, secret: 'no' },
    { ...request, account: { ...request.account, tenantId: '' } },
  ]
) assert.equal(validate(invalid), false)

const resultSchema = JSON.parse(
  await readFile(new URL('../schemas/channel-remote-history-result.v1.schema.json', import.meta.url), 'utf8'),
)
const result = new Ajv2020({ strict: true }).compile(resultSchema)
const page = {
  status: 'ok',
  source: 'remote',
  account: request.account,
  conversation: { id: 'oc_chat', kind: 'group' },
  startTime: '1',
  endTime: '2',
  order: 'asc',
  hasMore: false,
  messages: [{ mentions: [] }],
}
assert.equal(result(page), true)
assert.equal(result({ ...page, hasMore: true }), false)
assert.equal(result({ ...page, hasMore: true, pageToken: 'next' }), true)
assert.equal(result({ status: 'rejected', code: 'CHANNEL_REMOTE_HISTORY_PERMISSION_DENIED' }), true)
