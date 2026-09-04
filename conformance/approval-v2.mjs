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
  'agent-avatar.v1.schema.json',
  'agent-loop-common.v1.schema.json',
  'platform-model.v1.schema.json',
  'agent-definition.v1.schema.json',
  'session-event.v1.schema.json',
  'approval-common.v2.schema.json',
  'approval-authority-binding.v1.schema.json',
  'approval-question.v2.schema.json',
  'approval-decision.v2.schema.json',
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

const requesterDefinition = { agentId: 'reviewer', revision: 'reviewer-r4' }
const authorityDefinition = { agentId: 'lead', revision: 'lead-r2' }
const requester = { agentId: 'session-reviewer', sessionId: 'session-reviewer', agentGeneration: 4, definition: requesterDefinition }
const authority = { agentId: 'session-lead', sessionId: 'session-lead', agentGeneration: 7, definition: authorityDefinition }
const reason = { kind: 'plain-text', text: 'Please review the proposed change.' }
const context = { approvalId: 'approval-1', requester: requesterDefinition, authority: authorityDefinition, reason }
const question = {
  $schema: schemas.get('approval-question.v2.schema.json').$id,
  contract: 'cordisx.approval-question/v2',
  schemaVersion: 2,
  id: context.approvalId,
  requester,
  authority,
  toolName: 'review',
  reason,
}
const decision = {
  $schema: schemas.get('approval-decision.v2.schema.json').$id,
  contract: 'cordisx.approval-decision/v2',
  schemaVersion: 2,
  id: context.approvalId,
  requester,
  authority,
  outcome: 'allowed-once',
}
const event = (seq, type, data, ignorable) => ({
  $schema: schemas.get('session-event.v1.schema.json').$id,
  contract: 'cordisx.session-event/v1',
  schemaVersion: 1,
  sessionId: requester.sessionId,
  seq,
  time: 1000 + seq,
  type,
  data,
  ...(ignorable ? { ignorable: true } : {}),
})
const chain = [
  event(1, 'approval/authority-bound', context, true),
  event(2, 'approval/asked', { id: context.approvalId, toolName: question.toolName, reason: reason.text }),
  event(3, 'approval/decided', { id: context.approvalId, outcome: decision.outcome }),
]

assert.ok(validator('approval-authority-binding.v1.schema.json')(context))
assert.ok(validator('approval-question.v2.schema.json')(question))
assert.ok(validator('approval-decision.v2.schema.json')(decision))
for (const value of chain) assert.ok(validator('session-event.v1.schema.json')(value), JSON.stringify(validator('session-event.v1.schema.json').errors))
assert.deepEqual(structuredClone({ context, question, decision, chain }), { context, question, decision, chain })

export function approvalAuthorityChainErrors({ contextEvent, askedEvent, decidedEvent, question: liveQuestion }) {
  const issues = []
  if (contextEvent.type !== 'approval/authority-bound' || contextEvent.ignorable !== true) issues.push('authority context must be one ignorable extension event')
  if (contextEvent.sessionId !== liveQuestion.requester.sessionId || liveQuestion.requester.agentId !== liveQuestion.requester.sessionId) issues.push('requester must own the exact Session')
  if (liveQuestion.authority.agentId !== liveQuestion.authority.sessionId) issues.push('authority AgentId must equal its SessionId')
  if (contextEvent.data.approvalId !== liveQuestion.id || askedEvent.data.id !== liveQuestion.id || decidedEvent.data.id !== liveQuestion.id) issues.push('approval id mismatch')
  if (contextEvent.seq >= askedEvent.seq || askedEvent.seq >= decidedEvent.seq) issues.push('approval facts out of order')
  if (JSON.stringify(contextEvent.data.requester) !== JSON.stringify(liveQuestion.requester.definition)) issues.push('requester definition mismatch')
  if (JSON.stringify(contextEvent.data.authority) !== JSON.stringify(liveQuestion.authority.definition)) issues.push('authority definition mismatch')
  if (contextEvent.data.reason.kind !== 'plain-text' || contextEvent.data.reason.text !== askedEvent.data.reason || askedEvent.data.reason !== liveQuestion.reason.text) issues.push('reason mismatch')
  return issues
}
const valid = { contextEvent: chain[0], askedEvent: chain[1], decidedEvent: chain[2], question }
assert.deepEqual(approvalAuthorityChainErrors(valid), [])
assert.notDeepEqual(approvalAuthorityChainErrors({ ...valid, askedEvent: { ...chain[1], data: { ...chain[1].data, id: 'other' } } }), [])
assert.notDeepEqual(approvalAuthorityChainErrors({ ...valid, contextEvent: { ...chain[0], sessionId: 'other-session' } }), [])
assert.notDeepEqual(approvalAuthorityChainErrors({ ...valid, decidedEvent: { ...chain[2], seq: 1 } }), [])
assert.notDeepEqual(approvalAuthorityChainErrors({ ...valid, askedEvent: { ...chain[1], data: { ...chain[1].data, reason: 'generic scenario label' } } }), [])
assert.notDeepEqual(approvalAuthorityChainErrors({ ...valid, question: { ...question, authority: { ...authority, definition: requesterDefinition } } }), [])

export function uniqueDurableChainErrors(events, sessionId, approvalId) {
  const contexts = events.filter(value => value.sessionId === sessionId && value.type === 'approval/authority-bound' && value.data.approvalId === approvalId)
  const asked = events.filter(value => value.sessionId === sessionId && value.type === 'approval/asked' && value.data.id === approvalId)
  const decided = events.filter(value => value.sessionId === sessionId && value.type === 'approval/decided' && value.data.id === approvalId)
  if (contexts.length !== 1 || asked.length !== 1 || decided.length !== 1) return ['approval requires one unique authority-bound, asked, and decided chain']
  return contexts[0].seq < asked[0].seq && asked[0].seq < decided[0].seq ? [] : ['approval facts out of order']
}
assert.deepEqual(uniqueDurableChainErrors(chain, requester.sessionId, context.approvalId), [])
assert.notDeepEqual(uniqueDurableChainErrors(chain.slice(1), requester.sessionId, context.approvalId), [], 'missing authority context fails closed')
assert.notDeepEqual(uniqueDurableChainErrors([...chain, chain[0]], requester.sessionId, context.approvalId), [], 'duplicate authority context fails closed')
assert.notDeepEqual(uniqueDurableChainErrors(chain, authority.sessionId, context.approvalId), [], 'foreign Session lookup cannot recover the chain')

for (const invalid of [
  { ...context, authority: { agentId: 'lead', revision: '*' } },
  { ...context, authorityName: 'Lead' },
  { ...context, authority: { agentId: '*', revision: 'lead-r2' } },
  { ...context, reason: { kind: 'markdown', text: '**review**' } },
]) assert.equal(validator('approval-authority-binding.v1.schema.json')(invalid), false)

const answerers = new Map()
const bindingKey = binding => [binding.agentId, binding.sessionId, binding.agentGeneration, binding.definition.agentId, binding.definition.revision].join('\u0000')
answerers.set(bindingKey(authority), () => 'allowed-once')
assert.equal(answerers.get(bindingKey(authority))(question), 'allowed-once')
assert.equal(answerers.get(bindingKey({ ...authority, agentGeneration: 8 })), undefined, 'replacement generation cannot inherit authority')
assert.equal(answerers.get(bindingKey({ ...authority, sessionId: requester.sessionId })), undefined, 'requester Session cannot impersonate authority')

const v1Files = ['schemas/approval-decision.v1.schema.json', 'schemas/approval-question.v1.schema.json', 'types/approval.v1.d.ts'].sort()
const digest = createHash('sha256')
for (const file of v1Files) {
  digest.update(file)
  digest.update('\0')
  digest.update(await readFile(path.join(root, file)))
  digest.update('\0')
}
assert.equal(digest.digest('hex'), 'ce114e456f6c5b9a540db2a6f5957e5f548c99ed48d78783adfd9ed4f43f53c8', 'Approval v1 public bytes drifted')

for (const file of ['types/approval.v2.d.ts', 'schemas/approval-common.v2.schema.json', 'schemas/approval-authority-binding.v1.schema.json']) {
  const source = await readFile(path.join(root, file), 'utf8')
  assert.ok(!/DeepSeek|Harness|DSH|pi-agent/iu.test(source), `${file} leaked an external reference-project name`)
}

console.log('CordisX Approval v2 exact authority and durable binding conformance passed')
