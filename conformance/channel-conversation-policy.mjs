import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'

const load = async name => JSON.parse(await readFile(new URL(`../schemas/${name}`, import.meta.url), 'utf8'))
const ajv = new Ajv2020({ strict: true, allErrors: true })
addFormats(ajv)
const policySchema = await load('channel-conversation-policy.v1.schema.json')
ajv.addSchema(policySchema)
const policy = ajv.getSchema(policySchema.$id)
const readback = ajv.compile(await load('channel-conversation-policy-readback.v1.schema.json'))
const valid = {
  enabled: true,
  autoCreate: true,
  autoReply: true,
  groupReception: 'all',
  groups: [{ id: 'operators', name: 'Operators', members: [{ tenantId: 'test', userId: 'alice' }] }],
  rules: [{ id: 'write', action: 'command', effect: 'allow', userGroupIds: ['operators'], commands: ['bind'] }],
  wakePrefixes: [{ accountId: 'app', prefixes: ['wake'] }],
}
assert.equal(policy(valid), true)
assert.equal(
  readback({
    contract: 'cordisx.channel-conversation-policy-readback/v1',
    schemaVersion: 1,
    profileId: 'test',
    hostGeneration: 'host-1',
    revision: 0,
    policy: valid,
  }),
  true,
)
for (
  const invalid of [
    { ...valid, secretRef: 'must-not-cross' },
    { ...valid, groupReception: 'reply-to-everything' },
    { ...valid, rules: [{ ...valid.rules[0], commands: ['arbitrary'] }] },
    { ...valid, rules: [{ ...valid.rules[0], userIds: [] }] },
    { ...valid, wakePrefixes: [{ prefixes: [] }] },
    { ...valid, groups: [{ ...valid.groups[0], members: [{ userId: 'alice', credential: 'private' }] }] },
  ]
) assert.equal(policy(invalid), false)
assert.equal(
  readback({
    contract: 'cordisx.channel-conversation-policy-readback/v1',
    schemaVersion: 1,
    profileId: 'test',
    hostGeneration: 'host-1',
    revision: -1,
    policy: valid,
  }),
  false,
)

// V2 extends transport metadata, not the policy's authority or credential surface.
ajv.addSchema(await load('channel-common.v1.schema.json'))
ajv.addSchema(await load('channel-service-config.v1.schema.json'))
const config = ajv.compile(await load('channel-service-config.v2.schema.json'))
const configV3 = ajv.compile(await load('channel-service-config.v3.schema.json'))
const pending = {
  account: { adapterId: 'feishu', accountId: 'cli_test' },
  adapterKind: 'feishu',
  secretRef: 'host-secret:channel/test/draft-a',
  displayName: 'Pending',
}
const pendingConfig = {
  contract: 'cordisx.channel-service-config/v3',
  schemaVersion: 3,
  connections: [],
  pendingConnections: [pending],
}
assert.equal(configV3(pendingConfig), true)
assert.equal(
  configV3({
    ...pendingConfig,
    pendingConnections: [{ ...pending, account: { ...pending.account, tenantId: 'not-identified' } }],
  }),
  false,
)
assert.equal(configV3({ ...pendingConfig, pendingConnections: [{ ...pending, adapterKind: 'lark' }] }), false)
const connection = {
  ref: { adapterId: 'feishu', accountId: 'cli_test', tenantId: 'test' },
  adapterKind: 'feishu',
  enabled: true,
  transport: { mode: 'websocket' },
  secretRef: 'host-secret:env/TEST',
  displayName: 'Test',
  selectors: ['direct', 'mentions'],
}
assert.equal(
  config({ contract: 'cordisx.channel-service-config/v2', schemaVersion: 2, connections: [connection] }),
  true,
)
assert.equal(
  config({
    contract: 'cordisx.channel-service-config/v2',
    schemaVersion: 2,
    connections: [{ ...connection, selectors: ['unknown'] }],
  }),
  false,
)
console.log('Channel conversation policy and transport-v2 conformance passed.')

ajv.addSchema(await load('ui-common.v1.schema.json'))
ajv.addSchema(await load('channel-manager-common.v2.schema.json'))
ajv.addSchema(await load('channel-runtime-snapshot.v3.schema.json'))
const connectionReadback = ajv.compile(await load('channel-manager-connection-configuration.v1.schema.json'))
const bindingPage = ajv.compile(await load('channel-manager-binding-page.v1.schema.json'))
const base = {
  profileId: 'test',
  hostGeneration: 'host-1',
  connectionToken: 'chm1_' + 'a'.repeat(43),
  schemaVersion: 1,
}
assert.equal(
  connectionReadback({
    ...base,
    contract: 'cordisx.channel-manager-connection-configuration/v1',
    revision: 1,
    selectors: ['direct', 'mentions'],
  }),
  true,
)
assert.equal(
  connectionReadback({
    ...base,
    contract: 'cordisx.channel-manager-connection-configuration/v1',
    revision: 1,
    selectors: ['direct'],
    appSecret: 'private',
  }),
  false,
)
assert.equal(
  bindingPage({
    ...base,
    contract: 'cordisx.channel-manager-binding-page/v1',
    snapshotRevision: 1,
    total: 20001,
    bindings: [],
    nextCursor: 'chm1_' + 'b'.repeat(43),
  }),
  true,
)
assert.equal(
  bindingPage({
    ...base,
    contract: 'cordisx.channel-manager-binding-page/v1',
    snapshotRevision: 1,
    total: -1,
    bindings: [],
  }),
  false,
)
