import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'
import { TaskPermissionModel } from './agent-task-permission-reference-model.mjs'

const base = 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/'
const ajv = new Ajv2020({ strict: true, allowUnionTypes: true })
addFormats(ajv)
for (const file of await readdir(new URL('../schemas/', import.meta.url))) {
  if (file.endsWith('.schema.json')) {
    ajv.addSchema(JSON.parse(await readFile(new URL(`../schemas/${file}`, import.meta.url), 'utf8')))
  }
}
const validate = (name, value) => ajv.getSchema(`${base}${name}.schema.json`)(value)
const task = { kind: 'agent-task-command', commandId: 'chatroom' }
const route = { kind: 'host-route-param', routeId: 'detail', param: 'sessionId' }
const request = { name: 'approvals.request', required: false, scope: { task, sessionIds: route } }
const answer = {
  name: 'approvals.answer',
  required: false,
  scope: { taskRequester: task, authorityRequester: { kind: 'approval-authority-requester-route', requester: route } },
}
const manifest = {
  $schema: `${base}plugin-manifest.v12.schema.json`,
  schemaVersion: 12,
  id: 'chatroom',
  capabilities: [request, answer],
  services: [],
}
assert.equal(validate('plugin-manifest.v12', manifest), true)
for (const capability of [request, answer]) {
  assert.equal(
    validate('plugin-manifest.v12', { ...manifest, capabilities: [...manifest.capabilities, capability] }),
    false,
    'same capability cannot be repeated',
  )
}
for (
  const capability of [request, answer, { ...request, scope: { task } }, { ...answer, scope: { taskRequester: task } }]
) {
  assert.equal(validate('agent-task-permission.v1', capability), true)
}
for (
  const capability of [
    { ...request, required: true },
    { ...answer, scope: { task } },
    { ...request, scope: { taskRequester: task } },
    { ...request, scope: { task, sessionIds: ['arbitrary'] } },
    { ...request, scope: { task, roomId: 'room' } },
    { ...request, scope: { task: { ...task, commandId: '*' } } },
    { ...request, scope: { task: { ...task, sessionId: 'forged' } } },
    { ...request, scope: { task, sessionIds: { ...route, param: 'roomId' } } },
    { ...answer, scope: { taskRequester: task, sessionIds: route } },
  ]
) assert.equal(validate('agent-task-permission.v1', capability), false)
for (const version of [8, 10, 11]) {
  assert.equal(
    validate(`plugin-manifest.v${version}`, {
      ...manifest,
      $schema: `${base}plugin-manifest.v${version}.schema.json`,
      schemaVersion: version,
    }),
    false,
  )
}
const oldCaps = [{ ...request, scope: { sessionIds: route } }, {
  ...answer,
  scope: { authorityRequester: answer.scope.authorityRequester },
}]
assert.equal(validate('plugin-manifest.v12', { ...manifest, capabilities: oldCaps }), true)
assert.equal(
  validate('plugin-manifest.v12', {
    ...manifest,
    capabilities: [{ name: 'usage.read', required: false, scope: { profile: 'current' } }],
  }),
  true,
)
const packageSchema = ajv.getSchema(`${base}plugin-package.v12.schema.json#/properties/runtimeManifest`)
const packageReference = { path: './runtime.json', schema: manifest.$schema, digest: `sha256:${'a'.repeat(64)}` }
assert.equal(packageSchema(packageReference), true)
assert.equal(
  ajv.getSchema(`${base}plugin-package.v11.schema.json#/properties/runtimeManifest`)(packageReference),
  false,
)
const envelope = name => ({
  $schema: `${base}${name}.v1.schema.json`,
  contract: `cordisx.${name}/v1`,
  schemaVersion: 1,
})
const source = {
  ...envelope('agent-task-permission-source'),
  kind: 'host-agent-task',
  owner: { pluginId: 'chatroom', generation: 1 },
  operationId: 'operation',
  commandId: 'chatroom',
  sessionId: 'child',
  definition: { agentId: 'worker', revision: 'v1' },
  taskRegistrationId: 'required-registration',
  connectionGeneration: 1,
}
const binding = sessionId => ({
  agentId: `agent-${sessionId}`,
  sessionId,
  agentGeneration: 1,
  definition: source.definition,
})
const wireLease = {
  ...envelope('agent-task-approval-authority-lease'),
  leaseId: 'lease',
  taskSource: source,
  routingId: 'routing',
  registrationId: 'resolver',
  requester: binding('child'),
  authority: binding('leader'),
}
assert.equal(validate('agent-task-permission-source.v1', source), true)
assert.equal(validate('agent-task-approval-authority-lease.v1', wireLease), true)
assert.equal(validate('agent-task-approval-authority-lease.v1', { ...wireLease, authority: wireLease.requester }), true)
for (
  const extra of [{ nativeHandle: 'secret' }, { toolScope: {} }, { cwd: '/path' }, { connectionGeneration: -1 }, {
    taskRegistrationId: '',
  }]
) {
  assert.equal(validate('agent-task-permission-source.v1', { ...source, ...extra }), false)
}
function fixture(self = false) {
  const effects = []
  const h = {
    active: true,
    fingerprint: 'manifest-v12-with-task',
    owner: source.owner,
    connectionGeneration: 1,
    records: new Map([['operation', { ...source, bindingPolicy: 'required', phase: 'approval-installing' }]]),
    requiredSessions: new Set(['child']),
    commands: new Set(['chatroom']),
    registrations: new Map([['chatroom', source.taskRegistrationId]]),
    bindings: new Map([['child', binding('child')], ['leader', binding('leader')]]),
    scopes: { 'approvals.request': request.scope, 'approvals.answer': answer.scope },
    resolvers: new Set(['resolver']),
    answerers: new Set(['child', 'leader']),
    routing: new Map(),
    route: { routeId: 'detail', sessionId: 'ordinary' },
    ordinaryCorrelation: { requester: 'ordinary', authority: 'leader' },
    policy: async (capability, sessionId) => {
      effects.push([capability, sessionId])
      return true
    },
  }
  const model = new TaskPermissionModel(h)
  const installed = model.install(source)
  const routed = {
    routingId: 'routing',
    registrationId: 'resolver',
    requester: binding('child'),
    authority: binding(self ? 'child' : 'leader'),
    status: 'accepted',
  }
  h.routing.set('routing', routed)
  return { h, model, installed, routed, effects }
}
for (const self of [false, true]) {
  const f = fixture(self)
  assert.deepEqual(f.effects, [], 'installing a valid source is not a grant')
  assert.equal(await f.model.request('child', f.installed), true)
  const lease = await f.model.mint(f.installed, f.routed)
  assert.ok(lease)
  assert.deepEqual(f.effects, [['approvals.request', 'child'], ['approvals.answer', self ? 'child' : 'leader']])
  let answers = 0
  assert.equal(
    await f.model.answer(lease, async () => {
      answers++
      return 'rejected'
    }),
    'rejected',
  )
  assert.equal(answers, 1, 'self routing still calls the real answer path')
  assert.equal(await f.model.answer(lease, () => 'approved-once'), 'unavailable', 'one invocation cannot reuse a lease')
}
const f = fixture()
assert.equal(await f.model.request('ordinary'), true)
assert.equal(f.model.routeAnswer('ordinary', 'leader'), true)
assert.equal(f.model.routeAnswer('ordinary', 'foreign'), false)
assert.equal(
  await f.model.request('child', structuredClone(f.installed)),
  false,
  'copied evidence is not Host registration',
)
assert.equal(
  await f.model.mint(f.installed, { ...f.routed }),
  false,
  'caller routing claims are not actual Host routing',
)
assert.equal(await f.model.request('leader', f.installed), false)
assert.equal(await f.model.request('ordinary', f.installed), false)
for (
  const mutate of [
    h => {
      h.active = false
    },
    h => {
      h.owner = { ...h.owner, generation: 2 }
    },
    h => {
      h.connectionGeneration++
    },
    h => h.registrations.clear(),
    h => h.commands.clear(),
    h => h.bindings.delete('child'),
    h => {
      h.records.get('operation').bindingPolicy = 'none'
    },
    h => {
      h.records.get('operation').sessionId = 'other'
    },
    h => {
      h.records.get('operation').definition = { agentId: 'other', revision: 'v2' }
    },
    h => {
      h.scopes = { ...h.scopes, 'approvals.request': { ...request.scope, task: { ...task, commandId: 'other' } } }
    },
  ]
) {
  const x = fixture()
  mutate(x.h)
  x.h.route.sessionId = 'child'
  assert.equal(await x.model.request('child', x.installed), false)
  assert.equal(await x.model.request('child'), false, 'lost task source never falls back to a matching route')
  assert.equal(x.model.routeAnswer('child', 'leader'), false)
}
for (
  const mutate of [
    h => h.resolvers.clear(),
    h => h.answerers.clear(),
    h => h.routing.clear(),
    h => h.bindings.delete('leader'),
    h => {
      h.bindings.get('leader').agentGeneration++
    },
    h => {
      h.routing.get('routing').status = 'unavailable'
    },
  ]
) {
  const x = fixture()
  const lease = await x.model.mint(x.installed, x.routed)
  mutate(x.h)
  assert.equal(await x.model.answer(lease, () => 'approved-once'), 'unavailable')
}
for (const cap of ['approvals.request', 'approvals.answer']) {
  const x = fixture()
  x.h.policy = async name => name !== cap
  assert.equal(
    cap === 'approvals.request'
      ? await x.model.request('child', x.installed)
      : await x.model.mint(x.installed, x.routed),
    false,
  )
}
const x = fixture()
x.h.policy = async () => {
  x.h.registrations.clear()
  return true
}
assert.equal(await x.model.request('child', x.installed), false, 'post-await request fence')
const y = fixture()
y.h.policy = async () => {
  y.h.resolvers.clear()
  return true
}
assert.equal(await y.model.mint(y.installed, y.routed), false, 'post-await mint fence')
const z = fixture()
const lease = await z.model.mint(z.installed, z.routed)
assert.equal(
  await z.model.answer(lease, async () => {
    z.h.bindings.delete('child')
    return 'approved-once'
  }),
  'unavailable',
  'late answers cannot survive requester disposal',
)
const oldPolicy = fixture()
oldPolicy.h.policy = async (_cap, _id, evidence) => evidence.kind === 'route'
assert.equal(await oldPolicy.model.request('ordinary'), true)
assert.equal(
  await oldPolicy.model.request('child', oldPolicy.installed),
  false,
  'an old route allow record cannot authorize task provenance',
)
assert.equal(await oldPolicy.model.mint(oldPolicy.installed, oldPolicy.routed), false)
const changedPolicy = fixture()
changedPolicy.h.policy = async (_cap, _id, evidence) =>
  evidence.kind === 'task' && evidence.commandId === 'chatroom' && evidence.fingerprint === 'previous-manifest'
assert.equal(
  await changedPolicy.model.request('child', changedPolicy.installed),
  false,
  'incompatible manifest fingerprints cannot reuse policy',
)
console.log(
  'Agent task permission v1: schema closure, v12 compatibility, source isolation, exact grants and revocation passed',
)
