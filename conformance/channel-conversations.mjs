import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'

const load = async name =>
  JSON.parse(await readFile(new URL(`../schemas/${name}.schema.json`, import.meta.url), 'utf8'))
const ajv = addFormats(new Ajv2020({ strict: true, allErrors: true }))
for (
  const name of [
    'ui-common.v1',
    'channel-manager-common.v2',
    'raster-image-snapshot.v1',
    'channel-manager-binding-page.v2',
    'channel-manager-conversations.v1',
  ]
) ajv.addSchema(await load(name))
const validate = {}
for (const name of ['page', 'detail', 'activity-page', 'bindings-page']) {
  validate[name] = ajv.compile(await load(`channel-manager-conversation-${name}.v1`))
}
const token = 'chm1_0000000000000000000000000000000000000000001'
const fence = { profileId: 'test', hostGeneration: 'generation', snapshotRevision: 1 }
const conversation = {
  conversationToken: token,
  connectionToken: token,
  name: 'Example group',
  kind: 'group',
  bindingCount: 10001,
  activeBindingCount: 10001,
  receivedCount: 3,
  sentCount: 1,
}
const page = {
  ...fence,
  contract: 'cordisx.channel-manager-conversation-page/v1',
  schemaVersion: 1,
  connectionToken: token,
  directoryComplete: false,
  total: 1,
  conversations: [conversation],
}
assert.equal(validate.page(page), true, JSON.stringify(validate.page.errors))
assert.equal(validate.page({ ...page, conversations: Array(101).fill(conversation) }), false)
assert.equal(
  validate.page({ ...page, conversations: [{ ...conversation, avatarUrl: 'https://private.invalid' }] }),
  false,
)
assert.equal(validate.page({ ...page, conversations: [{ ...conversation, cookie: 'never' }] }), false)
assert.equal(
  validate.detail({
    ...fence,
    contract: 'cordisx.channel-manager-conversation-detail/v1',
    schemaVersion: 1,
    conversation,
  }),
  true,
)
const entry = {
  entryId: token,
  direction: 'outgoing',
  state: 'queued',
  occurredAt: '2026-11-16T00:00:00Z',
  text: 'Explicit send',
}
const activity = {
  ...fence,
  contract: 'cordisx.channel-manager-conversation-activity-page/v1',
  schemaVersion: 1,
  conversationToken: token,
  source: 'local-transport',
  total: 1,
  entries: [entry],
}
assert.equal(validate['activity-page'](activity), true)
for (
  const state of [
    'received',
    'queued',
    'processing',
    'retrying',
    'permission-pending',
    'denied',
    'sent',
    'failed',
    'cancelled',
    'unknown',
  ]
) assert.equal(validate['activity-page']({ ...activity, entries: [{ ...entry, state }] }), true)
assert.equal(validate['activity-page']({ ...activity, source: 'codex-transcript' }), false)
assert.equal(validate['activity-page']({ ...activity, entries: [{ ...entry, code: 'raw secret error' }] }), false)
assert.equal(validate['activity-page']({ ...activity, entries: [{ ...entry, text: 'x'.repeat(8193) }] }), false)
assert.equal(
  validate['bindings-page']({
    ...fence,
    contract: 'cordisx.channel-manager-conversation-bindings-page/v1',
    schemaVersion: 1,
    connectionToken: token,
    conversationToken: token,
    total: 10001,
    bindings: [],
  }),
  true,
)
const metadata = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
assert.ok(metadata.exports['./channel-manager/v10'])
console.log(
  'Channel conversations: bounded pages, unbounded relationship totals, actual delivery states and safe public fields passed.',
)
