import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import Ajv2020 from 'ajv/dist/2020.js'
import { AgentTaskModel, canonical } from './agent-task-reference-model.mjs'

const schemaBase = 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/'
const ajv = new Ajv2020({ strict: true, allErrors: true, allowUnionTypes: true })
for (
  const name of [
    'session-common',
    'agents-common',
    'agent-detail-reference',
    'agent-task-common',
    'agent-task-create-request',
    'agent-task-create-result',
    'agent-task-query-request',
    'agent-task-query-result',
  ]
) {
  ajv.addSchema(JSON.parse(await readFile(new URL(`../schemas/${name}.v1.schema.json`, import.meta.url), 'utf8')))
}
const validate = name => ajv.getSchema(`${schemaBase}agent-task-${name}.v1.schema.json`)
const request = {
  operationId: 'assignment:1',
  definition: { agentId: 'reviewer', revision: 'rev:1' },
  context: { kind: 'directory', cwd: '/workspace' },
  text: 'Review the change',
  tool: { commandId: 'chatroom', scope: { roomId: 'room:1', runId: 'run:1' } },
}
for (
  const context of [request.context, { kind: 'project', projectId: 'project:1' }, {
    kind: 'inherit',
    sessionId: 'parent:1',
  }]
) {
  assert.equal(validate('create-request')({ ...request, context }), true)
}
for (
  const invalid of [
    { ...request, context: undefined },
    { ...request, context: { kind: 'directory', projectId: 'project:1' } },
    { ...request, context: { kind: 'inherit', sessionId: 'parent', cwd: '/forged' } },
    { ...request, callerSessionId: 'forged' },
    { ...request, tool: { ...request.tool, token: 'secret' } },
    { ...request, operationId: '' },
    { ...request, text: '' },
  ]
) assert.equal(validate('create-request')(invalid), false)
assert.equal(validate('query-request')({ operationId: 'x' }), true)
assert.equal(validate('query-request')({ operationId: 'x', owner: 'other' }), false)
assert.equal(canonical({ b: [2, 1], a: -0 }), canonical({ a: 0, b: [2, 1] }))
assert.notEqual(canonical({ a: [] }), canonical({ a: null }))
assert.notEqual(canonical({ a: [1, 2] }), canonical({ a: [2, 1] }))

function fixture() {
  const store = new Map()
  const effects = []
  const parents = new Map([['owner:parent:1', { cwd: '/parent' }]])
  const adapter = {
    authorized: true,
    definitionAvailable: true,
    toolAvailable: true,
    state: { status: 'unavailable', code: 'host-unavailable' },
    resolve(owner, context) {
      if (context.kind === 'project') return 'project-unavailable'
      if (context.kind === 'inherit') {
        return structuredClone(parents.get(`${owner}:${context.sessionId}`) ?? 'context-unavailable')
      }
      return context.cwd.startsWith('/') ? { cwd: context.cwd } : 'directory-unavailable'
    },
    async create(context) {
      effects.push('create')
      return { id: `session:${effects.filter(x => x === 'create').length}`, cwd: context.cwd }
    },
    async bind() {
      effects.push('bind')
      return true
    },
    async submit() {
      effects.push('submit')
      return true
    },
    observe() {
      return this.state
    },
  }
  const model = new AgentTaskModel(store, adapter, validate('create-request'))
  return { store, effects, adapter, model, parents }
}
const f = fixture()
for (
  const [mutation, code] of [
    [{ context: undefined }, 'context-required'],
    [{ context: { kind: 'directory', cwd: 'relative' } }, 'directory-unavailable'],
    [{ context: { kind: 'project', projectId: '/not-a-cwd' } }, 'project-unavailable'],
    [{ context: { kind: 'inherit', sessionId: 'foreign-parent' } }, 'context-unavailable'],
    [{ text: '   ' }, 'invalid-input'],
  ]
) {
  assert.equal((await f.model.create('owner', { ...request, ...mutation })).code, code)
  assert.equal(f.store.size, 0, 'preflight failure must not reserve an identity')
}
assert.deepEqual(f.effects, [])
assert.equal((await f.model.create('owner', request, false)).code, 'permission-denied')
for (
  const [property, code] of [['definitionAvailable', 'definition-unavailable'], ['toolAvailable', 'tool-unavailable']]
) {
  f.adapter[property] = false
  assert.equal((await f.model.create('owner', request)).code, code)
  f.adapter[property] = true
}
assert.deepEqual(f.effects, [])
let early
f.adapter.submit = async (sessionId, messageId) => {
  f.effects.push('submit')
  early = { sessionId, messageId, query: f.model.query('owner', request.operationId) }
  return true
}
const [created, replayed] = await Promise.all([
  f.model.create('owner', request),
  f.model.create('owner', { ...request, tool: { scope: { runId: 'run:1', roomId: 'room:1' }, commandId: 'chatroom' } }),
])
assert.equal(created.status, 'accepted')
assert.equal(replayed.disposition, 'replayed')
assert.deepEqual(created.task, replayed.task)
assert.deepEqual(f.effects, ['create', 'bind', 'submit'])
assert.equal(early.sessionId, created.task.sessionId)
assert.equal(early.messageId, created.task.messageId)
assert.equal(early.query.result.code, 'reconciliation-required', 'early report is not admission proof')
assert.equal(early.query.execution.status, 'unavailable')
for (
  const mutation of [
    { text: 'different' },
    { options: {} },
    { definition: { ...request.definition, revision: 'rev:2' } },
    { context: { kind: 'directory', cwd: '/other' } },
    { tool: { ...request.tool, scope: {} } },
  ]
) assert.equal((await f.model.create('owner', { ...request, ...mutation })).code, 'operation-conflict')
assert.deepEqual(f.effects, ['create', 'bind', 'submit'])
assert.deepEqual(f.model.query('foreign', request.operationId), { status: 'not-found' })
assert.deepEqual(f.model.query('owner', request.operationId, false), {
  status: 'unavailable',
  code: 'permission-denied',
})
assert.equal(f.model.query('owner', request.operationId).execution.status, 'unavailable')
f.adapter.state = { status: 'available', value: 'running' }
assert.equal(f.model.query('owner', request.operationId).execution.value, 'running')
const restarted = new AgentTaskModel(structuredClone(f.store), f.adapter, validate('create-request'))
assert.equal((await restarted.create('owner', request)).disposition, 'replayed')
assert.equal(restarted.query('owner', request.operationId).result.disposition, 'created')
assert.equal((await restarted.create('owner', request, false)).code, 'permission-denied')
assert.deepEqual(f.effects, ['create', 'bind', 'submit'])

for (const boundary of ['create', 'bind', 'submit', 'mismatch', 'submit-denied']) {
  const g = fixture()
  if (boundary === 'mismatch') {
    g.adapter.create = async () => {
      g.effects.push('create')
      return { id: 'partial', cwd: '/wrong' }
    }
  } else if (boundary === 'submit-denied') {
    g.adapter.submit = async () => {
      g.effects.push('submit')
      return false
    }
  } else {g.adapter[boundary] = async () => {
      g.effects.push(boundary)
      throw new Error('acknowledgement lost')
    }}
  const failed = await g.model.create('owner', request)
  const code = boundary === 'mismatch'
    ? 'context-unavailable'
    : boundary === 'submit-denied'
    ? 'submit-failed'
    : 'reconciliation-required'
  assert.equal(failed.code, code)
  assert.equal(Boolean(failed.sessionId), boundary !== 'create')
  const effects = [...g.effects]
  const recovered = new AgentTaskModel(structuredClone(g.store), g.adapter, validate('create-request'))
  assert.deepEqual(await recovered.create('owner', request), failed)
  assert.deepEqual(recovered.query('owner', request.operationId).result, failed)
  assert.deepEqual(g.effects, effects, 'restart retry must not repeat an uncertain side effect')
  assert.equal(validate('create-result')(failed), true)
  assert.equal(validate('query-result')(recovered.query('owner', request.operationId)), true)
}
const inherited = fixture()
const inheritedRequest = { ...request, context: { kind: 'inherit', sessionId: 'parent:1' } }
const child = await inherited.model.create('owner', inheritedRequest)
inherited.parents.set('owner:parent:1', { cwd: '/changed' })
assert.equal((await inherited.model.create('owner', inheritedRequest)).task.context.cwd, '/parent')
assert.equal(child.task.context.cwd, '/parent')
assert.equal((await inherited.model.create('foreign', inheritedRequest)).code, 'context-unavailable')
for (const result of [created, replayed]) assert.equal(validate('create-result')(result), true)
assert.equal(validate('query-result')(f.model.query('owner', request.operationId)), true)
for (
  const result of [
    { ...created, task: { ...created.task, nativeThreadId: 'private' } },
    { ...created, task: { ...created.task, messageId: undefined } },
    { status: 'unavailable', operationId: 'x', code: 'made-up' },
  ]
) assert.equal(validate('create-result')(result), false)
assert.equal(
  validate('query-result')({
    status: 'found',
    result: created,
    execution: { status: 'available', value: 'completed' },
  }),
  false,
)
console.log(
  'agent-task/v1 conformance: schemas, preflight, binding order, durable idempotency, partial/restart, early reports and isolation passed',
)

for (const scope of [NaN, Infinity, () => {}, new Date(), { value: undefined }]) {
  const invalid = fixture()
  assert.equal(
    (await invalid.model.create('owner', { ...request, tool: { ...request.tool, scope } })).code,
    'invalid-input',
  )
  assert.deepEqual(invalid.effects, [])
}
const cyclic = {}
cyclic.self = cyclic
assert.equal(
  (await fixture().model.create('owner', { ...request, tool: { ...request.tool, scope: cyclic } })).code,
  'invalid-input',
)
for (const phase of ['known-create-failure', 'known-bind-failure', 'generation-replaced']) {
  const g = fixture()
  if (phase === 'known-create-failure') g.adapter.create = async () => null
  if (phase === 'known-bind-failure') g.adapter.bind = async () => false
  if (phase === 'generation-replaced') {
    g.adapter.bind = async () => {
      g.adapter.authorized = false
      return true
    }
  }
  const result = await g.model.create('owner', request)
  assert.equal(
    result.code,
    phase === 'known-create-failure'
      ? 'create-failed'
      : phase === 'known-bind-failure'
      ? 'tool-unavailable'
      : 'host-unavailable',
  )
  assert.equal(g.effects.includes('submit'), false)
}
const isolated = fixture()
const ownerOne = await isolated.model.create('owner', request)
const ownerTwo = await isolated.model.create('foreign', request)
assert.notEqual(ownerOne.task.sessionId, ownerTwo.task.sessionId)
