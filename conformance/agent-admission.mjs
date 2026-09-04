import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Ajv2020 from 'ajv/dist/2020.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const names = ['session-common.v1.schema.json','agents-common.v1.schema.json','ui-common.v1.schema.json','approval-common.v2.schema.json','agent-conversation-shell-common.v2.schema.json','agent-conversation-shell-common.v7.schema.json','agent-command-origin.v1.schema.json','agent-admission-receipt.v1.schema.json','agent-admission-capture-close.v1.schema.json','agent-admission-capture-result.v1.schema.json','agent-conversation-shell-command-context.v8.schema.json','agent-admission-target-origin.v3.schema.json','agent-admission-target-reservation.v3.schema.json']
const ajv = new Ajv2020({ strict: true, allErrors: true, allowUnionTypes: true })
for (const name of names) ajv.addSchema(JSON.parse(await readFile(path.join(root, 'schemas', name), 'utf8')))
const origin = {$schema:'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/agent-command-origin.v1.schema.json',contract:'cordisx.agent-command-origin/v1',schemaVersion:1,originId:'origin-1',binding:{bindingId:'binding-1',ownerGeneration:'owner-1'},generation:'shell-1',executionId:'exec-1',commandId:'chatroom.message.submit',scope:'composer-submit',room:{roomId:'room-4',participantId:'participant-lead',memberId:'member-lead',runId:'run-4'}}
const receipt = {$schema:'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/agent-admission-receipt.v1.schema.json',contract:'cordisx.agent-admission-receipt/v1',schemaVersion:1,receiptId:'receipt-1',owner:{pluginId:'chatroom',generation:9},origin,sessionId:'d1d799a6',agentGeneration:1,messageId:'message-1'}
const validate = name => ajv.getSchema(`https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/${name}`)
assert.equal(validate('agent-command-origin.v1.schema.json')(origin), true)
assert.equal(validate('agent-admission-receipt.v1.schema.json')(receipt), true)
const context = {$schema:'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/agent-conversation-shell-command-context.v8.schema.json',contract:'cordisx.agent-conversation-shell-command-context/v8',schemaVersion:8,binding:origin.binding,generation:origin.generation,scope:'composer-submit',command:{id:origin.commandId},submitPayload:'hello',origin}
assert.equal(validate('agent-conversation-shell-command-context.v8.schema.json')(context), true)
assert.deepEqual(structuredClone(receipt), receipt)
assert.equal(validate('agent-conversation-shell-command-context.v8.schema.json')({...context, origin: undefined}), false)
const targetOrigins = ['leader/run-1', 'reviewer/run-2', 'integrator/run-3'].map((target, index) => ({ $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/agent-admission-target-origin.v3.schema.json', contract: 'cordisx.agent-admission-target-origin/v3', schemaVersion: 3, token: `host-issued-${index}-${target}` }))
for (const targetOrigin of targetOrigins) assert.equal(validate('agent-admission-target-origin.v3.schema.json')(targetOrigin), true)
assert.equal(new Set(targetOrigins.map(value => value.token)).size, 3, 'each delivery receives a distinct Host-issued capability')
const targetReservation = (origin) => ({ $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/agent-admission-target-reservation.v3.schema.json', contract: 'cordisx.agent-admission-target-reservation/v3', schemaVersion: 3, reservationId: `reservation-${origin.token}`, origin, message: { text: 'dispatch text' } })
assert.equal(validate('agent-admission-target-reservation.v3.schema.json')(targetReservation(targetOrigins[0])), true)
const consume = (used, target, origin) => {
  if (used.has(origin.token)) return 'reused'
  if (origin !== targetOrigins[target]) return 'target-mismatch'
  used.add(origin.token); return 'reserved'
}
const used = new Set()
const twoTargets = new Set()
assert.equal(consume(twoTargets, 0, targetOrigins[0]), 'reserved')
assert.equal(consume(twoTargets, 1, targetOrigins[1]), 'reserved')
assert.equal(consume(used, 0, targetOrigins[0]), 'reserved')
assert.equal(consume(used, 1, targetOrigins[1]), 'reserved')
assert.equal(consume(used, 2, targetOrigins[2]), 'reserved')
assert.equal(consume(used, 1, targetOrigins[0]), 'reused')
assert.equal(consume(new Set(), 1, targetOrigins[0]), 'target-mismatch')
console.log('agent admission v1-v3 and shell v8 conformance passed')
