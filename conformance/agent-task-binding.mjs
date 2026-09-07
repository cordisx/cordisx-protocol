import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import Ajv2020 from 'ajv/dist/2020.js'
import { TaskBindingModel } from './agent-task-binding-reference-model.mjs'

const schemaBase = 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/'
const ajv = new Ajv2020({ strict: true, allowUnionTypes: true })
for (const name of ['session-common', 'agent-task-approval-binding']) {
  ajv.addSchema(JSON.parse(await readFile(new URL(`../schemas/${name}.v1.schema.json`, import.meta.url), 'utf8')))
}
const validate = ajv.getSchema(`${schemaBase}agent-task-approval-binding.v1.schema.json`)
assert.equal(validate({ operationId: 'op', toolScope: { runId: 'run' } }), true)
for (const extra of [{ handle: {} }, { callerSessionId: 'forged' }, { token: 'secret' }]) {
  assert.equal(validate({ operationId: 'op', toolScope: {}, ...extra }), false)
}
assert.equal(validate({ operationId: '', toolScope: {} }), false)
const request = {
  operationId: 'op',
  definition: { agentId: 'reviewer', revision: 'rev' },
  context: { kind: 'directory', cwd: '/workspace' },
  text: 'Review',
  tool: { commandId: 'chatroom', scope: { roomId: 'room', runId: 'run' } },
}
const deferred = () => {
  let resolve
  const promise = new Promise(done => {
    resolve = done
  })
  return { promise, resolve }
}
function fixture() {
  const effects = []
  const resources = []
  const genuine = new WeakSet()
  const adapter = {
    handles: new Map(),
    create() {
      const sessionId = `session:${this.handles.size}`
      effects.push('create')
      const handle = Object.freeze({ agent: Object.freeze({ id: sessionId }) })
      genuine.add(handle)
      this.handles.set(sessionId, handle)
      return sessionId
    },
    async install(name, sessionId, invoke) {
      effects.push(name)
      const resource = {
        name,
        sessionId,
        invoke,
        closed: false,
        close() {
          this.closed = true
        },
      }
      resources.push(resource)
      return resource
    },
    async submit(sessionId, messageId) {
      effects.push(['submit', sessionId, messageId])
    },
  }
  const model = new TaskBindingModel(adapter)
  return { effects, resources, genuine, adapter, model }
}
let calls = 0
const handlers = {
  answerLegacy: async () => {
    calls++
    return 'rejected'
  },
  answerAuthority: async () => {
    calls++
    return 'rejected'
  },
  resolveRequest: async question => {
    calls++
    return { ...question, status: 'accepted', authority: question.requester }
  },
}
const f = fixture()
assert.equal((await f.model.create('owner', request)).code, 'tool-unavailable')
assert.deepEqual(f.effects, [])
const dispose = f.model.register('owner', 'chatroom', handlers)
assert.throws(() => f.model.register('owner', 'chatroom', handlers), /duplicate/)
const [accepted, replay] = await Promise.all([f.model.create('owner', request), f.model.create('owner', request)])
assert.equal(calls, 0, 'installing handlers never executes a plugin preparation callback')
assert.equal(replay.disposition, 'replayed')
assert.deepEqual(f.effects.map(effect => Array.isArray(effect) ? effect[0] : effect), [
  'create',
  'answerLegacy',
  'answerAuthority',
  'resolveRequest',
  'submit',
])
assert.equal(accepted.task.sessionId, replay.task.sessionId)
const own = f.model.acquire('owner', 'op')
assert.equal(own.status, 'acquired')
assert.equal(f.genuine.has(own.handle), true)
assert.equal(f.model.acquire('owner', 'op').handle, own.handle)
assert.equal(f.model.acquire('foreign', 'op').code, 'not-found')
assert.equal(f.model.acquire('owner', 'op', false).code, 'permission-denied')
const effects = structuredClone(f.effects)
assert.equal((await f.model.create('owner', request, 'none')).disposition, 'replayed')
assert.equal((await f.model.recover('owner', 'op')).disposition, 'replayed')
assert.deepEqual(f.effects, effects)
dispose()
assert.equal(f.resources.every(resource => resource.closed), true)
assert.equal(await f.resources[0].invoke({}), 'unavailable')
const plain = fixture()
await plain.model.create('owner', request, 'none')
plain.model.register('owner', 'chatroom', handlers)
assert.equal((await plain.model.create('owner', request)).code, 'operation-conflict')
assert.equal((await plain.model.recover('owner', 'op')).code, 'operation-conflict')
assert.equal(plain.effects.length, 2)

for (const failAt of ['answerLegacy', 'answerAuthority', 'resolveRequest']) {
  const g = fixture()
  const install = g.adapter.install.bind(g.adapter)
  g.adapter.install = async (...args) => {
    if (args[0] === failAt) throw new Error('denied')
    return install(...args)
  }
  g.model.register('owner', 'chatroom', handlers)
  const partial = await g.model.create('owner', request)
  assert.equal(partial.code, 'submit-failed')
  assert.equal(g.model.acquire('owner', 'op').code, 'not-accepted')
  assert.equal(g.resources.every(resource => resource.closed), true)
  assert.equal(g.effects.some(effect => Array.isArray(effect)), false)
  assert.deepEqual(await g.model.create('owner', request), partial, 'ordinary retry must not recover')
  g.adapter.install = install
  const [recovered, concurrent] = await Promise.all([g.model.recover('owner', 'op'), g.model.recover('owner', 'op')])
  assert.equal(recovered.status, 'accepted')
  assert.equal(concurrent.task.sessionId, partial.sessionId)
  assert.equal(recovered.task.sessionId, partial.sessionId)
  assert.equal(g.effects.filter(effect => effect === 'create').length, 1)
  assert.equal(g.effects.filter(effect => Array.isArray(effect)).length, 1)
}
const late = fixture()
const pause = deferred()
const install = late.adapter.install.bind(late.adapter)
late.adapter.install = async (...args) => {
  const resource = await install(...args)
  await pause.promise
  return resource
}
const close = late.model.register('owner', 'chatroom', handlers)
const creating = late.model.create('owner', request)
close()
pause.resolve()
assert.equal((await creating).code, 'submit-failed')
assert.equal(late.resources.every(resource => resource.closed), true)
assert.equal(late.effects.some(effect => Array.isArray(effect)), false)
const afterRestart = new TaskBindingModel({ ...late.adapter, handles: new Map() }, structuredClone(late.model.store))
afterRestart.register('owner', 'chatroom', handlers)
assert.equal((await afterRestart.recover('owner', 'op')).code, 'host-unavailable')
const uncertain = fixture()
uncertain.model.register('owner', 'chatroom', handlers)
uncertain.adapter.submit = async () => {
  throw new Error('lost acknowledgement')
}
assert.equal((await uncertain.model.create('owner', request)).code, 'reconciliation-required')
const before = structuredClone(uncertain.effects)
assert.equal((await uncertain.model.recover('owner', 'op')).code, 'reconciliation-required')
assert.deepEqual(uncertain.effects, before)

// Root self-authority and child -> Leader remain existing approval question /
// answer exchanges. Only an explicit human outcome resolves this model's wait.
for (
  const [requester, outcome] of [['leader', 'rejected'], ['leader', 'allowed-once'], ['child', 'rejected'], [
    'child',
    'allowed-once',
  ]]
) {
  const approval = fixture()
  const decision = deferred()
  let routingQuestion, authorityQuestion, capturedBinding, signal
  const stop = approval.model.register('owner', 'chatroom', {
    resolveRequest: (question, binding) => {
      routingQuestion = question
      capturedBinding = binding
      return { status: 'accepted', requester: question.requester, authority: { sessionId: 'leader' } }
    },
    answerAuthority: (question, binding, currentSignal) => {
      authorityQuestion = question
      capturedBinding = binding
      signal = currentSignal
      return decision.promise
    },
  })
  await approval.model.create('owner', request)
  const resolved = await approval.resources.find(resource => resource.name === 'resolveRequest').invoke({
    requester: { sessionId: requester },
  })
  assert.equal(resolved.requester.sessionId, requester)
  assert.equal(resolved.authority.sessionId, 'leader')
  assert.equal(routingQuestion.requester.sessionId, requester)
  const answer = approval.resources.find(resource => resource.name === 'answerAuthority').invoke(resolved)
  assert.equal(authorityQuestion.authority.sessionId, 'leader')
  assert.equal(capturedBinding.operationId, 'op')
  assert.equal(Object.isFrozen(capturedBinding.toolScope), true)
  assert.equal('handle' in capturedBinding, false)
  decision.resolve(outcome)
  assert.equal(await answer, outcome)
  stop()
  assert.equal(signal.aborted, true)
}
const stale = fixture()
const waiting = deferred()
const stop = stale.model.register('owner', 'chatroom', { ...handlers, answerAuthority: () => waiting.promise })
await stale.model.create('owner', request)
const answer = stale.resources.find(resource => resource.name === 'answerAuthority').invoke({})
stop()
waiting.resolve('allowed-once')
assert.equal(await answer, 'unavailable', 'late answer cannot escape its revoked registration')
console.log(
  'agent-task-binding/v1 conformance: required approval lifecycle, policy, same-Session recovery and genuine accepted ownership passed',
)

const invocationScoped = fixture()
const decisions = [deferred(), deferred()]
const sources = [new AbortController(), new AbortController()]
const signals = []
invocationScoped.model.register('owner', 'chatroom', {
  ...handlers,
  answerAuthority: (question, binding, signal) => {
    signals.push(signal)
    return decisions[question.index].promise
  },
})
await invocationScoped.model.create('owner', request)
const resource = invocationScoped.resources.find(item => item.name === 'answerAuthority')
const first = resource.invoke({ index: 0 }, sources[0].signal)
const second = resource.invoke({ index: 1 }, sources[1].signal)
sources[0].abort()
assert.equal(signals[0].aborted, true, 'exact approval close must abort a still-pending callback promptly')
assert.equal(signals[1].aborted, false, 'one approval close must not close a sibling invocation')
decisions[0].resolve('allowed-once')
decisions[1].resolve('rejected')
assert.equal(await first, 'unavailable')
assert.equal(await second, 'rejected')
assert.equal(signals[1].aborted, true, 'settled invocation has no remaining callback lifetime')
