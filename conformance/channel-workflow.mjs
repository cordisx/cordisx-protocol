import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import Ajv2020 from 'ajv/dist/2020.js'
const load = async name =>
  JSON.parse(await readFile(new URL(`../schemas/${name}.schema.json`, import.meta.url), 'utf8'))
const ajv = new Ajv2020({ strict: true, allErrors: true })
for (
  const name of [
    'chat-execution-settings.v1',
    'channel-conversation-policy.v1',
    'channel-conversation-policy.v2',
    'channel-conversation-policy.v3',
    'ui-common.v1',
    'channel-manager-common.v2',
    'channel-runtime-snapshot.v3',
  ]
) ajv.addSchema(await load(name))
const v2 = ajv.getSchema((await load('channel-conversation-policy.v2')).$id)
const policy = ajv.getSchema((await load('channel-conversation-policy.v3')).$id)
const value = {
  enabled: true,
  autoCreate: true,
  autoReply: false,
  groupReception: 'all',
  groups: [],
  rules: [{ id: 'test', action: 'command', effect: 'allow', commands: ['approve', 'permissions'] }],
  wakePrefixes: [],
  replyMode: 'agent',
  replyFallbackMode: 'conversation',
  replyModes: [],
  sidebarGroup: 'External connections',
}
assert.equal(policy(value), true)
assert.equal(v2(value), false, 'Frozen v2 rejects successor fields and commands')
assert.equal(policy({ ...value, sidebarGroup: null }), true)
assert.equal(policy({ ...value, sidebarGroup: '' }), false)
assert.equal(policy({ ...value, rules: [{ ...value.rules[0], commands: ['run-arbitrary'] }] }), false)
const execution = ajv.getSchema((await load('chat-execution-settings.v1')).$id)
assert.equal(
  execution({ execution: 'workspace-write', approval: 'never', workMode: 'plan', effort: 'low', networkAccess: true }),
  true,
)
assert.equal(execution({ approval: 'on-failure' }), false)
assert.equal(execution({ permissionRequestId: 'private' }), false)
const readback = ajv.compile(await load('chat-execution-readback.v1'))
assert.equal(
  readback({
    contract: 'cordisx.chat-execution-readback/v1',
    schemaVersion: 1,
    profileId: 'test',
    hostGeneration: 'test',
    revision: 0,
    scope: 'chat',
    settings: {},
    application: 'submitted',
  }),
  true,
)
const docs = ajv.compile(await load('plugin-documents.v1'))
assert.equal(
  docs({
    contract: 'cordisx.plugin-documents/v1',
    documents: [{ id: 'usage', title: 'Usage', path: './docs/usage.md' }],
  }),
  true,
)
assert.equal(
  docs({
    contract: 'cordisx.plugin-documents/v1',
    documents: [{ id: 'usage', title: 'Usage', path: 'https://unsafe/usage.md' }],
  }),
  false,
)
for (const path of ['./../usage.md', './docs//usage.md', './docs/./usage.md']) {
  assert.equal(
    docs({ contract: 'cordisx.plugin-documents/v1', documents: [{ id: 'usage', title: 'Usage', path }] }),
    false,
  )
}
ajv.compile(await load('plugin-document-readback.v1'))
ajv.compile(await load('channel-conversation-policy-readback.v3'))
ajv.compile(await load('channel-manager-binding-page.v2'))
const metadata = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
for (
  const entry of [
    './chat-execution-settings/v1',
    './channel-conversation-policy/v3',
    './channel-manager/v9',
    './plugin-documents/v1',
  ]
) assert.ok(metadata.exports[entry])
console.log(
  'Channel workflow conformance: settings, frozen versions, commands, documentation and public exports passed.',
)
