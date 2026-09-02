import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Ajv2020 from 'ajv/dist/2020.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const names = [
  'session-common.v1.schema.json',
  'session-snapshot.v1.schema.json',
  'session-read-request.v1.schema.json',
  'session-event.v1.schema.json',
  'session-event-page.v1.schema.json',
  'session-subscribe-request.v1.schema.json',
  'session-subscription-page.v1.schema.json',
  'session-subscription-close.v1.schema.json',
]
const schemas = new Map()
const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true })
for (const name of names) {
  const schema = JSON.parse(await readFile(path.join(root, 'schemas', name), 'utf8'))
  schemas.set(name, schema)
  ajv.addSchema(schema)
}
const validator = name => {
  const value = ajv.getSchema(schemas.get(name).$id)
  assert.ok(value, `${name} was not registered`)
  return value
}
const validateEventSchema = validator('session-event.v1.schema.json')
const validateSnapshotSchema = validator('session-snapshot.v1.schema.json')
const validateReadRequestSchema = validator('session-read-request.v1.schema.json')
const validatePageSchema = validator('session-event-page.v1.schema.json')
const validateSubscriptionPageSchema = validator('session-subscription-page.v1.schema.json')
const validateSubscriptionCloseSchema = validator('session-subscription-close.v1.schema.json')
const schema = name => schemas.get(name).$id

function event(seq, type, data, extra = {}) {
  return {
    $schema: schema('session-event.v1.schema.json'),
    contract: 'cordisx.session-event/v1',
    schemaVersion: 1,
    sessionId: 'session-1',
    seq,
    time: 1000 + seq,
    type,
    data,
    ...extra,
  }
}

const pluginSource = {
  kind: 'plugin',
  pluginId: 'chatroom',
  generation: 3,
  form: 'relay',
  correlation: { namespace: 'chatroom/self-introduction', id: 'run-1' },
}
const userMessage = { id: 'message-1', role: 'user', content: [{ type: 'text', text: 'Introduce yourself.' }], source: pluginSource }
const assistantMessage = { id: 'message-2', role: 'assistant', content: [{ type: 'text', text: 'Hello.' }], source: { kind: 'model', provider: 'codex', model: 'gpt-5' } }
const toolResultMessage = { id: 'message-3', role: 'user', content: [{ type: 'tool-result', toolCallId: 'call-1', content: [{ type: 'text', text: 'ok' }] }], source: { kind: 'tool', callId: 'call-1' } }

const completeLog = [
  event(0, 'session/end-seed', {}),
  event(1, 'agent/inbox/spliced', { target: 'next-turn', start: 0, inserted: [userMessage] }),
  event(2, 'turn/start', { turn: 1 }),
  event(3, 'agent/inbox/spliced', { target: 'next-turn', start: 0, removedCount: 1, inserted: [] }),
  event(4, 'step/start', { turn: 1, step: 1 }),
  event(5, 'user/message', userMessage, { surfaceOp: 'append', sourceEventSeqs: [1] }),
  event(6, 'request/context', { provider: 'codex', model: 'gpt-5', contextWindow: 200000 }),
  event(7, 'request/header', { header: { config: { provider: 'codex', model: 'gpt-5' } }, reason: 'initial' }),
  event(8, 'approval/asked', { id: 'approval-1', toolName: 'shell', callId: 'call-1', reason: 'writes files' }),
  event(9, 'approval/decided', { id: 'approval-1', outcome: 'allowed-once' }),
  event(10, 'assistant/chunk', { turn: 1, step: 1, chunk: { type: 'text-delta', index: 0, text: 'Hello.' } }),
  event(11, 'assistant/message', { turn: 1, step: 1, message: assistantMessage, usage: { inputTokens: 10, outputTokens: 2 } }, { surfaceOp: 'append', sourceEventSeqs: [10] }),
  event(12, 'tool/call', { turn: 1, step: 1, callId: 'call-1', name: 'shell', arguments: '{}' }),
  event(13, 'tool/result', { turn: 1, step: 1, message: toolResultMessage }, { surfaceOp: 'append', sourceEventSeqs: [12] }),
  event(14, 'step/end', { turn: 1, step: 1 }),
  event(15, 'turn/end', { turn: 1, reason: { kind: 'completed' } }),
  event(16, 'extension/context-compacted', { code: 'context-compacted' }, { ignorable: true }),
]

function schemaErrors(validate, value) {
  return validate(value) ? [] : (validate.errors ?? []).map(item => `${item.instancePath || '/'} ${item.message}`)
}

export function validateSessionLog(events) {
  const errors = []
  let openTurn
  let openStep
  const approval = new Map()
  const admitted = new Set()
  for (let index = 0; index < events.length; index += 1) {
    const current = events[index]
    errors.push(...schemaErrors(validateEventSchema, current).map(message => `event[${index}] ${message}`))
    if (current.seq !== index) errors.push(`event[${index}] seq is not contiguous`)
    for (const sourceSeq of current.sourceEventSeqs ?? []) {
      if (sourceSeq >= current.seq) errors.push(`event[${index}] sourceEventSeqs must cite earlier events`)
    }
    if (current.type === 'turn/start') {
      if (openTurn !== undefined) errors.push(`event[${index}] nested turn`)
      openTurn = current.data.turn
    } else if (current.type === 'turn/end') {
      if (openTurn !== current.data.turn) errors.push(`event[${index}] closes a different turn`)
      if (openStep !== undefined) errors.push(`event[${index}] closes turn with an open step`)
      for (const [id, state] of approval) if (state === 'asked') errors.push(`approval ${id} lacks a decision before turn end`)
      openTurn = undefined
    } else if (current.type === 'step/start') {
      if (openTurn !== current.data.turn || openStep !== undefined) errors.push(`event[${index}] invalid step start`)
      openStep = current.data.step
    } else if (current.type === 'step/end') {
      if (openTurn !== current.data.turn || openStep !== current.data.step) errors.push(`event[${index}] invalid step end`)
      openStep = undefined
    } else if (current.type === 'approval/asked') {
      if (openTurn === undefined) errors.push(`event[${index}] approval asked outside a turn`)
      if (approval.has(current.data.id)) errors.push(`approval ${current.data.id} asked more than once`)
      approval.set(current.data.id, 'asked')
    } else if (current.type === 'approval/decided') {
      if (approval.get(current.data.id) !== 'asked') errors.push(`approval ${current.data.id} decided without one open ask`)
      approval.set(current.data.id, 'decided')
    } else if (current.type === 'agent/inbox/spliced') {
      for (const message of current.data.inserted) {
        if (admitted.has(message.id)) errors.push(`message ${message.id} admitted more than once`)
        admitted.add(message.id)
      }
      if (current.data.outcome === 'canceled' && (current.data.removedCount ?? 0) < 1) errors.push(`event[${index}] canceled splice removed nothing`)
    }
  }
  if (openStep !== undefined) errors.push('log ends with an open step')
  if (openTurn !== undefined) errors.push('log ends with an open turn')
  return errors
}

export function readerDisposition(events, knownTypes) {
  const unknownRequired = events.find(value => !knownTypes.has(value.type) && value.ignorable !== true)
  return unknownRequired === undefined
    ? { status: 'available' }
    : { status: 'unavailable', code: 'unknown-required-event', seq: unknownRequired.seq }
}

export function validateSessionPage(page) {
  const errors = schemaErrors(validatePageSchema, page)
  if (errors.length > 0) return errors
  let expected = page.afterSeq + 1
  for (const value of page.events) {
    if (value.sessionId !== page.sessionId) errors.push('page contains a different session')
    if (value.seq !== expected) errors.push('page events are not contiguous from afterSeq')
    if (value.seq > page.snapshotSeq) errors.push('page crossed its fixed snapshotSeq')
    expected += 1
  }
  const expectedNext = page.events.length === 0 ? page.afterSeq : page.events.at(-1).seq
  if (page.nextAfterSeq !== expectedNext) errors.push('nextAfterSeq does not equal the last emitted seq')
  if (page.hasMore !== (page.nextAfterSeq < page.snapshotSeq)) errors.push('hasMore does not match snapshot tail')
  return errors
}

export function validateSubscription(pages, afterSeq = -1) {
  const errors = []
  let expected = afterSeq + 1
  let live = false
  let identity
  for (const [index, page] of pages.entries()) {
    errors.push(...schemaErrors(validateSubscriptionPageSchema, page).map(message => `page[${index}] ${message}`))
    const currentIdentity = `${page.sessionId}\u0000${page.sessionGeneration}\u0000${page.subscriptionGeneration}\u0000${page.replayThrough}`
    if (identity === undefined) identity = currentIdentity
    else if (identity !== currentIdentity) errors.push(`page[${index}] changed subscription identity or replay boundary`)
    if (page.phase === 'live') live = true
    else if (live) errors.push(`page[${index}] replay followed live`)
    for (const value of page.events) {
      if (value.seq !== expected) errors.push(`page[${index}] event seq ${value.seq} is not ${expected}`)
      if (value.sessionId !== page.sessionId) errors.push(`page[${index}] contains another session`)
      if (page.phase === 'replay' && value.seq > page.replayThrough) errors.push(`page[${index}] replay crossed replayThrough`)
      if (page.phase === 'live' && value.seq <= page.replayThrough) errors.push(`page[${index}] live duplicated replay`)
      expected += 1
    }
  }
  return errors
}

export function validateSubscriptionLifecycle(deliveries) {
  const errors = []
  let closed = false
  for (const [index, delivery] of deliveries.entries()) {
    if (delivery.kind === 'close') {
      if (closed) errors.push(`delivery[${index}] attempted a second terminal close`)
      closed = true
    } else if (closed) {
      errors.push(`delivery[${index}] began after the subscription closed`)
    }
  }
  return errors
}

assert.deepEqual(validateSessionLog(completeLog), [])
assert.deepEqual(structuredClone(completeLog), completeLog)

const page = {
  $schema: schema('session-event-page.v1.schema.json'),
  contract: 'cordisx.session-event-page/v1',
  schemaVersion: 1,
  sessionId: 'session-1',
  sessionGeneration: 1,
  afterSeq: -1,
  snapshotSeq: 16,
  events: completeLog,
  nextAfterSeq: 16,
  hasMore: false,
}
assert.deepEqual(validateSessionPage(page), [])
const snapshot = {
  $schema: schema('session-snapshot.v1.schema.json'),
  contract: 'cordisx.session-snapshot/v1',
  schemaVersion: 1,
  sessionId: 'session-1',
  sessionGeneration: 1,
  header: { id: 'session-1', formatVersion: 1, createdAt: 1000, isSeeded: false },
  snapshotSeq: 16,
}
assert.deepEqual(schemaErrors(validateSnapshotSchema, snapshot), [])
assert.deepEqual(schemaErrors(validateReadRequestSchema, { afterSeq: 7, limit: 8, snapshotSeq: snapshot.snapshotSeq }), [])
assert.ok(schemaErrors(validateReadRequestSchema, { snapshotSeq: 17, principal: 'trace' }).length > 0)
assert.equal(page.snapshotSeq, snapshot.snapshotSeq)

const subscriptionPage = (phase, events) => ({
  $schema: schema('session-subscription-page.v1.schema.json'),
  contract: 'cordisx.session-subscription-page/v1',
  schemaVersion: 1,
  sessionId: 'session-1',
  sessionGeneration: 1,
  subscriptionGeneration: 1,
  replayThrough: 15,
  phase,
  events,
})
const subscriptionClose = code => ({
  $schema: schema('session-subscription-close.v1.schema.json'),
  contract: 'cordisx.session-subscription-close/v1',
  schemaVersion: 1,
  sessionId: 'session-1',
  sessionGeneration: 1,
  subscriptionGeneration: 1,
  status: 'closed',
  code,
})
assert.deepEqual(validateSubscription([subscriptionPage('replay', completeLog.slice(0, 16)), subscriptionPage('live', [completeLog[16]])]), [])
assert.ok(validateSubscription([subscriptionPage('live', [completeLog[16]]), subscriptionPage('replay', [completeLog[0]])]).length > 0)
assert.ok(validateSubscription([subscriptionPage('replay', completeLog.slice(0, 15)), subscriptionPage('live', [completeLog[16]])]).some(error => error.includes('not 15')))
for (const code of ['unsubscribed', 'session-replaced', 'route-replaced', 'plugin-generation-replaced', 'connection-replaced', 'permission-revoked', 'host-unavailable', 'unknown-required-event', 'observer-failed']) {
  assert.deepEqual(schemaErrors(validateSubscriptionCloseSchema, subscriptionClose(code)), [])
}
assert.ok(schemaErrors(validateSubscriptionCloseSchema, subscriptionClose('silent')).length > 0)
assert.deepEqual(validateSubscriptionLifecycle([
  { kind: 'page', value: subscriptionPage('replay', completeLog.slice(0, 16)) },
  { kind: 'close', value: subscriptionClose('unsubscribed') },
]), [])
assert.ok(validateSubscriptionLifecycle([
  { kind: 'close', value: subscriptionClose('permission-revoked') },
  { kind: 'page', value: subscriptionPage('live', [completeLog[16]]) },
]).some(error => error.includes('after the subscription closed')))
assert.ok(validateSubscriptionLifecycle([
  { kind: 'close', value: subscriptionClose('connection-replaced') },
  { kind: 'close', value: subscriptionClose('unsubscribed') },
]).some(error => error.includes('second terminal close')))

const unknownRequired = event(0, 'vendor/required', { value: 1 })
assert.deepEqual(readerDisposition([unknownRequired], new Set()), { status: 'unavailable', code: 'unknown-required-event', seq: 0 })
assert.deepEqual(readerDisposition([{ ...unknownRequired, ignorable: true }], new Set()), { status: 'available' })

const fabricated = { ...completeLog[15], provenance: 'inferred' }
assert.ok(schemaErrors(validateEventSchema, fabricated).length > 0)
const badSurface = { ...completeLog[2], sourceEventSeqs: [1] }
assert.ok(schemaErrors(validateEventSchema, badSurface).length > 0)
const futureSource = { ...completeLog[11], sourceEventSeqs: [12] }
assert.ok(validateSessionLog(completeLog.map((value, index) => index === 11 ? futureSource : value)).some(error => error.includes('earlier')))

console.log('CordisX Sessions v1 conformance passed')
