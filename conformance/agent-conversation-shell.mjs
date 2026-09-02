import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { isDeepStrictEqual } from 'node:util'
import { fileURLToPath } from 'node:url'
import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const names = [
  'ui-common.v1.schema.json',
  'agent-avatar.v1.schema.json',
  'session-common.v1.schema.json',
  'agents-common.v1.schema.json',
  'agent-conversation-shell-common.v1.schema.json',
  'agent-conversation-shell-binding.v1.schema.json',
  'agent-conversation-shell-snapshot.v1.schema.json',
  'agent-conversation-shell-subscription.v1.schema.json',
  'agent-conversation-shell-page.v1.schema.json',
  'agent-conversation-shell-result.v1.schema.json',
  'agent-conversation-shell-command-context.v1.schema.json',
  'agent-conversation-shell-common.v2.schema.json',
  'agent-conversation-shell-binding.v2.schema.json',
  'agent-conversation-shell-snapshot.v2.schema.json',
  'agent-conversation-shell-subscription.v2.schema.json',
  'agent-conversation-shell-page.v2.schema.json',
  'agent-conversation-shell-result.v2.schema.json',
  'agent-conversation-shell-command-context.v2.schema.json',
]
const schemas = new Map(await Promise.all(names.map(async name => [name, JSON.parse(await readFile(path.join(root, 'schemas', name), 'utf8'))])))
const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true })
addFormats(ajv)
for (const schema of schemas.values()) ajv.addSchema(schema)
const validator = name => ajv.getSchema(schemas.get(name).$id)
const v = Object.fromEntries(names.map(name => [name, validator(name)]))
const snapshotSchemaId = schemas.get('agent-conversation-shell-snapshot.v2.schema.json').$id
const validateItem = ajv.getSchema(`${snapshotSchemaId}#/$defs/item`)

const text = fallback => ({ key: 'chatroom.label', fallback })
const command = id => ({ id })
const action = id => ({ id, label: text(id), icon: 'host:more', command: command(`chatroom:${id}`), disabled: { value: false } })
const participant = { participantId: 'participant-1', role: 'agent', displayName: text('Ada'), avatar: { kind: 'asset', ref: 'asset:participant-1', revision: 'revision:avatar-1' }, agentIdentity: { agentId: 'reviewer', revision: 'definition-4' } }
const identitylessAgent = { participantId: 'participant-2', role: 'agent', displayName: text('Unbound Agent') }
const humanParticipant = { participantId: 'participant-3', role: 'human', displayName: text('Human') }
const otherAgent = { participantId: 'participant-4', role: 'agent', displayName: text('Other Agent'), agentIdentity: { agentId: 'writer', revision: 'definition-2' } }
const activeRunA = { participantId: participant.participantId, memberId: 'member-1', sessionId: 'session-1', lifecycle: { phase: 'running', updatedAt: '2026-08-31T01:00:00.000Z' }, details: { kind: 'host', ref: 'task-1' } }
const activeRunB = { participantId: participant.participantId, memberId: 'member-1', sessionId: 'session-2', lifecycle: { phase: 'waiting' }, details: { kind: 'host', ref: 'task-2' } }
const pendingEmoji = { reactionId: 'reaction-emoji', actorParticipantId: humanParticipant.participantId, value: { kind: 'emoji', emoji: '👍🏽' }, state: 'pending' }
const pendingSemantic = { reactionId: 'reaction-semantic', actorParticipantId: participant.participantId, value: { kind: 'semantic', token: 'acknowledged' }, state: 'pending' }
const message = { kind: 'message', itemId: 'item-0', messageId: 'message-0', sequence: 0, source: 'session-event', author: participant, body: [{ kind: 'text', text: text('Hello') }], reactions: [pendingEmoji, pendingSemantic], timestamp: '2026-08-29T00:00:00.000Z', deliveryState: 'delivered', runState: 'idle', ariaLive: 'polite', actions: [action('more')] }
const acknowledgement = { kind: 'message', itemId: 'item-1', messageId: 'message-1', sequence: 1, source: 'chatroom-acknowledgement', author: humanParticipant, body: [{ kind: 'text', text: text('Sent') }], reactions: [], timestamp: '2026-08-29T00:00:01.000Z', deliveryState: 'delivered', runState: 'idle', ariaLive: 'polite', actions: [] }
const presenceSuccess = { kind: 'member-presence', itemId: 'item-2', sequence: 2, participantId: participant.participantId, memberId: 'member-1', sessionId: 'session-1', state: 'inviting', retryable: false }
const presenceRetry = { kind: 'member-presence', itemId: 'item-3', sequence: 3, participantId: participant.participantId, memberId: 'member-1', sessionId: 'session-2', state: 'inviting', retryable: false }
const binding = { $schema: schemas.get('agent-conversation-shell-binding.v2.schema.json').$id, contract: 'cordisx.agent-conversation-shell-binding/v2', schemaVersion: 2, bindingId: 'binding-1', shell: 'agent-desktop', ownerGeneration: 'generation-1', routeSelection: { scope: 'room-or-new', selectedRoomParam: 'roomId' } }
const snapshot = { $schema: snapshotSchemaId, contract: 'cordisx.agent-conversation-shell-snapshot/v2', schemaVersion: 2, binding: { bindingId: 'binding-1', ownerGeneration: 'generation-1' }, generation: 'generation-1', snapshotSequence: 0, selection: { kind: 'room', roomId: 'room-1', title: text('Room'), secondary: text('Two'), multiParticipant: true, participantPresentation: 'host-initials', participants: [participant, identitylessAgent, humanParticipant, otherAgent], activeRuns: [activeRunA, activeRunB] }, items: [message, acknowledgement, presenceSuccess, presenceRetry], composer: { availability: 'available', placeholder: text('Message'), disabled: { value: false }, submit: command('chatroom:submit') }, headerActions: [action('new-room'), action('manage-agents'), action('more')] }
const subscription = { $schema: schemas.get('agent-conversation-shell-subscription.v2.schema.json').$id, contract: 'cordisx.agent-conversation-shell-subscription/v2', schemaVersion: 2, subscriptionId: 'subscription-1', binding: snapshot.binding, generation: 'generation-1', afterSequence: -1, snapshotSequence: 0 }
const result = { $schema: schemas.get('agent-conversation-shell-result.v2.schema.json').$id, contract: 'cordisx.agent-conversation-shell-result/v2', schemaVersion: 2, requestId: 'request-1', type: 'subscribe', status: 'accepted', code: 'allowed', subscription }
const context = { $schema: schemas.get('agent-conversation-shell-command-context.v2.schema.json').$id, contract: 'cordisx.agent-conversation-shell-command-context/v2', schemaVersion: 2, binding: snapshot.binding, generation: 'generation-1', scope: 'composer-submit', command: command('chatroom:submit'), submitPayload: 'hello' }

function reactionValueErrors(value) {
  const errors = []
  if (value?.kind === 'semantic') {
    if (typeof value.token !== 'string' || !/^[a-z][a-z0-9.-]{0,31}$/.test(value.token)) errors.push('reaction semantic token is not canonical')
    return errors
  }
  if (value?.kind !== 'emoji' || typeof value.emoji !== 'string') return ['reaction value kind is invalid']
  const emoji = value.emoji
  if (emoji !== emoji.trim()) errors.push('reaction emoji has edge whitespace')
  if (emoji !== emoji.normalize('NFC')) errors.push('reaction emoji is not NFC')
  const scalars = [...emoji]
  if (scalars.length < 1 || scalars.length > 32) errors.push('reaction emoji scalar length is out of bounds')
  const keycaps = emoji.match(/[#*0-9]\uFE0F?\u20E3/gu) ?? []
  const remainder = emoji.replace(/[#*0-9]\uFE0F?\u20E3/gu, '')
  if (/[#*0-9\u20E3]/u.test(remainder)) errors.push('reaction emoji contains an incomplete keycap')
  const allowedScalar = /^(?:\p{Extended_Pictographic}|\p{Emoji_Component}|\p{Regional_Indicator}|\u200D|\uFE0F)$/u
  for (const scalar of [...remainder]) if (!allowedScalar.test(scalar)) errors.push('reaction emoji contains a non-emoji scalar')
  if (!/\p{Extended_Pictographic}|\p{Regional_Indicator}/u.test(remainder) && keycaps.length === 0) errors.push('reaction emoji has no complete emoji base')
  return errors
}

function selectionAndItemErrors(current) {
  const errors = []
  if (current.selection.kind !== 'room') return errors
  const participants = new Map()
  const activeRunTriples = new Set()
  const memberParticipants = new Map()
  for (const member of current.selection.participants) {
    if (participants.has(member.participantId)) errors.push('participant identity is duplicated')
    participants.set(member.participantId, member)
  }
  for (const run of current.selection.activeRuns ?? []) {
    const member = participants.get(run.participantId)
    if (member === undefined) errors.push('active run participant is not selected')
    else if (member.role !== 'agent' || member.agentIdentity === undefined) errors.push('active run participant lacks exact Agent Definition identity')
    const priorParticipantId = memberParticipants.get(run.memberId)
    if (priorParticipantId !== undefined && priorParticipantId !== run.participantId) errors.push('memberId changed participantId')
    memberParticipants.set(run.memberId, run.participantId)
    const triple = `${run.participantId}\u0000${run.memberId}\u0000${run.sessionId}`
    if (activeRunTriples.has(triple)) errors.push('active run participantId/memberId/sessionId triple is duplicated')
    activeRunTriples.add(triple)
  }
  const itemIds = new Set()
  const messageIds = new Set()
  const presenceKeys = new Set()
  for (let index = 0; index < current.items.length; index += 1) {
    const item = current.items[index]
    if (itemIds.has(item.itemId)) errors.push('timeline item identity is duplicated')
    itemIds.add(item.itemId)
    if (item.sequence !== index) errors.push('timeline item position drift')
    if (item.kind === 'message') {
      if (messageIds.has(item.messageId)) errors.push('message identity is duplicated')
      messageIds.add(item.messageId)
      const author = participants.get(item.author.participantId)
      if (author === undefined) errors.push('message author is not a selected participant')
      else if (!isDeepStrictEqual(item.author, author)) errors.push('message author overrides member-owned participant identity')
      const reactionIds = new Set()
      const reactionActorValues = new Set()
      for (const reaction of item.reactions) {
        if (reactionIds.has(reaction.reactionId)) errors.push('reaction identity is duplicated')
        reactionIds.add(reaction.reactionId)
        if (!participants.has(reaction.actorParticipantId)) errors.push('reaction actor is not a current participant')
        errors.push(...reactionValueErrors(reaction.value))
        const actorValue = `${reaction.actorParticipantId}\u0000${JSON.stringify(reaction.value)}`
        if (reactionActorValues.has(actorValue)) errors.push('reaction actor/value pair is duplicated')
        reactionActorValues.add(actorValue)
      }
    } else if (item.kind === 'member-presence') {
      const member = participants.get(item.participantId)
      if (member === undefined) errors.push('presence participant is not current')
      else if (member.role !== 'agent' || member.agentIdentity === undefined) errors.push('presence participant lacks exact Agent Definition identity')
      const priorParticipantId = memberParticipants.get(item.memberId)
      if (priorParticipantId !== undefined && priorParticipantId !== item.participantId) errors.push('memberId changed participantId')
      memberParticipants.set(item.memberId, item.participantId)
      const key = `${item.participantId}\u0000${item.memberId}\u0000${item.sessionId}`
      if (presenceKeys.has(key)) errors.push('presence relation is duplicated')
      presenceKeys.add(key)
      if (['joined', 'ready'].includes(item.state) && !activeRunTriples.has(key)) errors.push('joined or ready presence lacks an exact active run projection')
    }
  }
  return errors
}

function snapshotErrors(value) {
  const errors = []
  if (!v['agent-conversation-shell-snapshot.v2.schema.json'](value)) errors.push(ajv.errorsText(v['agent-conversation-shell-snapshot.v2.schema.json'].errors))
  else errors.push(...selectionAndItemErrors(value))
  return errors
}

const presenceTransitions = {
  inviting: new Set(['inviting', 'creating', 'failed']),
  creating: new Set(['creating', 'joined', 'failed']),
  joined: new Set(['joined', 'ready', 'failed']),
  ready: new Set(['ready']),
  failed: new Set(['failed', 'inviting', 'creating']),
}

function reactionTransitionErrors(previous, next, participants) {
  const errors = []
  const previousById = new Map(previous.map(value => [value.reactionId, value]))
  const nextById = new Map()
  const actorValues = new Set()
  for (let index = 0; index < next.length; index += 1) {
    const reaction = next[index]
    if (nextById.has(reaction.reactionId)) errors.push('reaction identity is duplicated')
    nextById.set(reaction.reactionId, reaction)
    if (!participants.has(reaction.actorParticipantId)) errors.push('reaction actor is not a current participant')
    errors.push(...reactionValueErrors(reaction.value))
    const actorValue = `${reaction.actorParticipantId}\u0000${JSON.stringify(reaction.value)}`
    if (actorValues.has(actorValue)) errors.push('reaction actor/value pair is duplicated')
    actorValues.add(actorValue)
    const old = previousById.get(reaction.reactionId)
    if (old === undefined) {
      if (reaction.state !== 'pending') errors.push('unknown reaction enters a terminal state')
      if (index < previous.length) errors.push('new reaction is not appended at the tail')
      continue
    }
    if (previous[index]?.reactionId !== reaction.reactionId) errors.push('reaction moved from its stable array position')
    if (old.actorParticipantId !== reaction.actorParticipantId || !isDeepStrictEqual(old.value, reaction.value)) errors.push('reaction actor or value drift')
    if (old.state !== 'pending' && reaction.state !== old.state) errors.push('terminal reaction regressed or changed outcome')
    if (old.state === 'pending' && !['pending', 'completed', 'failed'].includes(reaction.state)) errors.push('reaction transition is invalid')
  }
  for (const reaction of previous) if (!nextById.has(reaction.reactionId)) errors.push('reaction disappeared from message')
  return errors
}

function itemTransitionErrors(previous, next, participants) {
  const errors = []
  if (!validateItem(next)) errors.push(ajv.errorsText(validateItem.errors))
  if (previous.itemId !== next.itemId) errors.push('item-updated changed itemId')
  if (previous.kind !== next.kind) errors.push('item-updated changed item kind')
  if (previous.sequence !== next.sequence) errors.push('item-updated moved timeline position')
  if (errors.length > 0) return errors
  if (previous.kind === 'message') {
    if (previous.messageId !== next.messageId) errors.push('messageId drift')
    if (!isDeepStrictEqual(previous.author, next.author)) errors.push('message author drift')
    if (previous.source !== next.source) errors.push('message source drift')
    errors.push(...reactionTransitionErrors(previous.reactions, next.reactions, participants))
  } else if (previous.kind === 'member-presence') {
    if (previous.participantId !== next.participantId || previous.memberId !== next.memberId || previous.sessionId !== next.sessionId) errors.push('presence relation drift')
    if (!presenceTransitions[previous.state]?.has(next.state)) errors.push('presence transition is invalid')
    if (previous.state === 'failed' && !previous.retryable && next.state !== 'failed') errors.push('non-retryable failure is terminal')
    if (previous.state === next.state && !isDeepStrictEqual(previous, next)) errors.push('same-state presence update is not idempotent')
  }
  return errors
}

function applyItemUpdate(current, update) {
  const next = structuredClone(current)
  const participants = next.selection.kind === 'room' ? new Map(next.selection.participants.map(value => [value.participantId, value])) : new Map()
  if (update.kind === 'item-appended') {
    if (next.items.some(item => item.itemId === update.item.itemId)) return { snapshot: next, errors: ['item-appended reused itemId'] }
    if (update.item.kind === 'message' && next.items.some(item => item.kind === 'message' && item.messageId === update.item.messageId)) return { snapshot: next, errors: ['item-appended reused messageId'] }
    if (update.item.sequence !== next.items.length) return { snapshot: next, errors: ['item-appended does not append at timeline tail'] }
    if (!validateItem(update.item)) return { snapshot: next, errors: [ajv.errorsText(validateItem.errors)] }
    next.items.push(structuredClone(update.item))
  } else if (update.kind === 'item-updated') {
    const index = next.items.findIndex(item => item.itemId === update.item.itemId)
    if (index === -1) return { snapshot: next, errors: ['item-updated references unknown or stale item'] }
    const errors = itemTransitionErrors(next.items[index], update.item, participants)
    if (errors.length > 0) return { snapshot: next, errors }
    next.items[index] = structuredClone(update.item)
  } else return { snapshot: next, errors: ['not an incremental item update'] }
  next.snapshotSequence = update.sequence
  return { snapshot: next, errors: snapshotErrors(next) }
}

function itemWith(current, itemId, transform) {
  const item = structuredClone(current.items.find(value => value.itemId === itemId))
  transform(item)
  return item
}

assert.deepEqual(snapshotErrors(snapshot), [])
for (const [name, value] of [
  ['agent-conversation-shell-binding.v2.schema.json', binding],
  ['agent-conversation-shell-subscription.v2.schema.json', subscription],
  ['agent-conversation-shell-result.v2.schema.json', result],
  ['agent-conversation-shell-command-context.v2.schema.json', context],
]) assert.ok(v[name](value), ajv.errorsText(v[name].errors))

const v1Participant = { participantId: 'participant-v1', role: 'agent', displayName: text('V1 Agent') }
const v1Message = { kind: 'message', itemId: 'item-v1', messageId: 'message-v1', sequence: 0, author: v1Participant, body: [{ kind: 'text', text: text('V1 message') }], timestamp: '2026-08-31T00:00:00.000Z', deliveryState: 'delivered', runState: 'idle', ariaLive: 'polite', actions: [] }
const v1Snapshot = {
  $schema: schemas.get('agent-conversation-shell-snapshot.v1.schema.json').$id,
  contract: 'cordisx.agent-conversation-shell-snapshot/v1',
  schemaVersion: 1,
  binding: { bindingId: 'binding-v1', ownerGeneration: 'generation-v1' },
  generation: 'generation-v1',
  snapshotSequence: 0,
  selection: { kind: 'room', roomId: 'room-v1', title: text('V1 Room'), multiParticipant: false, participantPresentation: 'none', participants: [v1Participant] },
  items: [v1Message],
  composer: { availability: 'available', placeholder: text('Message'), disabled: { value: false }, submit: command('chatroom:submit') },
  headerActions: [],
}
const validateV1Snapshot = v['agent-conversation-shell-snapshot.v1.schema.json']
assert.ok(validateV1Snapshot(v1Snapshot), ajv.errorsText(validateV1Snapshot.errors))
for (const mutate of [
  value => { value.selection.participants[0].agentIdentity = { agentId: 'v2-only', revision: 'definition-1' } },
  value => { value.selection.activeRuns = [] },
  value => { value.items[0].source = 'session-event' },
  value => { value.items[0].reactions = [] },
]) {
  const incompatible = structuredClone(v1Snapshot)
  mutate(incompatible)
  assert.equal(validateV1Snapshot(incompatible), false, 'Shell v1 wire contract must remain frozen')
}

for (const mutate of [
  value => { value.selection.multiParticipant = false },
  value => { value.selection.participants[2].agentIdentity = { agentId: 'human', revision: 'definition-1' } },
  value => { value.selection.activeRuns[0].binding = { bindingId: 'binding-private', generation: 1 } },
  value => { value.selection.activeRuns[0].task = 'task-private' },
  value => { value.items[0].source = 'connector' },
  value => { delete value.items[0].source },
  value => { delete value.items[0].reactions },
  value => { value.items[0].reactions[0].html = '<b>x</b>' },
  value => { value.items[0].reactions[0].dom = 'node' },
  value => { value.items[0].reactions[0].callback = 'run' },
  value => { value.items[2].retry = { id: 'chatroom:retry-member' } },
  value => { value.items[2].body = { raw: true } },
  value => { value.items[2].trace = 'trace-private' },
]) {
  const bad = structuredClone(snapshot)
  mutate(bad)
  assert.notDeepEqual(snapshotErrors(bad), [], 'closed Shell schema mutant must fail')
}

const rawDetail = structuredClone(snapshot)
rawDetail.selection.activeRuns[1].details.url = 'https://example.test/tasks/task-2'
assert.notDeepEqual(snapshotErrors(rawDetail), [], 'Shell v2 must reject raw detail URLs')

for (const value of [
  { kind: 'emoji', emoji: '👨‍👩‍👧‍👦' },
  { kind: 'emoji', emoji: '🇨🇳' },
  { kind: 'emoji', emoji: '1️⃣' },
  { kind: 'semantic', token: 'acknowledged' },
]) assert.deepEqual(reactionValueErrors(value), [])
for (const value of [
  { kind: 'emoji', emoji: '😀<script>' },
  { kind: 'emoji', emoji: ' 😀' },
  { kind: 'emoji', emoji: '😀\n' },
  { kind: 'emoji', emoji: 'e\u0301' },
  { kind: 'emoji', emoji: '🏽' },
  { kind: 'emoji', emoji: '😀'.repeat(33) },
  { kind: 'semantic', token: 'Ack' },
  { kind: 'semantic', token: '<script>' },
  { kind: 'semantic', token: `a${'b'.repeat(32)}` },
]) assert.notDeepEqual(reactionValueErrors(value), [], 'invalid reaction value must fail closed')

let incremental = structuredClone(snapshot)
let streamSequence = 0
const incrementalUpdates = []
function pushUpdate(item) {
  streamSequence += 1
  const update = { kind: 'item-updated', sequence: streamSequence, item }
  const applied = applyItemUpdate(incremental, update)
  assert.deepEqual(applied.errors, [])
  incremental = applied.snapshot
  incrementalUpdates.push(update)
}

pushUpdate(itemWith(incremental, presenceSuccess.itemId, () => {}))
pushUpdate(itemWith(incremental, presenceSuccess.itemId, item => { item.state = 'creating' }))
pushUpdate(itemWith(incremental, presenceSuccess.itemId, item => { item.state = 'joined' }))
pushUpdate(itemWith(incremental, presenceSuccess.itemId, item => { item.state = 'ready' }))
pushUpdate(itemWith(incremental, presenceRetry.itemId, item => { item.state = 'failed'; item.retryable = true; item.diagnostic = text('Agent failed to join'); item.retry = { id: 'chatroom:retry-member', arguments: { memberId: item.memberId, sessionId: item.sessionId } } }))
pushUpdate(itemWith(incremental, presenceRetry.itemId, item => { item.state = 'creating'; item.retryable = false; delete item.diagnostic; delete item.retry }))
pushUpdate(itemWith(incremental, presenceRetry.itemId, item => { item.state = 'joined' }))
pushUpdate(itemWith(incremental, presenceRetry.itemId, item => { item.state = 'ready' }))
pushUpdate(itemWith(incremental, message.itemId, item => { item.reactions[0].state = 'completed'; item.reactions[1].state = 'failed' }))

const convergedSnapshot = structuredClone(incremental)
streamSequence += 1
convergedSnapshot.snapshotSequence = streamSequence
const normalizeWatermark = value => ({ ...value, snapshotSequence: 0 })
assert.deepEqual(normalizeWatermark(incremental), normalizeWatermark(convergedSnapshot), 'incremental and replacement snapshots must converge')
const replayPage = { $schema: schemas.get('agent-conversation-shell-page.v2.schema.json').$id, contract: 'cordisx.agent-conversation-shell-page/v2', schemaVersion: 2, subscription, afterSequence: -1, phase: 'replay', updates: [{ kind: 'snapshot-replaced', sequence: 0, snapshot }], nextAfterSequence: 0, hasMore: true }
const livePage = { ...replayPage, afterSequence: 0, phase: 'live', updates: [...incrementalUpdates, { kind: 'snapshot-replaced', sequence: streamSequence, snapshot: convergedSnapshot }], nextAfterSequence: streamSequence, hasMore: false }
assert.ok(v['agent-conversation-shell-page.v2.schema.json'](replayPage), ajv.errorsText(v['agent-conversation-shell-page.v2.schema.json'].errors))
assert.ok(v['agent-conversation-shell-page.v2.schema.json'](livePage), ajv.errorsText(v['agent-conversation-shell-page.v2.schema.json'].errors))

function traceErrors(trace) {
  const errors = []
  if (!v['agent-conversation-shell-result.v2.schema.json'](trace.result)) errors.push(ajv.errorsText(v['agent-conversation-shell-result.v2.schema.json'].errors))
  else if (!isDeepStrictEqual(trace.result.subscription, trace.subscription)) errors.push('accepted result subscription identity drift')
  if (!v['agent-conversation-shell-command-context.v2.schema.json'](trace.context)) errors.push(ajv.errorsText(v['agent-conversation-shell-command-context.v2.schema.json'].errors))
  else if (!isDeepStrictEqual(trace.context.binding, trace.subscription.binding) || trace.context.generation !== trace.subscription.generation) errors.push('command context binding or generation drift')
  let current = structuredClone(trace.snapshot)
  errors.push(...snapshotErrors(current))
  let after = trace.subscription.afterSequence
  let disposed = false
  for (const page of trace.pages) {
    if (!v['agent-conversation-shell-page.v2.schema.json'](page)) errors.push(ajv.errorsText(v['agent-conversation-shell-page.v2.schema.json'].errors))
    if (!isDeepStrictEqual(page.subscription, trace.subscription)) errors.push('page subscription identity drift')
    if (page.afterSequence !== after) errors.push('page cursor is not serialized')
    if (after < trace.subscription.snapshotSequence && page.phase !== 'replay') errors.push('live precedes replay watermark')
    for (const update of page.updates) {
      if (disposed) errors.push('update follows terminal disposal')
      if (update.sequence !== after + 1) errors.push('update sequence is not monotonic')
      after = update.sequence
      if (update.kind === 'snapshot-replaced') {
        const replacementErrors = snapshotErrors(update.snapshot)
        errors.push(...replacementErrors)
        if (replacementErrors.length === 0 && current.snapshotSequence > trace.subscription.snapshotSequence && !isDeepStrictEqual(normalizeWatermark(current), normalizeWatermark(update.snapshot))) errors.push('snapshot replacement diverges from incremental state')
        current = structuredClone(update.snapshot)
      } else if (update.kind === 'item-appended' || update.kind === 'item-updated') {
        const applied = applyItemUpdate(current, update)
        errors.push(...applied.errors)
        current = applied.snapshot
      } else if (update.kind === 'disposed') disposed = true
    }
    if (page.nextAfterSequence !== after) errors.push('next cursor drift')
    if (disposed && page.hasMore) errors.push('terminal page cannot have more')
  }
  if (!isDeepStrictEqual(normalizeWatermark(current), normalizeWatermark(trace.expectedFinal))) errors.push('trace final snapshot drift')
  return errors
}

const trace = { snapshot, subscription, result, context, pages: [replayPage, livePage], expectedFinal: convergedSnapshot }
assert.deepEqual(traceErrors(trace), [])
assert.equal(convergedSnapshot.items.length, snapshot.items.length, 'reaction updates must not append timeline items')
assert.equal(convergedSnapshot.items[0].source, 'session-event')
assert.equal(convergedSnapshot.items[1].source, 'chatroom-acknowledgement')

const participants = new Map(snapshot.selection.participants.map(value => [value.participantId, value]))
function expectInvalidTransition(previous, next) {
  assert.notDeepEqual(itemTransitionErrors(previous, next, participants), [])
}
expectInvalidTransition(presenceSuccess, { ...presenceSuccess, state: 'joined' })
expectInvalidTransition({ ...presenceSuccess, state: 'ready' }, { ...presenceSuccess, state: 'failed', retryable: true })
expectInvalidTransition({ ...presenceSuccess, state: 'failed', retryable: false }, { ...presenceSuccess, state: 'creating' })
expectInvalidTransition(presenceSuccess, { ...presenceSuccess, diagnostic: text('drift') })
expectInvalidTransition(message, { ...message, messageId: 'other-message' })
expectInvalidTransition(message, { ...message, source: 'chatroom-acknowledgement' })
expectInvalidTransition(message, { ...message, author: humanParticipant })
expectInvalidTransition(message, { ...message, sequence: 1 })
expectInvalidTransition(message, { ...message, kind: 'status', label: text('cross-kind'), state: 'info', ariaLive: 'polite' })
expectInvalidTransition(message, { ...message, reactions: [{ ...pendingEmoji, actorParticipantId: participant.participantId }, pendingSemantic] })
expectInvalidTransition(message, { ...message, reactions: [{ ...pendingEmoji, value: { kind: 'semantic', token: 'changed' } }, pendingSemantic] })
expectInvalidTransition(message, { ...message, reactions: [pendingSemantic, pendingEmoji] })
expectInvalidTransition(message, { ...message, reactions: [...message.reactions, { ...pendingEmoji, reactionId: 'reaction-duplicate-chip' }] })
expectInvalidTransition({ ...message, reactions: [{ ...pendingEmoji, state: 'completed' }, pendingSemantic] }, message)
expectInvalidTransition({ ...message, reactions: [pendingEmoji, { ...pendingSemantic, state: 'failed' }] }, { ...message, reactions: [pendingEmoji, { ...pendingSemantic, state: 'completed' }] })
expectInvalidTransition(message, { ...message, reactions: [...message.reactions, { reactionId: 'unknown-terminal', actorParticipantId: participant.participantId, value: { kind: 'semantic', token: 'new' }, state: 'completed' }] })
expectInvalidTransition(message, { ...message, reactions: [{ ...pendingEmoji, actorParticipantId: 'missing-participant' }, pendingSemantic] })

for (const update of [
  { kind: 'item-updated', sequence: 1, item: { ...message, itemId: 'missing-item' } },
  { kind: 'item-appended', sequence: 1, item: { ...acknowledgement, itemId: 'new-item', sequence: snapshot.items.length, messageId: message.messageId } },
]) assert.notDeepEqual(applyItemUpdate(snapshot, update).errors, [], 'unknown/stale update must fail closed')

for (const mutate of [
  value => { value.items[2].participantId = humanParticipant.participantId },
  value => { value.items[2].participantId = identitylessAgent.participantId },
  value => { value.selection.activeRuns[1].participantId = otherAgent.participantId },
  value => { value.items[3].participantId = otherAgent.participantId },
  value => { value.items[2].state = 'joined'; value.selection.activeRuns = value.selection.activeRuns.filter(run => run.sessionId !== value.items[2].sessionId) },
  value => { value.items[3].state = 'ready'; value.selection.activeRuns = value.selection.activeRuns.filter(run => run.sessionId !== value.items[3].sessionId) },
  value => { value.items[3].state = 'joined'; value.selection.activeRuns[1].participantId = otherAgent.participantId },
]) {
  const bad = structuredClone(snapshot)
  mutate(bad)
  assert.notDeepEqual(snapshotErrors(bad), [], 'presence association mutant must fail')
}

for (const mutate of [
  value => { value.result.subscription.generation = 'other' },
  value => { value.pages[1].subscription = { ...value.pages[1].subscription, subscriptionId: 'stale-subscription' } },
  value => { value.pages[1].updates.at(-1).snapshot.items[0].source = 'chatroom-acknowledgement' },
]) {
  const bad = structuredClone(trace)
  mutate(bad)
  assert.notDeepEqual(traceErrors(bad), [], 'stale/cross-source trace mutant must fail')
}

for (const wire of [
  { ...result, status: 'denied', code: 'policy-denied', subscription: undefined },
  { ...result, status: 'unavailable', code: 'disposed', subscription: undefined },
  { ...result, status: 'denied', code: 'allowed', subscription: undefined },
]) assert.equal(v['agent-conversation-shell-result.v2.schema.json'](wire), wire.code !== 'allowed')

const shellSchemas = [...schemas.entries()].filter(([name]) => name.startsWith('agent-conversation-shell')).map(([, schema]) => schema)
for (const token of ['draft-changed', 'html', 'css', 'component', 'callback', 'selector', 'projection', 'fixture', 'avatarurl', 'avatarpath', 'avatardata', 'avatarblob']) assert.ok(!JSON.stringify(shellSchemas).toLowerCase().includes(token), `forbidden ${token}`)
console.log('Agent conversation shell conformance: frozen v1 plus v2 identity, presence, reaction, Host reference, convergence, and stream checks passed')
