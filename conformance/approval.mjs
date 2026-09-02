import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Ajv2020 from 'ajv/dist/2020.js'
import { validateSessionLog } from './sessions.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const names = ['session-common.v1.schema.json', 'approval-question.v1.schema.json', 'approval-decision.v1.schema.json']
const schemas = new Map()
const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true })
for (const name of names) {
  const value = JSON.parse(await readFile(path.join(root, 'schemas', name), 'utf8'))
  schemas.set(name, value)
  ajv.addSchema(value)
}
const schema = name => schemas.get(name).$id
const check = name => ajv.getSchema(schema(name))

const question = {
  $schema: schema('approval-question.v1.schema.json'),
  contract: 'cordisx.approval-question/v1',
  schemaVersion: 1,
  id: 'approval-1',
  agentId: 'session-1',
  sessionId: 'session-1',
  agentGeneration: 1,
  toolName: 'shell',
  callId: 'call-1',
  reason: 'writes files',
}
const decision = {
  $schema: schema('approval-decision.v1.schema.json'),
  contract: 'cordisx.approval-decision/v1',
  schemaVersion: 1,
  id: 'approval-1',
  agentId: 'session-1',
  sessionId: 'session-1',
  agentGeneration: 1,
  outcome: 'allowed-once',
}
assert.ok(check('approval-question.v1.schema.json')(question))
assert.ok(check('approval-decision.v1.schema.json')(decision))
assert.ok(!check('approval-decision.v1.schema.json')({ ...decision, outcome: 'approved' }))
assert.ok(!check('approval-question.v1.schema.json')({ ...question, permissionRequest: {} }))
assert.ok(!check('approval-question.v1.schema.json')({ ...question, userInput: {} }))
assert.ok(!check('approval-question.v1.schema.json')({ ...question, elicitation: {} }))
assert.equal(question.agentId, question.sessionId)
assert.equal(question.id, decision.id)
assert.equal(question.agentId, decision.agentId)
assert.equal(question.sessionId, decision.sessionId)
assert.equal(question.agentGeneration, decision.agentGeneration)

const eventSchema = 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/session-event.v1.schema.json'
const event = (seq, type, data) => ({ $schema: eventSchema, contract: 'cordisx.session-event/v1', schemaVersion: 1, sessionId: 'session-1', seq, time: 1000 + seq, type, data })
const paired = [
  event(0, 'turn/start', { turn: 1 }),
  event(1, 'approval/asked', { id: question.id, toolName: question.toolName, callId: question.callId, reason: question.reason }),
  event(2, 'approval/decided', { id: decision.id, outcome: decision.outcome }),
  event(3, 'turn/end', { turn: 1, reason: { kind: 'completed' } }),
]
assert.deepEqual(validateSessionLog(paired), [])
assert.ok(validateSessionLog([paired[0], paired[1], paired[3]]).some(value => value.includes('lacks a decision')))
assert.ok(validateSessionLog([paired[0], paired[2], paired[3]]).some(value => value.includes('without one open ask')))

console.log('CordisX Approval v1 conformance passed')
