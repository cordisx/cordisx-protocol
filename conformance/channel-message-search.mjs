import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import Ajv2020 from 'ajv/dist/2020.js'

const schema = async name => JSON.parse(await readFile(new URL(`../schemas/${name}`, import.meta.url), 'utf8'))
const ajv = new Ajv2020({ strict: true })
ajv.addSchema(await schema('channel-remote-history-request.v1.schema.json'))
ajv.addSchema(await schema('channel-remote-history-result.v1.schema.json'))
const validate = ajv.compile(await schema('channel-message-search-request.v1.schema.json'))
const request = {
  account: { adapterId: 'feishu', accountId: 'app', tenantId: 'tenant' },
  conversationId: 'oc_chat',
  kind: 'group',
  query: 'project',
  startTime: '1',
  endTime: '3',
}
assert.equal(validate(request), true)
for (
  const invalid of [
    { ...request, query: '' },
    { ...request, query: '   ' },
    { ...request, query: '\u0000' },
    { ...request, query: 'x'.repeat(1025) },
    { ...request, startTime: '-1' },
    { ...request, endTime: '1.2' },
    { ...request, pageSize: 51 },
    { ...request, pageToken: '\n' },
    { ...request, chatIds: ['other'] },
    { ...request, senderName: 'owner' },
  ]
) assert.equal(validate(invalid), false)
const result = ajv.compile(await schema('channel-message-search-result.v1.schema.json'))
const page = {
  status: 'ok',
  source: 'remote',
  account: request.account,
  conversation: { id: request.conversationId, kind: request.kind },
  query: request.query,
  startTime: request.startTime,
  endTime: request.endTime,
  hasMore: false,
  messages: [{ messageId: 'om_hit', createTime: '2000', mentions: [] }],
}
assert.equal(result(page), true)
assert.equal(result({ ...page, hasMore: true }), false)
assert.equal(result({ ...page, hasMore: true, pageToken: 'next' }), true)
assert.equal(result({ ...page, messageIds: ['om_hit'] }), false)
assert.equal(result({ ...page, messages: [{ mentions: [] }] }), false)
assert.equal(result({ status: 'unavailable', code: 'CHANNEL_SEARCH_DETAIL_UNAVAILABLE' }), true)

const verifiedPage = (input, hits) => {
  if (BigInt(input.startTime) >= BigInt(input.endTime)) return false
  const identities = new Set()
  return hits.every(hit => {
    if (!hit || hit.chatId !== input.conversationId || !hit.messageId || identities.has(hit.messageId)) return false
    identities.add(hit.messageId)
    if (!/^[0-9]+$/u.test(hit.createTime ?? '')) return false
    const created = BigInt(hit.createTime)
    return created >= BigInt(input.startTime) * 1000n && created < BigInt(input.endTime) * 1000n
  })
}
const hit = { messageId: 'om_hit', chatId: 'oc_chat', createTime: '2000' }
assert.equal(verifiedPage(request, [hit]), true)
assert.equal(verifiedPage(request, []), true)
for (
  const hits of [[null], [hit, hit], [{ ...hit, chatId: 'other' }], [{ ...hit, createTime: undefined }], [{
    ...hit,
    createTime: '3000',
  }], [{ ...hit, createTime: '999' }]]
) {
  assert.equal(verifiedPage(request, hits), false)
}
assert.equal(verifiedPage({ ...request, endTime: '1' }, []), false)
