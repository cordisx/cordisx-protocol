import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Ajv2020 from 'ajv/dist/2020.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const names = ['session-common.v1.schema.json','agents-common.v1.schema.json','ui-common.v1.schema.json','approval-common.v2.schema.json','agent-conversation-shell-common.v2.schema.json','agent-conversation-shell-common.v7.schema.json','agent-command-origin.v1.schema.json','agent-bootstrap-command-origin.v1.schema.json','agent-admission-receipt.v1.schema.json','agent-admission-capture-close.v1.schema.json','agent-admission-capture-result.v1.schema.json','agent-conversation-shell-command-context.v8.schema.json','agent-conversation-shell-command-context.v9.schema.json','agent-admission-target-origin.v3.schema.json','agent-admission-target-reservation.v3.schema.json','agent-admission-bootstrap-target-origin.v4.schema.json','agent-admission-bootstrap-reservation.v4.schema.json','agent-admission-bootstrap-room-target-origin.v5.schema.json','agent-admission-bootstrap-room-reservation.v5.schema.json','agent-admission-bootstrap-room-target-receipt.v5.schema.json','agent-admission-bootstrap-route-continuation.v6.schema.json','agent-admission-bootstrap-route-reservation.v6.schema.json','agent-admission-bootstrap-route-claim-receipt.v6.schema.json']
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
const bootstrap = {$schema:'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/agent-bootstrap-command-origin.v1.schema.json',contract:'cordisx.agent-bootstrap-command-origin/v1',schemaVersion:1,originId:'bootstrap-1',binding:{bindingId:'binding-bootstrap',ownerGeneration:'owner-bootstrap'},generation:'shell-bootstrap',executionId:'execution-bootstrap',commandId:'chatroom.message.submit',scope:'composer-submit'}
assert.equal(validate('agent-bootstrap-command-origin.v1.schema.json')(bootstrap), true)
const bootstrapContext = {$schema:'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/agent-conversation-shell-command-context.v9.schema.json',contract:'cordisx.agent-conversation-shell-command-context/v9',schemaVersion:9,binding:bootstrap.binding,generation:bootstrap.generation,scope:'composer-submit',command:{id:bootstrap.commandId},submitPayload:'first room',origin:bootstrap}
assert.equal(validate('agent-conversation-shell-command-context.v9.schema.json')(bootstrapContext), true, 'fresh Room bootstrap has no active Run or Session')
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
const bootstrapOrigins = [1, 2, 3].map(index => ({ $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/agent-admission-bootstrap-target-origin.v4.schema.json', contract: 'cordisx.agent-admission-bootstrap-target-origin/v4', schemaVersion: 4, token: `bootstrap-target-${index}` }))
for (const targetOrigin of bootstrapOrigins) assert.equal(validate('agent-admission-bootstrap-target-origin.v4.schema.json')(targetOrigin), true)
assert.equal(new Set(bootstrapOrigins.map(value => value.token)).size, 3, 'one bootstrap command issues distinct origins for N=3 new targets')
const bootstrapUsed = new Set()
const consumeBootstrap = (target, origin) => {
  if (bootstrapUsed.has(origin.token)) return 'reused'
  if (origin !== bootstrapOrigins[target]) return 'target-mismatch'
  bootstrapUsed.add(origin.token); return 'reserved'
}
for (const targetOrigin of bootstrapOrigins) assert.equal(consumeBootstrap(bootstrapOrigins.indexOf(targetOrigin), targetOrigin), 'reserved')
assert.equal(bootstrapOrigins.slice(0, 1).length, 1, 'N=1 bootstrap target is supported')
assert.equal(bootstrapOrigins.slice(0, 2).length, 2, 'N=2 bootstrap targets are independently supported')
assert.equal(consumeBootstrap(1, bootstrapOrigins[0]), 'reused', 'cross-target reuse fails closed')
assert.equal(validate('agent-conversation-shell-command-context.v9.schema.json')({...bootstrapContext, origin: undefined}), false, 'predecessor no-origin path remains unavailable')
const roomTargets = [
  { roomId: 'room-fresh', participantId: 'participant-lead', memberId: 'member-lead', runId: 'run-lead' },
  { roomId: 'room-fresh', participantId: 'participant-reviewer', memberId: 'member-reviewer', runId: 'run-reviewer' },
  { roomId: 'room-fresh', participantId: 'participant-integrator', memberId: 'member-integrator', runId: 'run-integrator' },
]
const roomOrigins = roomTargets.map((target, index) => ({ $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/agent-admission-bootstrap-room-target-origin.v5.schema.json', contract: 'cordisx.agent-admission-bootstrap-room-target-origin/v5', schemaVersion: 5, token: `room-fresh-${index}` }))
for (const value of roomOrigins) assert.equal(validate('agent-admission-bootstrap-room-target-origin.v5.schema.json')(value), true)
const roomReceipt = { $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/agent-admission-bootstrap-room-target-receipt.v5.schema.json', contract: 'cordisx.agent-admission-bootstrap-room-target-receipt/v5', schemaVersion: 5, receiptId: 'room-receipt-1', target: roomTargets[0] }
assert.equal(validate('agent-admission-bootstrap-room-target-receipt.v5.schema.json')(roomReceipt), true)
assert.deepEqual(structuredClone(roomReceipt), roomReceipt, 'Host can carry exact Room receipt into source capture')
const committedRoom = roomTargets[0].roomId
const issuedRoomTargets = new Set()
const issueRoom = (target, origin) => {
  if (target.roomId !== committedRoom) return 'cross-room'
  const key = [target.roomId, target.participantId, target.memberId, target.runId].join('\u0000')
  if (issuedRoomTargets.has(key)) return 'duplicate-target'
  issuedRoomTargets.add(key); return origin.token.startsWith('room-fresh-') ? 'issued' : 'target-denied'
}
assert.equal(issueRoom(roomTargets[0], roomOrigins[0]), 'issued', 'N=1 same-room target commits source Room authority')
assert.equal(issueRoom(roomTargets[1], roomOrigins[1]), 'issued', 'N=2 same-room target commits separately')
assert.equal(issueRoom(roomTargets[2], roomOrigins[2]), 'issued', 'N=3 same-room target commits separately')
assert.equal(issueRoom(roomTargets[0], roomOrigins[0]), 'duplicate-target')
assert.equal(issueRoom({ ...roomTargets[0], roomId: 'foreign-room' }, roomOrigins[0]), 'cross-room')
const routeTargets = roomTargets.map(target => ({ ...target, route: { routeId: 'room', param: 'roomId', roomId: target.roomId } }))
const continuations = routeTargets.map((target, index) => ({ $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/agent-admission-bootstrap-route-continuation.v6.schema.json', contract: 'cordisx.agent-admission-bootstrap-route-continuation/v6', schemaVersion: 6, token: `route-continuation-${index}` }))
for (const continuation of continuations) assert.equal(validate('agent-admission-bootstrap-route-continuation.v6.schema.json')(continuation), true)
const routeReservation = { $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/agent-admission-bootstrap-route-reservation.v6.schema.json', contract: 'cordisx.agent-admission-bootstrap-route-reservation/v6', schemaVersion: 6, reservationId: 'route-reservation-1', continuation: continuations[0], message: { text: 'dispatch text' } }
assert.equal(validate('agent-admission-bootstrap-route-reservation.v6.schema.json')(routeReservation), true)
const routeClaimReceipt = { $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/agent-admission-bootstrap-route-claim-receipt.v6.schema.json', contract: 'cordisx.agent-admission-bootstrap-route-claim-receipt/v6', schemaVersion: 6, receiptId: 'route-claim-1', owner: { pluginId: 'chatroom', generation: 9 }, origin: bootstrap, target: routeTargets[0], binding: { binding: { bindingId: 'binding-room-fresh', ownerGeneration: 'owner-bootstrap' }, generation: 'shell-room-fresh', route: routeTargets[0].route }, source: { sessionId: 'session-lead', messageId: 'cx-message' } }
assert.equal(validate('agent-admission-bootstrap-route-claim-receipt.v6.schema.json')(routeClaimReceipt), true)
assert.deepEqual(structuredClone(routeClaimReceipt), routeClaimReceipt, 'the Host-stamped rebind receipt is clone-safe')
assert.equal(validate('agent-admission-bootstrap-route-claim-receipt.v6.schema.json')({ ...routeClaimReceipt, target: { ...routeClaimReceipt.target, route: { ...routeClaimReceipt.target.route, param: 'sessionId' } } }), false, 'unknown Room route parameter fails schema validation')
assert.equal(validate('agent-admission-bootstrap-route-claim-receipt.v6.schema.json')({ ...routeClaimReceipt, source: { ...routeClaimReceipt.source, extra: 'forbidden' } }), false, 'unbounded source fields fail schema validation')
const openRouteCommand = count => {
  const targets = routeTargets.slice(0, count)
  const commandContinuations = targets.map((_, index) => ({ ...continuations[index], token: `command-${count}-${index}` }))
  const declared = new Map()
  const submitted = new Set()
  const consumed = new Set()
  const rejected = new Set()
  const declare = (target, continuation) => {
    if (target.route.roomId !== target.roomId || target.route.param !== 'roomId') return 'route-denied'
    if (declared.size && [...declared.values()][0].target.roomId !== target.roomId) return 'cross-room'
    const key = [target.roomId, target.participantId, target.memberId, target.runId].join('\u0000')
    if (declared.has(key)) return 'duplicate-target'
    declared.set(key, { target, continuation }); return 'declared'
  }
  const claim = (continuation, route, source, fence) => {
    if (consumed.has(continuation.token) || rejected.has(continuation.token)) return 'reused'
    if (fence) { rejected.add(continuation.token); return fence }
    const value = [...declared.values()].find(entry => entry.continuation === continuation)
    if (!value) return 'continuation-denied'
    if (!submitted.has(continuation.token)) { rejected.add(continuation.token); return 'not-submitted' }
    if (!value || route.routeId !== value.target.route.routeId || route.param !== value.target.route.param || route.roomId !== value.target.roomId) { rejected.add(continuation.token); return 'route-mismatch' }
    if (source.sessionId !== `session-${value.target.memberId.slice('member-'.length)}` || source.messageId !== 'cx-message') { rejected.add(continuation.token); return 'source-mismatch' }
    consumed.add(continuation.token); return 'claimed'
  }
  const reserve = (continuation, target) => {
    const value = [...declared.values()].find(entry => entry.continuation === continuation)
    if (!value) return 'continuation-denied'
    return value.target === target ? 'reserved' : 'target-mismatch'
  }
  return { targets, continuations: commandContinuations, declare, submitted, claim, reserve }
}
for (const count of [1, 2, 3]) {
  const command = openRouteCommand(count)
  for (const [index, target] of command.targets.entries()) assert.equal(command.declare(target, command.continuations[index]), 'declared', `v6 declares exact same-room target ${index + 1} of N=${count}`)
  for (const [index, target] of command.targets.entries()) assert.equal(command.reserve(command.continuations[index], target), 'reserved', `v6 reserves exact target ${index + 1} of N=${count}`)
  for (const continuation of command.continuations) command.submitted.add(continuation.token)
  for (const [index, target] of command.targets.entries()) {
    const member = target.memberId.slice('member-'.length)
    assert.equal(command.claim(command.continuations[index], target.route, { sessionId: `session-${member}`, messageId: 'cx-message' }), 'claimed', `v6 atomically transfers target ${index + 1} of N=${count}`)
  }
}
const beforeSubmit = openRouteCommand(1)
assert.equal(beforeSubmit.declare(beforeSubmit.targets[0], beforeSubmit.continuations[0]), 'declared')
assert.equal(beforeSubmit.claim(beforeSubmit.continuations[0], beforeSubmit.targets[0].route, { sessionId: 'session-lead', messageId: 'cx-message' }), 'not-submitted', 'claim before accepted submit fails closed')
assert.equal(beforeSubmit.claim(beforeSubmit.continuations[0], beforeSubmit.targets[0].route, { sessionId: 'session-lead', messageId: 'cx-message' }), 'reused', 'a premature claim consumes the continuation')
const crossRoom = openRouteCommand(1)
assert.equal(crossRoom.declare(crossRoom.targets[0], crossRoom.continuations[0]), 'declared')
crossRoom.submitted.add(crossRoom.continuations[0].token)
assert.equal(crossRoom.claim(crossRoom.continuations[0], { ...crossRoom.targets[0].route, roomId: 'foreign-room' }, { sessionId: 'session-lead', messageId: 'cx-message' }), 'route-mismatch', 'cross-room rebinding is rejected and consumed')
const crossTarget = openRouteCommand(2)
assert.equal(crossTarget.declare(crossTarget.targets[0], crossTarget.continuations[0]), 'declared')
assert.equal(crossTarget.declare(crossTarget.targets[1], crossTarget.continuations[1]), 'declared')
assert.equal(crossTarget.reserve(crossTarget.continuations[0], crossTarget.targets[1]), 'target-mismatch', 'a continuation cannot reserve a different Room target')
assert.equal(crossTarget.reserve({ ...crossTarget.continuations[0], token: 'forged-continuation' }, crossTarget.targets[0]), 'continuation-denied', 'a forged continuation has no reservation authority')
crossTarget.submitted.add(crossTarget.continuations[0].token)
assert.equal(crossTarget.claim(crossTarget.continuations[0], crossTarget.targets[0].route, { sessionId: 'session-wrong', messageId: 'cx-message' }), 'source-mismatch', 'a claimed source must equal the accepted Session and message')
const replaced = openRouteCommand(1)
assert.equal(replaced.declare(replaced.targets[0], replaced.continuations[0]), 'declared')
replaced.submitted.add(replaced.continuations[0].token)
assert.equal(replaced.claim(replaced.continuations[0], replaced.targets[0].route, { sessionId: 'session-lead', messageId: 'cx-message' }, 'binding-replaced'), 'binding-replaced', 'a non-declared binding replacement cannot transfer the capture')
assert.equal(replaced.claim(replaced.continuations[0], replaced.targets[0].route, { sessionId: 'session-lead', messageId: 'cx-message' }), 'reused', 'a fenced continuation cannot be reclaimed')
const duplicate = openRouteCommand(1)
assert.equal(duplicate.declare(duplicate.targets[0], duplicate.continuations[0]), 'declared')
assert.equal(duplicate.declare(duplicate.targets[0], duplicate.continuations[0]), 'duplicate-target')
assert.equal(duplicate.declare({ ...duplicate.targets[0], roomId: 'foreign-room', route: { ...duplicate.targets[0].route, roomId: 'foreign-room' } }, { ...duplicate.continuations[0], token: 'foreign-room' }), 'cross-room')
const inconsistentRoute = openRouteCommand(1)
assert.equal(inconsistentRoute.declare({ ...inconsistentRoute.targets[0], route: { ...inconsistentRoute.targets[0].route, roomId: 'wrong-room' } }, inconsistentRoute.continuations[0]), 'route-denied', 'the declared route Room id must equal the target Room id')
console.log('agent admission v1-v6 and shell v8-v9 conformance passed')
