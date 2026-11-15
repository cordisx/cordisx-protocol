import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import Ajv2020 from 'ajv/dist/2020.js'

const load = async name => JSON.parse(await readFile(new URL(`../schemas/${name}`, import.meta.url), 'utf8'))
const ajv = new Ajv2020({ strict: true, allErrors: true })
for (const name of ['channel-conversation-policy.v1.schema.json', 'channel-conversation-policy.v2.schema.json']) {
  ajv.addSchema(await load(name))
}
const v1 = ajv.getSchema((await load('channel-conversation-policy.v1.schema.json')).$id)
const v2 = ajv.getSchema((await load('channel-conversation-policy.v2.schema.json')).$id)
const readback = ajv.compile(await load('channel-conversation-policy-readback.v2.schema.json'))
const legacy = {
  enabled: true,
  autoCreate: true,
  autoReply: true,
  groupReception: 'all',
  groups: [],
  rules: [],
  wakePrefixes: [],
}
const policy = {
  ...legacy,
  replyMode: 'agent',
  replyFallbackMode: 'conversation',
  replyModes: [{ adapterId: 'feishu', accountId: 'app', conversationId: 'group', kinds: ['group'], mode: 'thread' }],
}
assert.equal(v1(legacy), true)
assert.equal(v1(policy), false, 'Reply fields cannot be smuggled into frozen v1 policy')
assert.equal(v2(legacy), false, 'V2 must declare reply behavior')
assert.equal(v2(policy), true, JSON.stringify(v2.errors))
for (const mode of ['agent', 'conversation', 'reply', 'thread', 'none']) {
  assert.equal(v2({ ...policy, replyMode: mode }), true)
}
for (const fallback of ['conversation', 'reply', 'thread', 'none']) {
  assert.equal(v2({ ...policy, replyFallbackMode: fallback }), true)
}
for (
  const invalid of [
    { ...policy, replyMode: 'always-new-subchannel' },
    { ...policy, replyFallbackMode: 'agent' },
    { ...policy, replyModes: [{ mode: 'thread', reply_in_thread: true }] },
    { ...policy, replyModes: [{ mode: 'reply', kinds: [] }] },
    { ...policy, replyModes: [{ mode: 'reply', accountId: '' }] },
    { ...policy, replyModes: [{ mode: 'reply', cookie: 'secret' }] },
  ]
) assert.equal(v2(invalid), false)
const value = {
  contract: 'cordisx.channel-conversation-policy-readback/v2',
  schemaVersion: 2,
  profileId: 'test',
  hostGeneration: 'host',
  revision: 1,
  policy,
}
assert.equal(readback(value), true)
assert.equal(readback({ ...value, contract: 'cordisx.channel-conversation-policy-readback/v1' }), false)
assert.equal(readback({ ...value, schemaVersion: 1 }), false)

const frozen = {
  'types/channel-runtime.v1.d.ts': 'd55677f2f63538d0cb5438f8e62c8ba8f77bf40f9d2d66c075c32d93cd6d8a3d',
  'types/channel-conversation-policy.v1.d.ts': '08d7351e136a52c73c852d02c6ce04bbcddbb800ef9cf977d7462284591083ff',
  'types/channel-manager.v4.d.ts': '6866dbc55f6cb1e37afec26780d0f149890ed9c641a3e0e488609ada5a78693a',
  'types/channel-manager.v5.d.ts': 'e84a52516657c65415f03c5918cdd638b643f5fdf43b27a4290533db4981d33b',
  'schemas/channel-common.v1.schema.json': '7b36223faeb990adf5e055c2cbfd040bfa1d3dfcce9da04555f1c3109307414d',
  'schemas/channel-conversation-policy.v1.schema.json':
    'e7dae716a36666cc59f4f7bf125c05703f4ce70caba99f1a87357b8899112957',
  'schemas/channel-conversation-policy-readback.v1.schema.json':
    'd63bbcb4d1efb6fc0c764a6fb487760afb9ecbebd44a8cb76f94825f12f0049d',
}
for (const [name, expected] of Object.entries(frozen)) {
  const bytes = await readFile(new URL(`../${name}`, import.meta.url))
  assert.equal(createHash('sha256').update(bytes).digest('hex'), expected, `Frozen predecessor changed: ${name}`)
}
const metadata = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
assert.equal(metadata.exports['./channel-conversation-policy/v2'], './types/channel-conversation-policy.v2.d.ts')
assert.equal(metadata.exports['./channel-manager/v6'], './types/channel-manager.v6.d.ts')
console.log('Channel reply-policy v2: explicit modes, readback version, closed shapes and frozen predecessors passed.')
