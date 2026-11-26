import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'

const ajv = new Ajv2020({ strict: true })
addFormats(ajv)
const load = async name =>
  JSON.parse(await readFile(new URL(`../schemas/channel-card-action-${name}.v1.schema.json`, import.meta.url)))
const request = ajv.compile(await load('request'))
const result = ajv.compile(await load('result'))
const base = {
  account: { adapterId: 'feishu', accountId: 'app', tenantId: 'tenant' },
  conversationId: 'oc_chat',
  kind: 'direct',
}
const publish = {
  ...base,
  operation: 'card-action-publish',
  operationId: 'stable',
  messageId: 'om_owned',
  expectedVersion: 0,
  template: 'action-notice',
  title: 'Review',
  body: 'Select an option',
  actions: [{ id: 'review', label: 'Review' }],
  expiresInSeconds: 60,
}
assert.equal(request(publish), true)
for (
  const invalid of [
    { ...publish, callback: {} },
    { ...publish, actions: [] },
    { ...publish, actions: Array(6).fill(publish.actions[0]) },
    { ...publish, expiresInSeconds: 3601 },
    { ...publish, expectedVersion: -1 },
    { ...publish, template: 'approval' },
    { ...publish, actions: [{ id: 'review', label: 'Review', command: 'dispatch' }] },
    { ...publish, version: 1 },
  ]
) assert.equal(request(invalid), false)
assert.equal(request({ ...base, operation: 'card-action-read', messageId: 'om_owned', version: 1, pageSize: 50 }), true)
assert.equal(
  request({ ...base, operation: 'card-action-read', messageId: 'om_owned', version: 1, pageSize: 51 }),
  false,
)
assert.equal(request({ ...base, operation: 'card-action-receipt', operationId: 'stable' }), true)
assert.equal(
  request({ ...base, operation: 'card-action-receipt', operationId: 'stable', messageId: 'om_owned' }),
  false,
)
const event = {
  eventId: 'event',
  messageId: 'om_owned',
  version: 1,
  actionId: 'review',
  operatorId: 'ou_verified',
  receivedAt: '2026-11-26T00:00:00.000Z',
}
const page = {
  status: 'ok',
  operation: 'card-action-read',
  messageId: 'om_owned',
  version: 1,
  expiresAt: event.receivedAt,
  events: [event],
  hasMore: false,
}
assert.equal(result(page), true)
assert.equal(result({ ...page, hasMore: true }), false)
assert.equal(result({ ...page, hasMore: true, pageToken: 'opaque' }), true)
assert.equal(
  result({
    status: 'ok',
    operation: 'card-action-publish',
    messageId: 'om_owned',
    version: 1,
    expiresAt: event.receivedAt,
    operationId: 'stable',
  }),
  true,
)
assert.equal(
  result({
    status: 'ok',
    operation: 'card-action-publish',
    messageId: 'om_owned',
    version: 1,
    expiresAt: event.receivedAt,
  }),
  false,
)
assert.equal(result({ ...page, events: [{ ...event, token: 'private' }] }), false)
assert.equal(result({ status: 'unknown', code: 'CHANNEL_OPERATION_UNCERTAIN', operationId: 'stable' }), true)
assert.equal(result(null), true)
console.log('Channel bounded card-actions v1 conformance passed')
