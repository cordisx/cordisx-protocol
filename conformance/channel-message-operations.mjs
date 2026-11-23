import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import Ajv2020 from 'ajv/dist/2020.js'

const ajv = new Ajv2020({ strict: true })
const load = async name =>
  JSON.parse(await readFile(new URL(`../schemas/channel-message-operation-${name}.v1.schema.json`, import.meta.url)))
const request = ajv.compile(await load('request'))
const result = ajv.compile(await load('result'))
const capabilities = ajv.compile(await load('capabilities'))
const base = {
  account: { adapterId: 'feishu', accountId: 'app', tenantId: 'tenant' },
  conversationId: 'oc_chat',
  kind: 'group',
}
for (const operation of ['message-recall', 'pin-add', 'pin-remove']) {
  const input = { ...base, operation, operationId: 'stable', messageId: 'om_owned' }
  assert.equal(request(input), true)
  assert.equal(request({ ...input, rawToken: 'forged' }), false)
  assert.equal(request({ ...input, operationId: '' }), false)
}
assert.equal(
  request({
    ...base,
    operation: 'message-edit',
    operationId: 'edit',
    messageId: 'om_owned',
    content: { type: 'text', text: 'new' },
  }),
  true,
)
assert.equal(
  request({
    ...base,
    operation: 'card-update',
    operationId: 'card',
    messageId: 'om_owned',
    card: { template: 'status', title: 'Work', body: 'Details', status: 'running' },
  }),
  true,
)
assert.equal(
  request({
    ...base,
    operation: 'card-update',
    operationId: 'card',
    messageId: 'om_owned',
    card: { template: 'notice', title: 'Work', body: 'Details', callback: {} },
  }),
  false,
)
for (const operation of ['read-users', 'reaction-list']) {
  assert.equal(request({ ...base, operation, messageId: 'om_source', pageSize: 50 }), true)
  assert.equal(request({ ...base, operation, messageId: 'om_source', pageSize: 51 }), false)
}
assert.equal(request({ ...base, operation: 'pin-list', pageSize: 20 }), true)
assert.equal(request({ ...base, operation: 'pin-list', kind: 'direct' }), false)
assert.equal(result({ status: 'unknown', code: 'CHANNEL_OPERATION_TIMEOUT', operationId: 'stable' }), true)
assert.equal(
  result({
    status: 'ok',
    operation: 'reaction-list',
    items: [{ type: 'reaction', reactionId: 'reaction', emojiType: 'OnIt' }],
    hasMore: false,
  }),
  true,
)
assert.equal(
  result({
    status: 'ok',
    operation: 'read-users',
    items: [{ type: 'reader', userId: 'ou_user', tenantToken: 'secret' }],
  }),
  false,
)
const entry = {
  operation: 'message-edit',
  implementation: 'supported',
  authorization: 'not-verified',
  scope: 'own-message',
  write: true,
  permissionAlternatives: ['im:message:update'],
  restrictions: ['text-post-only'],
}
assert.equal(capabilities([entry]), true)
assert.equal(capabilities([{ ...entry, authorization: 'granted' }]), false)
