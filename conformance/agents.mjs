import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Ajv2020 from 'ajv/dist/2020.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const names = [
  'session-common.v1.schema.json',
  'agents-common.v1.schema.json',
  'agent-loop-common.v1.schema.json',
  'platform-model.v1.schema.json',
  'agent-avatar.v1.schema.json',
  'agent-definition.v1.schema.json',
  'agent-acquire-request.v1.schema.json',
  'agent-acquire-result.v1.schema.json',
  'agent-admission.v1.schema.json',
  'agent-message-cancellation-result.v1.schema.json',
  'agent-mutation-result.v1.schema.json',
  'agent-status-observation.v1.schema.json',
  'agent-live-event.v1.schema.json',
]
const schemas = new Map()
const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true })
for (const name of names) {
  const value = JSON.parse(await readFile(path.join(root, 'schemas', name), 'utf8'))
  schemas.set(name, value)
  ajv.addSchema(value)
}
const schema = name => schemas.get(name).$id
const validate = name => {
  const value = ajv.getSchema(schema(name))
  assert.ok(value, `${name} not registered`)
  return value
}
const errors = (name, value) => {
  const check = validate(name)
  return check(value) ? [] : (check.errors ?? []).map(item => `${item.instancePath || '/'} ${item.message}`)
}

const baseRequest = {
  $schema: schema('agent-acquire-request.v1.schema.json'),
  contract: 'cordisx.agent-acquire-request/v1',
  schemaVersion: 1,
}
const definitionBase = {
  $schema: schema('agent-definition.v1.schema.json'),
  contract: 'cordisx.agent-definition/v1',
  schemaVersion: 1,
  identity: { agentId: 'base', revision: '1' },
  inherit: {
    promptSections: 'append',
    rules: 'append',
    skills: 'append',
    tools: 'merge',
    mcpServers: 'merge',
    runtimeDefaults: 'merge',
  },
  promptSections: [{ sectionId: 'role', kind: 'role', text: 'Base role.' }],
  tools: { include: ['shell'] },
}
const definitionRoot = {
  ...definitionBase,
  identity: { agentId: 'reviewer', revision: '1' },
  extends: [definitionBase.identity],
  promptSections: [{ sectionId: 'operations', kind: 'operations', text: 'Review changes.' }],
  runtimeDefaults: { adapterId: 'codex', model: { providerId: 'openai', modelId: 'gpt-5' }, effort: 'high' },
}
const setup = { definition: definitionRoot.identity, definitions: [definitionBase, definitionRoot] }
const createRequest = { ...baseRequest, type: 'create', mutationId: 'create-1', setup }
const resumeRequest = { ...baseRequest, type: 'resume', sessionId: 'session-1', mutationId: 'resume-1' }
assert.deepEqual(errors('agent-acquire-request.v1.schema.json', createRequest), [])
assert.deepEqual(errors('agent-acquire-request.v1.schema.json', resumeRequest), [])
assert.deepEqual(
  errors('agent-acquire-request.v1.schema.json', { ...createRequest, options: { vendorPolicy: { mode: 'safe' } } }),
  [],
)
assert.ok(errors('agent-acquire-request.v1.schema.json', { ...baseRequest, type: 'resume' }).length > 0)

export function validateAgentSetup(value) {
  const found = []
  const byId = new Map()
  const key = identity => `${identity.agentId}\u0000${identity.revision}`
  for (const definition of value.definitions ?? []) {
    const identity = key(definition.identity)
    if (byId.has(identity)) found.push(`duplicate definition ${identity}`)
    byId.set(identity, definition)
  }
  if (!byId.has(key(value.definition))) found.push('root definition is absent')
  for (const [identity, definition] of byId) {
    for (const parent of definition.extends ?? []) {
      if (!byId.has(key(parent))) found.push(`${identity} has a missing ancestor`)
    }
  }
  const visiting = new Set()
  const visited = new Set()
  function visit(identity) {
    if (visiting.has(identity)) {
      found.push(`definition cycle at ${identity}`)
      return
    }
    if (visited.has(identity)) return
    visiting.add(identity)
    for (const parent of byId.get(identity)?.extends ?? []) visit(key(parent))
    visiting.delete(identity)
    visited.add(identity)
  }
  for (const identity of byId.keys()) visit(identity)
  return found
}
assert.deepEqual(validateAgentSetup(setup), [])
assert.ok(
  validateAgentSetup({ ...setup, definition: { agentId: 'missing', revision: '1' } }).includes(
    'root definition is absent',
  ),
)
assert.ok(
  validateAgentSetup({
    ...setup,
    definitions: [definitionBase, { ...definitionRoot, extends: [definitionRoot.identity] }],
  }).some(value => value.includes('cycle')),
)

const resultBase = {
  $schema: schema('agent-acquire-result.v1.schema.json'),
  contract: 'cordisx.agent-acquire-result/v1',
  schemaVersion: 1,
}
const accepted = {
  ...resultBase,
  operation: 'resume',
  mutationId: 'resume-1',
  status: 'accepted',
  sessionId: 'session-1',
  agentGeneration: 1,
  sessionGeneration: 1,
  owner: { pluginId: 'chatroom', generation: 3 },
  sessionIdSource: 'caller',
  disposition: 'resumed',
  details: { kind: 'host', ref: 'agent-detail-1' },
}
assert.deepEqual(errors('agent-acquire-result.v1.schema.json', accepted), [])
assert.ok(errors('agent-acquire-result.v1.schema.json', { ...accepted, code: 'permission-denied' }).length > 0)
assert.ok(
  errors('agent-acquire-result.v1.schema.json', {
    ...resultBase,
    operation: 'resume',
    status: 'denied',
    code: 'setup-conflict',
  }).length > 0,
)
assert.ok(errors('agent-acquire-result.v1.schema.json', { ...accepted, handle: {} }).length > 0)
assert.ok(
  errors('agent-acquire-result.v1.schema.json', { ...accepted, details: { kind: 'host', ref: 'https://example.com' } })
    .length > 0,
)
assert.ok(
  errors('agent-acquire-result.v1.schema.json', {
    ...accepted,
    details: { kind: 'host', ref: 'detail-1', url: 'https://example.com' },
  }).length > 0,
)

const capabilities = [
  'agents.create',
  'agents.resume',
  'agents.get',
  'agents.message.submit',
  'agents.message.cancel',
  'agents.cancel',
  'agents.live.subscribe',
  'sessions.get',
  'sessions.read',
  'sessions.subscribe',
  'approvals.request',
  'approvals.answer',
]
const capabilitySchema = ajv.getSchema(`${schema('agents-common.v1.schema.json')}#/$defs/capability`)
assert.ok(capabilitySchema)
for (const capability of capabilities) assert.ok(capabilitySchema(capability), capability)
assert.ok(!capabilitySchema('agents.raw-bridge'))
assert.ok(
  errors('agent-acquire-request.v1.schema.json', { ...createRequest, principal: { pluginId: 'forged', generation: 1 } })
    .length > 0,
)
assert.deepEqual(schemas.get('agents-common.v1.schema.json').$defs.capability.enum, capabilities)

export function ownerHandleAvailability(handle, current) {
  if (handle.owner.pluginId !== current.owner.pluginId || handle.owner.generation !== current.owner.generation) {
    return 'plugin-generation-replaced'
  }
  if (handle.agentGeneration !== current.agentGeneration) return 'agent-replaced'
  if (handle.connectionGeneration !== current.connectionGeneration) return 'connection-replaced'
  return 'available'
}
const ownerHandle = { owner: { pluginId: 'chatroom', generation: 3 }, agentGeneration: 1, connectionGeneration: 4 }
assert.equal(ownerHandleAvailability(ownerHandle, structuredClone(ownerHandle)), 'available')
assert.equal(
  ownerHandleAvailability(ownerHandle, { ...ownerHandle, owner: { pluginId: 'chatroom', generation: 4 } }),
  'plugin-generation-replaced',
)
assert.equal(ownerHandleAvailability(ownerHandle, { ...ownerHandle, agentGeneration: 2 }), 'agent-replaced')
assert.equal(ownerHandleAvailability(ownerHandle, { ...ownerHandle, connectionGeneration: 5 }), 'connection-replaced')

export function validateAcquireExchange(request, result) {
  const found = [
    ...errors('agent-acquire-request.v1.schema.json', request),
    ...errors('agent-acquire-result.v1.schema.json', result),
  ]
  if (result.operation !== request.type) found.push('operation mismatch')
  if (request.mutationId !== result.mutationId) found.push('mutation identity mismatch')
  if (result.status === 'accepted') {
    if (request.type === 'resume' && result.sessionId !== request.sessionId) found.push('resume changed SessionId')
    if (request.type === 'resume' && result.sessionIdSource !== 'caller') {
      found.push('resume SessionId is never Host-minted')
    }
    if (request.type === 'create' && request.sessionId === undefined && result.sessionIdSource !== 'host') {
      found.push('Host-minted create misreported authority')
    }
    if (
      request.type === 'create' && request.sessionId !== undefined
      && (result.sessionId !== request.sessionId || result.sessionIdSource !== 'caller')
    ) found.push('caller create SessionId mismatch')
    if (result.agentGeneration < 1 || result.sessionGeneration < 1) found.push('invalid generation')
  }
  return found
}
assert.deepEqual(validateAcquireExchange(resumeRequest, accepted), [])

export function validateResumeRace(exchanges) {
  const found = []
  const winners = exchanges.filter(entry =>
    entry.result.status === 'accepted' && entry.result.disposition === 'resumed'
  )
  if (winners.length !== 1) found.push('exactly one resume must publish the live Agent')
  const winner = winners[0]
  for (const entry of exchanges) {
    if (entry === winner) continue
    const sameRetry = entry.request.mutationId === winner.request.mutationId
      && entry.owner.pluginId === winner.owner.pluginId && entry.owner.generation === winner.owner.generation
    if (sameRetry) {
      if (entry.result.status !== 'accepted' || entry.result.disposition !== 'replayed') {
        found.push('same-owner same-mutation retry must replay')
      }
    } else if (entry.result.status !== 'conflict' || entry.result.code !== 'agent-already-live') {
      found.push('independent concurrent resume must report agent-already-live')
    }
  }
  return found
}
const race = [
  { owner: { pluginId: 'chatroom', generation: 3 }, request: resumeRequest, result: accepted },
  {
    owner: { pluginId: 'chatroom', generation: 3 },
    request: resumeRequest,
    result: { ...accepted, disposition: 'replayed' },
  },
  {
    owner: { pluginId: 'trace', generation: 1 },
    request: { ...resumeRequest, mutationId: 'resume-2' },
    result: {
      ...resultBase,
      operation: 'resume',
      mutationId: 'resume-2',
      status: 'conflict',
      code: 'agent-already-live',
    },
  },
]
assert.deepEqual(validateResumeRace(race), [])

const admission = {
  $schema: schema('agent-admission.v1.schema.json'),
  contract: 'cordisx.agent-admission/v1',
  schemaVersion: 1,
  status: 'accepted',
  messageId: 'message-1',
}
assert.deepEqual(errors('agent-admission.v1.schema.json', admission), [])
assert.ok(
  errors('agent-admission.v1.schema.json', { ...admission, status: 'denied', code: 'agent-replaced' }).length > 0,
)
for (const forbidden of ['operationId', 'turn', 'assistant', 'result', 'terminal', 'causation']) {
  assert.ok(
    errors('agent-admission.v1.schema.json', { ...admission, [forbidden]: 'forged' }).length > 0,
    `${forbidden} leaked into admission`,
  )
}

const pendingCancellation = {
  $schema: schema('agent-message-cancellation-result.v1.schema.json'),
  contract: 'cordisx.agent-message-cancellation-result/v1',
  schemaVersion: 1,
  status: 'accepted',
  messageId: 'message-1',
}
assert.deepEqual(errors('agent-message-cancellation-result.v1.schema.json', pendingCancellation), [])
assert.deepEqual(
  errors('agent-message-cancellation-result.v1.schema.json', {
    ...pendingCancellation,
    status: 'conflict',
    code: 'already-claimed',
  }),
  [],
)
assert.ok(
  errors('agent-message-cancellation-result.v1.schema.json', {
    ...pendingCancellation,
    status: 'denied',
    code: 'already-claimed',
  }).length > 0,
)
const wholeCancel = {
  $schema: schema('agent-mutation-result.v1.schema.json'),
  contract: 'cordisx.agent-mutation-result/v1',
  schemaVersion: 1,
  operation: 'cancel',
  mutationId: 'cancel-1',
  status: 'accepted',
}
assert.deepEqual(errors('agent-mutation-result.v1.schema.json', wholeCancel), [])
assert.ok(errors('agent-mutation-result.v1.schema.json', { ...wholeCancel, messageId: 'message-1' }).length > 0)

const unavailableStatus = { status: 'unavailable', code: 'whole-agent-idle-unobservable' }
assert.deepEqual(errors('agent-status-observation.v1.schema.json', unavailableStatus), [])
assert.ok(errors('agent-status-observation.v1.schema.json', { status: 'available', value: 'completed' }).length > 0)

const live = {
  agentId: 'session-1',
  sessionId: 'session-1',
  agentGeneration: 1,
  time: 1000,
  type: 'agent/status',
  data: { status: 'running' },
}
assert.deepEqual(errors('agent-live-event.v1.schema.json', live), [])
export function validateAgentSessionIdentity(value) {
  return value.agentId === value.sessionId ? [] : ['AgentId must equal SessionId']
}
assert.deepEqual(validateAgentSessionIdentity(live), [])
assert.deepEqual(validateAgentSessionIdentity({ ...live, agentId: 'different-agent' }), [
  'AgentId must equal SessionId',
])
assert.deepEqual(
  errors('agent-live-event.v1.schema.json', { ...live, type: 'vendor/telemetry', data: { safe: true } }),
  [],
)
assert.ok(errors('agent-live-event.v1.schema.json', { ...live, seq: 1 }).length > 0)
assert.ok(errors('agent-live-event.v1.schema.json', { ...live, replay: true }).length > 0)

console.log('CordisX Agents v1 conformance passed')
