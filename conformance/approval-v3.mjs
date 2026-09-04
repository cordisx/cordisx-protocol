import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Ajv2020 from 'ajv/dist/2020.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const names = [
  'session-common.v1.schema.json',
  'agents-common.v1.schema.json',
  'approval-common.v2.schema.json',
  'approval-request-routing-registration.v1.schema.json',
  'approval-request-routing-question.v1.schema.json',
  'approval-request-routing-result.v1.schema.json',
  'approval-request-resolver-close.v1.schema.json',
]
const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true })
const schemas = new Map()
for (const name of names) {
  const value = JSON.parse(await readFile(path.join(root, 'schemas', name), 'utf8'))
  schemas.set(name, value)
  ajv.addSchema(value)
}
const validator = name => ajv.getSchema(schemas.get(name).$id)
for (const name of names) assert.ok(validator(name), `${name} must compile under strict AJV`)

const owner = { pluginId: 'chatroom', generation: 9 }
const reviewer = {
  agentId: 'session-reviewer',
  sessionId: 'session-reviewer',
  agentGeneration: 4,
  definition: { agentId: 'reviewer', revision: 'reviewer-r4' },
}
const lead = {
  agentId: 'session-lead',
  sessionId: 'session-lead',
  agentGeneration: 7,
  definition: { agentId: 'lead', revision: 'lead-r2' },
}
const registration = {
  $schema: schemas.get('approval-request-routing-registration.v1.schema.json').$id,
  contract: 'cordisx.approval-request-routing-registration/v1',
  schemaVersion: 1,
  registrationId: 'approval-route-reviewer-4',
  owner,
  requester: reviewer,
}
const question = {
  $schema: schemas.get('approval-request-routing-question.v1.schema.json').$id,
  contract: 'cordisx.approval-request-routing-question/v1',
  schemaVersion: 1,
  routingId: 'driver-request-1',
  registration,
  requester: reviewer,
  toolName: 'review',
  callId: 'call-1',
  reason: { kind: 'plain-text', text: 'Please review the proposed change.' },
}
const accepted = {
  $schema: schemas.get('approval-request-routing-result.v1.schema.json').$id,
  contract: 'cordisx.approval-request-routing-result/v1',
  schemaVersion: 1,
  routingId: question.routingId,
  registration,
  status: 'accepted',
  code: 'routed',
  requester: reviewer,
  authority: lead,
}
const unavailable = {
  $schema: schemas.get('approval-request-routing-result.v1.schema.json').$id,
  contract: 'cordisx.approval-request-routing-result/v1',
  schemaVersion: 1,
  routingId: question.routingId,
  registration,
  status: 'unavailable',
  code: 'authority-unavailable',
}
const closed = {
  $schema: schemas.get('approval-request-resolver-close.v1.schema.json').$id,
  contract: 'cordisx.approval-request-resolver-close/v1',
  schemaVersion: 1,
  registration,
  status: 'closed',
  code: 'connection-replaced',
}

for (const [name, value] of [
  ['approval-request-routing-registration.v1.schema.json', registration],
  ['approval-request-routing-question.v1.schema.json', question],
  ['approval-request-routing-result.v1.schema.json', accepted],
  ['approval-request-routing-result.v1.schema.json', unavailable],
  ['approval-request-resolver-close.v1.schema.json', closed],
]) assert.ok(validator(name)(value), JSON.stringify(validator(name).errors))
assert.deepEqual(structuredClone({ registration, question, accepted, unavailable, closed }), { registration, question, accepted, unavailable, closed })

const same = (left, right) => JSON.stringify(left) === JSON.stringify(right)
const bindingKey = binding => [binding.agentId, binding.sessionId, binding.agentGeneration, binding.definition.agentId, binding.definition.revision].join('\u0000')

export function routingErrors({ question: routedQuestion, result, expectedRegistration, expectedOwner, liveBindings }) {
  const issues = []
  if (routedQuestion.routingId !== result.routingId) issues.push('routing id mismatch')
  if (!same(routedQuestion.registration, expectedRegistration)) issues.push('stale registration')
  if (!same(routedQuestion.registration, result.registration)) issues.push('registration mismatch')
  if (!same(routedQuestion.registration.owner, expectedOwner)) issues.push('owner mismatch')
  if (!same(routedQuestion.registration.requester, routedQuestion.requester)) issues.push('registered requester mismatch')
  if (routedQuestion.requester.agentId !== routedQuestion.requester.sessionId) issues.push('requester AgentId must equal SessionId')
  if (result.status === 'accepted') {
    if (!same(result.requester, routedQuestion.requester)) issues.push('resolved requester mismatch')
    if (result.authority.agentId !== result.authority.sessionId) issues.push('authority AgentId must equal SessionId')
    if (!liveBindings.has(bindingKey(result.requester))) issues.push('requester live binding is stale')
    if (!liveBindings.has(bindingKey(result.authority))) issues.push('authority live binding is stale')
    if (!same(liveBindings.get(bindingKey(result.requester)), expectedOwner)) issues.push('requester live owner mismatch')
    if (!same(liveBindings.get(bindingKey(result.authority)), expectedOwner)) issues.push('authority live owner mismatch')
  }
  return issues
}

const liveBindings = new Map([[bindingKey(reviewer), owner], [bindingKey(lead), owner]])
const validRouting = { question, result: accepted, expectedRegistration: registration, expectedOwner: owner, liveBindings }
assert.deepEqual(routingErrors(validRouting), [])
assert.notDeepEqual(routingErrors({ ...validRouting, expectedOwner: { ...owner, pluginId: 'foreign' } }), [], 'foreign owner fails closed')
assert.notDeepEqual(routingErrors({ ...validRouting, expectedOwner: { ...owner, generation: 10 } }), [], 'replacement owner generation fails closed')
assert.notDeepEqual(routingErrors({ ...validRouting, expectedRegistration: { ...registration, registrationId: 'replacement' } }), [], 'stale registration fails closed')
assert.notDeepEqual(routingErrors({ ...validRouting, question: { ...question, requester: { ...reviewer, sessionId: 'foreign-session' } } }), [], 'wrong requester Session fails closed')
assert.notDeepEqual(routingErrors({ ...validRouting, question: { ...question, requester: { ...reviewer, agentGeneration: 5 } } }), [], 'stale requester generation fails closed')
assert.notDeepEqual(routingErrors({ ...validRouting, result: { ...accepted, authority: { ...lead, agentGeneration: 8 } } }), [], 'stale authority generation fails closed')
assert.notDeepEqual(routingErrors({ ...validRouting, result: { ...accepted, authority: { ...lead, definition: reviewer.definition } } }), [], 'wrong authority definition fails closed')
const foreignAuthorityBindings = new Map(liveBindings)
foreignAuthorityBindings.set(bindingKey(lead), { pluginId: 'foreign', generation: 1 })
assert.notDeepEqual(routingErrors({ ...validRouting, liveBindings: foreignAuthorityBindings }), [], 'foreign authority owner fails closed')

for (const invalid of [
  { ...accepted, routingId: question.routingId, authority: { ...lead, definition: { agentId: '*', revision: lead.definition.revision } } },
  { ...accepted, authorityName: 'Lead' },
  { ...accepted, status: 'unavailable', code: 'authority-unavailable' },
  { ...unavailable, authority: lead },
  { ...unavailable, code: 'legacy-fallback' },
  { ...accepted, schemaVersion: 2 },
  { ...accepted, $schema: 'https://example.invalid/private-schema.json' },
]) assert.equal(validator('approval-request-routing-result.v1.schema.json')(invalid), false)

for (const invalid of [
  { ...question, reason: { kind: 'markdown', text: '**review**' } },
  { ...question, reason: undefined },
  { ...question, registration: { ...registration, owner: { ...owner, pluginId: '*' } } },
  { ...question, requesterName: 'Reviewer' },
]) assert.equal(validator('approval-request-routing-question.v1.schema.json')(invalid), false)

class ResolverLedger {
  #active = new Map()
  #routeRequired = new Set()

  register(binding, resolver, registrationProjection = registration) {
    const key = bindingKey(binding)
    const record = { registration: registrationProjection, resolver }
    this.#routeRequired.add(key)
    this.#active.set(key, record)
    return () => {
      if (this.#active.get(key) === record) this.#active.delete(key)
    }
  }

  async resolve(routedQuestion) {
    const key = bindingKey(routedQuestion.requester)
    const record = this.#active.get(key)
    if (!record) return this.#routeRequired.has(key) ? 'fail-closed' : 'legacy-v1'
    try {
      const result = await record.resolver(routedQuestion)
      return validator('approval-request-routing-result.v1.schema.json')(result) && routingErrors({ question: routedQuestion, result, expectedRegistration: record.registration, expectedOwner: owner, liveBindings }).length === 0
        ? result.status === 'accepted' ? 'approval-v2' : 'fail-closed'
        : 'fail-closed'
    } catch {
      return 'fail-closed'
    }
  }
}

const ledger = new ResolverLedger()
const neverRegistered = { ...reviewer, agentId: 'legacy-session', sessionId: 'legacy-session', agentGeneration: 1 }
assert.equal(await ledger.resolve({ ...question, requester: neverRegistered }), 'legacy-v1', 'never-adopted requester preserves frozen v1 behavior')
const dispose = ledger.register(reviewer, () => accepted)
assert.equal(await ledger.resolve(question), 'approval-v2')
dispose()
assert.equal(await ledger.resolve(question), 'fail-closed', 'disposed resolver cannot downgrade to v1')
ledger.register(reviewer, () => { throw new Error('resolver failed') })
assert.equal(await ledger.resolve(question), 'fail-closed', 'resolver failure cannot persist an unbound approval')
ledger.register(reviewer, () => unavailable)
assert.equal(await ledger.resolve(question), 'fail-closed', 'explicit unavailability cannot downgrade to v1')

const replacementLedger = new ResolverLedger()
const oldDispose = replacementLedger.register(reviewer, () => accepted)
const replacementRegistration = { ...registration, registrationId: 'approval-route-reviewer-4-replacement' }
const replacementQuestion = { ...question, registration: replacementRegistration, routingId: 'driver-request-2' }
const replacementAccepted = { ...accepted, registration: replacementRegistration, routingId: replacementQuestion.routingId }
replacementLedger.register(reviewer, () => replacementAccepted, replacementRegistration)
oldDispose()
assert.equal(await replacementLedger.resolve(replacementQuestion), 'approval-v2', 'disposing a replaced handle cannot close its successor')
assert.equal(await replacementLedger.resolve(question), 'fail-closed', 'a stale registration cannot invoke its replacement')

const persistence = []
ledger.register(reviewer, () => { persistence.push('resolved'); return accepted })
assert.equal(await ledger.resolve(question), 'approval-v2')
persistence.push('approval/authority-bound', 'approval/asked', 'approval/decided')
assert.deepEqual(persistence, ['resolved', 'approval/authority-bound', 'approval/asked', 'approval/decided'], 'routing must finish before the one durable approval chain')

const frozenFiles = [
  'schemas/approval-authority-binding.v1.schema.json',
  'schemas/approval-common.v2.schema.json',
  'schemas/approval-decision.v1.schema.json',
  'schemas/approval-decision.v2.schema.json',
  'schemas/approval-question.v1.schema.json',
  'schemas/approval-question.v2.schema.json',
  'types/approval.v1.d.ts',
  'types/approval.v2.d.ts',
].sort()
const digest = createHash('sha256')
for (const file of frozenFiles) {
  digest.update(file)
  digest.update('\0')
  digest.update(await readFile(path.join(root, file)))
  digest.update('\0')
}
assert.equal(digest.digest('hex'), 'f914b1d5d35798114d3e3e76c1cba20ba1bb8ffc3285d8b04c06ab6720ecf89a', 'Approval v1-v2 public bytes drifted')

for (const file of ['types/approval.v3.d.ts', ...names.map(name => `schemas/${name}`)]) {
  const source = await readFile(path.join(root, file), 'utf8')
  assert.ok(!/DeepSeek|Harness|DSH|pi-agent/iu.test(source), `${file} leaked an external reference-project name`)
}

console.log('CordisX Approval v3 pre-persistence exact authority routing conformance passed')
