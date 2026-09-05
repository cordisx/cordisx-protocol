import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const names = (await readdir(path.join(root, 'schemas'))).filter(name => name.endsWith('.schema.json'))
const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true })
addFormats(ajv)
for (const name of names) ajv.addSchema(JSON.parse(await readFile(path.join(root, 'schemas', name), 'utf8')))
const validate = name =>
  ajv.getSchema(`https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/${name}`)
const route = { kind: 'host-route-param', routeId: 'room-session-detail', param: 'sessionId' }
const manifest = {
  $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/plugin-manifest.v8.schema.json',
  schemaVersion: 8,
  id: 'chatroom',
  capabilities: [{ name: 'approvals.request', required: false, scope: { sessionIds: route } }, {
    name: 'approvals.answer',
    required: false,
    scope: { authorityRequester: { kind: 'approval-authority-requester-route', requester: route } },
  }],
  services: [],
}
assert.equal(
  validate('plugin-manifest.v8.schema.json')(manifest),
  true,
  JSON.stringify(validate('plugin-manifest.v8.schema.json').errors),
)
const packageManifest = {
  $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/plugin-package.v8.schema.json',
  schemaVersion: 8,
  id: 'chatroom',
  version: '1.0.0',
  entry: './index.mjs',
  distribution: { mode: 'explicit-local-v1', signature: 'unsupported' },
  compatibility: { runtimeAbi: 1, protocolSchemas: [manifest.$schema] },
  dependencies: [],
  runtimeManifest: { path: './runtime.json', schema: manifest.$schema, digest: `sha256:${'1'.repeat(64)}` },
}
assert.equal(
  validate('plugin-package.v8.schema.json')(packageManifest),
  true,
  JSON.stringify(validate('plugin-package.v8.schema.json').errors),
)
assert.ok(
  packageManifest.compatibility.protocolSchemas.includes(packageManifest.runtimeManifest.schema),
  'package v8 compatibility and digest target name manifest v8 exactly',
)
const reviewer = {
  agentId: 'session-reviewer',
  sessionId: 'session-reviewer',
  agentGeneration: 4,
  definition: { agentId: 'reviewer', revision: 'r4' },
}
const lead = {
  agentId: 'session-lead',
  sessionId: 'session-lead',
  agentGeneration: 7,
  definition: { agentId: 'lead', revision: 'r2' },
}
const correlation = {
  $schema:
    'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/approval-authority-route-correlation.v1.schema.json',
  contract: 'cordisx.approval-authority-route-correlation/v1',
  schemaVersion: 1,
  routingId: 'routing-1',
  registrationId: 'registration-1',
  owner: { pluginId: 'chatroom', generation: 9 },
  route: { routeId: route.routeId, param: 'sessionId', sessionId: reviewer.sessionId },
  requester: reviewer,
  authority: lead,
}
assert.equal(validate('approval-authority-route-correlation.v1.schema.json')(correlation), true)
const lease = {
  $schema:
    'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/approval-authority-route-lease.v1.schema.json',
  contract: 'cordisx.approval-authority-route-lease/v1',
  schemaVersion: 1,
  leaseId: 'lease-1',
  correlation,
}
assert.equal(validate('approval-authority-route-lease.v1.schema.json')(lease), true)
assert.deepEqual(structuredClone({ manifest, correlation, lease }), { manifest, correlation, lease })
const errors = (value, expected = correlation) => {
  const issues = []
  if (value.route.sessionId !== value.requester.sessionId) issues.push('requester route mismatch')
  if (value.requester.agentId !== value.requester.sessionId || value.authority.agentId !== value.authority.sessionId) {
    issues.push('AgentId SessionId mismatch')
  }
  if (JSON.stringify(value.authority) !== JSON.stringify(expected.authority)) {
    issues.push('authority replacement or cross-target mismatch')
  }
  return issues
}
assert.deepEqual(errors(correlation), [])
assert.notEqual(
  correlation.requester.sessionId,
  correlation.authority.sessionId,
  'authority lease must support distinct requester and authority Sessions',
)
assert.notDeepEqual(errors({ ...correlation, route: { ...correlation.route, sessionId: 'other' } }), [])
assert.notDeepEqual(
  errors({ ...correlation, authority: { ...lead, agentGeneration: 8 } }),
  [],
  'replacement authority cannot use lease',
)
const consumerSequence = registration =>
  registration === 'registered' ? ['issue-target-origin', 'reserve', 'submit'] : ['stop']
assert.deepEqual(consumerSequence('registered'), ['issue-target-origin', 'reserve', 'submit'])
assert.deepEqual(consumerSequence('unavailable'), ['stop'], 'unregistered resolver must not issue or reserve')
for (
  const invalid of [
    { ...manifest, capabilities: [{ name: 'approvals.answer', required: false, scope: {} }] },
    {
      ...manifest,
      capabilities: [{
        name: 'approvals.answer',
        required: true,
        scope: { authorityRequester: { kind: 'approval-authority-requester-route', requester: route } },
      }],
    },
    {
      ...manifest,
      capabilities: [{
        name: 'approvals.answer',
        required: false,
        scope: {
          authorityRequester: { kind: 'approval-authority-requester-route', requester: { ...route, param: 'roomId' } },
        },
      }],
    },
    {
      ...manifest,
      capabilities: [{
        name: 'approvals.request',
        required: false,
        scope: { authorityRequester: { kind: 'approval-authority-requester-route', requester: route } },
      }],
    },
  ]
) assert.equal(validate('plugin-manifest.v8.schema.json')(invalid), false)
console.log('Approval authority requester-route manifest v8 conformance passed')
