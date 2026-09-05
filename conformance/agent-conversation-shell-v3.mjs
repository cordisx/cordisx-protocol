import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { isDeepStrictEqual } from 'node:util'
import { fileURLToPath } from 'node:url'
import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'
import { cloneAgentAvatarRef } from '../runtime/agent-avatar.v1.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const schemaNames = [
  'ui-common.v1.schema.json',
  'agent-avatar.v1.schema.json',
  'agent-loop-common.v1.schema.json',
  'agent-loop-common.v2.schema.json',
  'agent-loop-common.v3.schema.json',
  'agent-loop-task-details-common.v2.schema.json',
  'agent-conversation-shell-common.v1.schema.json',
  'agent-conversation-shell-common.v2.schema.json',
  'agent-conversation-shell-snapshot.v2.schema.json',
  'agent-conversation-shell-common.v3.schema.json',
  'agent-conversation-shell-snapshot.v3.schema.json',
  'agent-conversation-shell-subscription.v3.schema.json',
  'agent-conversation-shell-page.v3.schema.json',
  'agent-conversation-shell-command-context.v3.schema.json',
  'agent-conversation-shell-room-settings-request.v3.schema.json',
  'agent-conversation-shell-room-settings-result.v3.schema.json',
  'agent-conversation-shell-room-collection-leading-visual.v3.schema.json',
]
const schemas = new Map(
  await Promise.all(
    schemaNames.map(async name => [name, JSON.parse(await readFile(path.join(root, 'schemas', name), 'utf8'))]),
  ),
)
const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true })
addFormats(ajv)
for (const schema of schemas.values()) ajv.addSchema(schema)
const validator = name => {
  const value = ajv.getSchema(schemas.get(name).$id)
  if (value === undefined) throw new Error(`${name} was not registered`)
  return value
}
const validateSnapshotSchema = validator('agent-conversation-shell-snapshot.v3.schema.json')
const validateItemSchema = ajv.getSchema(
  `${schemas.get('agent-conversation-shell-snapshot.v3.schema.json').$id}#/$defs/item`,
)
if (validateItemSchema === undefined) throw new Error('Agent conversation shell v3 item schema was not registered')
const validatePageSchema = validator('agent-conversation-shell-page.v3.schema.json')
const validateCommandContextSchema = validator('agent-conversation-shell-command-context.v3.schema.json')
const validateRequestSchema = validator('agent-conversation-shell-room-settings-request.v3.schema.json')
const validateResultSchema = validator('agent-conversation-shell-room-settings-result.v3.schema.json')
const validateLeadingVisualSchema = validator('agent-conversation-shell-room-collection-leading-visual.v3.schema.json')
const schemaErrors = validate => (validate.errors ?? []).map(error => `${error.instancePath || '/'} ${error.message}`)

async function vector(relative) {
  return JSON.parse(await readFile(path.join(root, 'test-vectors', 'agent-conversation-shell-v3', relative), 'utf8'))
}

function textErrors(value, kind) {
  const errors = []
  if (typeof value !== 'string') return [`${kind} is not a string`]
  if (value !== value.normalize('NFC')) errors.push(`${kind} is not NFC`)
  if (value !== value.trim()) errors.push(`${kind} has edge whitespace`)
  const scalarLength = [...value].length
  const max = kind === 'name' ? 256 : 4000
  if (scalarLength < 1 || scalarLength > max) errors.push(`${kind} scalar length is out of bounds`)
  if (kind === 'name' && /[\u0000-\u001f\u007f]/u.test(value)) errors.push('name contains a control character')
  if (kind === 'description' && /[\u0000-\u0009\u000b-\u001f\u007f]/u.test(value)) {
    errors.push('description contains a forbidden control character')
  }
  return errors
}

function requestErrors(request) {
  const errors = []
  if (!validateRequestSchema(request)) return schemaErrors(validateRequestSchema)
  if (request.patch.name !== undefined) errors.push(...textErrors(request.patch.name, 'name'))
  if (request.patch.description?.state === 'present') {
    errors.push(...textErrors(request.patch.description.text, 'description'))
  }
  return errors
}

function resultErrors(result) {
  const errors = []
  if (!validateResultSchema(result)) return schemaErrors(validateResultSchema)
  if (result.status === 'applied' && result.snapshotSequence !== result.expectedSnapshotSequence + 1) {
    errors.push('applied result did not advance snapshotSequence exactly once')
  }
  return errors
}

function exchangeErrors(request, result) {
  const errors = [...requestErrors(request), ...resultErrors(result)]
  if (result.requestId !== request.requestId) errors.push('result requestId drift')
  if (!isDeepStrictEqual(result.binding, request.binding)) errors.push('result owner binding fence drift')
  if (result.generation !== request.generation) errors.push('result generation fence drift')
  if (result.roomId !== request.roomId) errors.push('result room fence drift')
  if (result.expectedSnapshotSequence !== request.expectedSnapshotSequence) errors.push('result snapshot fence drift')
  return errors
}

function snapshotErrors(snapshot) {
  const errors = []
  if (!validateSnapshotSchema(snapshot)) return schemaErrors(validateSnapshotSchema)
  if (snapshot.selection.kind === 'room' && snapshot.selection.description?.state === 'present') {
    errors.push(...textErrors(snapshot.selection.description.text.fallback, 'description'))
  }
  return errors
}

function approvalSnapshotErrors(snapshot) {
  const errors = snapshotErrors(snapshot)
  if (errors.length > 0 || snapshot.selection.kind !== 'room') return errors
  const participants = new Map(
    snapshot.selection.participants.map(participant => [participant.participantId, participant]),
  )
  const activeRuns = new Set(
    (snapshot.selection.activeRuns ?? []).map(run => `${run.participantId}\u0000${run.memberId}\u0000${run.runId}`),
  )
  const approvalTuples = new Set()
  for (const item of snapshot.items) {
    if (item.kind !== 'approval') continue
    const participant = participants.get(item.participantId)
    if (participant === undefined) errors.push('approval participant is not current')
    else if (participant.role !== 'agent' || participant.agentIdentity === undefined) {
      errors.push('approval participant lacks exact Agent Definition identity')
    }
    const runKey = `${item.participantId}\u0000${item.memberId}\u0000${item.runId}`
    if (!activeRuns.has(runKey)) errors.push('approval lacks exact active participant/member/run association')
    const tuple = `${item.binding.bindingId}\u0000${item.binding.generation}\u0000${item.turn}\u0000${item.approvalId}`
    if (approvalTuples.has(tuple)) errors.push('approval binding/turn/approvalId tuple is duplicated')
    approvalTuples.add(tuple)
    const decisions = new Set()
    for (const action of item.actions) {
      if (decisions.has(action.decision)) errors.push('approval decision action is duplicated')
      decisions.add(action.decision)
    }
  }
  return errors
}

function approvalTransitionErrors(previous, next) {
  const errors = []
  if (!validateItemSchema(next)) errors.push(...schemaErrors(validateItemSchema))
  if (previous.itemId !== next.itemId) errors.push('approval update changed itemId')
  if (previous.kind !== next.kind) errors.push('approval update changed item kind')
  if (previous.sequence !== next.sequence) errors.push('approval update moved timeline position')
  if (errors.length > 0 || previous.kind !== 'approval' || next.kind !== 'approval') return errors
  if (
    previous.participantId !== next.participantId || previous.memberId !== next.memberId
    || previous.runId !== next.runId
  ) errors.push('approval participant/member/run relation drift')
  if (!isDeepStrictEqual(previous.binding, next.binding)) errors.push('approval binding drift')
  if (
    previous.turn !== next.turn || previous.approvalId !== next.approvalId
    || previous.approvalKind !== next.approvalKind
  ) errors.push('approval turn/id/kind drift')
  if (!isDeepStrictEqual(previous.rationale, next.rationale)) errors.push('approval rationale drift')
  if (previous.state === 'pending') {
    if (!['pending', 'approved', 'denied', 'cancelled', 'failed'].includes(next.state)) {
      errors.push('approval transition is invalid')
    }
    if (next.state === 'pending' && !isDeepStrictEqual(previous, next)) {
      errors.push('same-state approval update is not idempotent')
    }
  } else if (previous.state !== next.state || !isDeepStrictEqual(previous, next)) {
    errors.push('terminal approval changed or regressed')
  }
  return errors
}

function applyApprovalUpdate(snapshot, update) {
  const current = structuredClone(snapshot)
  if (update.kind !== 'item-updated') return { snapshot: current, errors: ['approval lifecycle requires item-updated'] }
  if (update.sequence !== current.snapshotSequence + 1) {
    return { snapshot: current, errors: ['approval update sequence is stale or non-contiguous'] }
  }
  const index = current.items.findIndex(item => item.itemId === update.item.itemId)
  if (index < 0) return { snapshot: current, errors: ['approval update references unknown or stale item'] }
  const errors = approvalTransitionErrors(current.items[index], update.item)
  if (errors.length > 0) return { snapshot: current, errors }
  current.items[index] = structuredClone(update.item)
  current.snapshotSequence = update.sequence
  return { snapshot: current, errors: approvalSnapshotErrors(current) }
}

function approvalCommandContextErrors(context, snapshot) {
  const errors = []
  if (!validateCommandContextSchema(context)) return schemaErrors(validateCommandContextSchema)
  if (context.scope !== 'approval') return ['approval command context has the wrong scope']
  if (!isDeepStrictEqual(context.binding, snapshot.binding)) errors.push('approval command context owner binding drift')
  if (context.generation !== snapshot.generation) errors.push('approval command context generation drift')
  const item = snapshot.items.find(candidate => candidate.itemId === context.itemId)
  if (item === undefined || item.kind !== 'approval') errors.push('approval command context references unknown item')
  else if (item.state !== 'pending') errors.push('approval command context references terminal or stale item')
  else if (!item.actions.some(action => isDeepStrictEqual(action.command, context.command))) {
    errors.push('approval command context command does not match a pending decision')
  }
  return errors
}

function messageSnapshotErrors(snapshot) {
  const errors = snapshotErrors(snapshot)
  if (errors.length > 0 || snapshot.selection.kind !== 'room') return errors
  const participants = new Map(
    snapshot.selection.participants.map(participant => [participant.participantId, participant]),
  )
  const activeRuns = new Set(
    (snapshot.selection.activeRuns ?? []).map(run => `${run.participantId}\u0000${run.memberId}\u0000${run.runId}`),
  )
  const selfIntroductionTuples = new Set()
  for (const item of snapshot.items) {
    if (item.kind !== 'message') continue
    const participant = participants.get(item.author.participantId)
    if (participant === undefined || !isDeepStrictEqual(participant, item.author)) {
      errors.push('message author is not the exact current participant')
    }
    if (item.semantic.purpose === 'conversation' && item.source !== 'agent-loop') {
      errors.push('conversation message source drift')
    }
    if (item.semantic.purpose === 'chatroom-acknowledgement' && item.source !== 'chatroom-acknowledgement') {
      errors.push('acknowledgement message source drift')
    }
    if (item.semantic.purpose !== 'member-self-introduction') continue
    if (item.source !== 'agent-loop' || item.author.role !== 'agent' || item.author.agentIdentity === undefined) {
      errors.push('self-introduction is not an AgentLoop-authored Agent message')
    }
    if (item.semantic.participantId !== item.author.participantId) {
      errors.push('self-introduction semantic participant does not match author')
    }
    const runKey = `${item.semantic.participantId}\u0000${item.semantic.memberId}\u0000${item.semantic.runId}`
    if (!activeRuns.has(runKey)) errors.push('self-introduction lacks exact active participant/member/run association')
    const tuple =
      `${item.semantic.binding.bindingId}\u0000${item.semantic.binding.generation}\u0000${item.semantic.turn}\u0000${item.messageId}\u0000${item.semantic.causation.operationId}`
    if (selfIntroductionTuples.has(tuple)) errors.push('self-introduction operation/message association is duplicated')
    selfIntroductionTuples.add(tuple)
  }
  return errors
}

function messageTransitionErrors(previous, next) {
  const errors = []
  if (!validateItemSchema(next)) errors.push(...schemaErrors(validateItemSchema))
  if (previous.itemId !== next.itemId) errors.push('message update changed itemId')
  if (previous.kind !== next.kind) errors.push('message update changed item kind')
  if (previous.sequence !== next.sequence) errors.push('message update moved timeline position')
  if (errors.length > 0 || previous.kind !== 'message' || next.kind !== 'message') return errors
  if (previous.messageId !== next.messageId) errors.push('message update changed messageId')
  if (previous.source !== next.source) errors.push('message update changed source')
  if (!isDeepStrictEqual(previous.author, next.author)) errors.push('message update changed author')
  if (!isDeepStrictEqual(previous.semantic, next.semantic)) errors.push('message update changed semantic association')
  return errors
}

function applyMessageUpdate(snapshot, update) {
  const current = structuredClone(snapshot)
  if (update.kind !== 'item-updated') return { snapshot: current, errors: ['message lifecycle requires item-updated'] }
  if (update.sequence !== current.snapshotSequence + 1) {
    return { snapshot: current, errors: ['message update sequence is stale or non-contiguous'] }
  }
  const index = current.items.findIndex(item => item.itemId === update.item.itemId)
  if (index < 0) return { snapshot: current, errors: ['message update references unknown or stale item'] }
  const errors = messageTransitionErrors(current.items[index], update.item)
  if (errors.length > 0) return { snapshot: current, errors }
  current.items[index] = structuredClone(update.item)
  current.snapshotSequence = update.sequence
  return { snapshot: current, errors: messageSnapshotErrors(current) }
}

function leadingVisualErrors(visual) {
  const errors = []
  if (!validateLeadingVisualSchema(visual)) return schemaErrors(validateLeadingVisualSchema)
  if (visual.kind === 'room-composite-avatar') {
    const participantIds = new Set()
    for (const participant of visual.participants) {
      if (participantIds.has(participant.participantId)) errors.push('composite avatar participantId is duplicated')
      participantIds.add(participant.participantId)
      try {
        cloneAgentAvatarRef(participant.avatar)
      } catch (error) {
        errors.push(`participant avatar is not a formal AgentAvatarRef: ${error.message}`)
      }
    }
  }
  return errors
}

function collectionErrors(collection) {
  const errors = []
  if (!Number.isSafeInteger(collection?.revision) || collection.revision < 0) {
    errors.push('collection revision is invalid')
  }
  if (!Array.isArray(collection?.rows)) return [...errors, 'collection rows are absent']
  const rowIds = new Set()
  for (const row of collection.rows) {
    if (rowIds.has(row.rowId)) errors.push('collection row identity is duplicated')
    rowIds.add(row.rowId)
    if (row.leadingVisual === undefined) continue
    errors.push(...leadingVisualErrors(row.leadingVisual))
    if (row.kind === 'room') {
      if (row.leadingVisual.kind !== 'room-composite-avatar') errors.push('Room row does not use a composite avatar')
      else if (row.leadingVisual.roomId !== row.route?.params?.roomId) {
        errors.push('Room visual roomId does not match the row route association')
      }
    } else if (row.kind === 'create-room') {
      if (!isDeepStrictEqual(row.leadingVisual, { kind: 'semantic-icon', icon: 'host:action.add' })) {
        errors.push('New Room row does not use the fixed semantic add icon')
      }
    } else errors.push('collection row kind is unknown')
  }
  return errors
}

function createCollectionOwner(initial) {
  let current = structuredClone(initial)
  return {
    read: () => structuredClone(current),
    replace(next) {
      if (next.revision < current.revision) {
        return {
          accepted: false,
          code: 'stale-revision',
          errors: ['collection revision regressed'],
          collection: structuredClone(current),
        }
      }
      if (next.revision === current.revision) {
        if (isDeepStrictEqual(next, current)) {
          return { accepted: true, replayed: true, collection: structuredClone(current), errors: [] }
        }
        return {
          accepted: false,
          code: 'same-revision-divergent',
          errors: ['same collection revision has divergent data'],
          collection: structuredClone(current),
        }
      }
      const errors = collectionErrors(next)
      if (errors.length > 0) {
        return { accepted: false, code: 'invalid-replacement', errors, collection: structuredClone(current) }
      }
      current = structuredClone(next)
      return { accepted: true, replayed: false, collection: structuredClone(current), errors: [] }
    },
  }
}

function rowVisual(collection, rowId) {
  return structuredClone(collection.rows.find(row => row.rowId === rowId)?.leadingVisual)
}

function responseEnvelope(request, status, code, extra = {}) {
  return {
    $schema: schemas.get('agent-conversation-shell-room-settings-result.v3.schema.json').$id,
    contract: 'cordisx.agent-conversation-shell-room-settings-result/v3',
    schemaVersion: 3,
    requestId: request.requestId,
    binding: structuredClone(request.binding),
    generation: request.generation,
    roomId: request.roomId,
    expectedSnapshotSequence: request.expectedSnapshotSequence,
    type: 'update-room-settings',
    status,
    code,
    ...extra,
  }
}

function projectPatch(snapshot, request) {
  const next = structuredClone(snapshot)
  if (request.patch.name !== undefined) next.selection.title.fallback = request.patch.name
  if (request.patch.description !== undefined) {
    next.selection.description = request.patch.description.state === 'empty'
      ? { state: 'empty' }
      : { state: 'present', text: { key: 'room.description', fallback: request.patch.description.text } }
  }
  next.snapshotSequence += 1
  return next
}

function createOwner(initialSnapshot) {
  let current = structuredClone(initialSnapshot)
  let availability = 'available'
  const ledger = new Map()
  return {
    snapshot: () => structuredClone(current),
    setAvailability: value => {
      availability = value
    },
    update(request) {
      const errors = requestErrors(request)
      if (errors.length > 0) return { errors, snapshot: structuredClone(current) }
      const remembered = ledger.get(request.requestId)
      if (remembered !== undefined) {
        if (!isDeepStrictEqual(remembered.request, request)) {
          const result = responseEnvelope(request, 'conflict', 'request-conflict', {
            currentSnapshotSequence: current.snapshotSequence,
          })
          return { errors: resultErrors(result), result, snapshot: structuredClone(current) }
        }
        return {
          errors: resultErrors(remembered.result),
          result: structuredClone(remembered.result),
          snapshot: structuredClone(current),
          replayed: true,
        }
      }
      let result
      if (availability !== 'available') {
        result = responseEnvelope(request, 'unavailable', availability)
      } else if (
        request.binding.bindingId !== current.binding.bindingId
        || request.binding.ownerGeneration !== current.binding.ownerGeneration
      ) {
        result = responseEnvelope(request, 'conflict', 'owner-conflict', {
          currentSnapshotSequence: current.snapshotSequence,
        })
      } else if (request.generation !== current.generation) {
        result = responseEnvelope(request, 'conflict', 'generation-conflict', {
          currentSnapshotSequence: current.snapshotSequence,
        })
      } else if (current.selection.kind !== 'room' || request.roomId !== current.selection.roomId) {
        result = responseEnvelope(request, 'conflict', 'room-conflict', {
          currentSnapshotSequence: current.snapshotSequence,
        })
      } else if (request.expectedSnapshotSequence !== current.snapshotSequence) {
        result = responseEnvelope(request, 'conflict', 'snapshot-conflict', {
          currentSnapshotSequence: current.snapshotSequence,
        })
      } else if (request.patch.description !== undefined && current.selection.description === undefined) {
        result = responseEnvelope(request, 'unavailable', 'settings-unavailable')
      } else {
        current = projectPatch(current, request)
        result = responseEnvelope(request, 'applied', 'applied', { snapshotSequence: current.snapshotSequence })
      }
      ledger.set(request.requestId, { request: structuredClone(request), result: structuredClone(result) })
      return { errors: resultErrors(result), result, snapshot: structuredClone(current) }
    },
  }
}

const scenario = await vector('valid/room-settings-cas.json')
assert.deepEqual(snapshotErrors(scenario.initialSnapshot), [])
assert.deepEqual(requestErrors(scenario.request), [])
assert.deepEqual(requestErrors(scenario.clearRequest), [])
assert.deepEqual(resultErrors(scenario.appliedResult), [])
assert.deepEqual(exchangeErrors(scenario.request, scenario.appliedResult), [])

const owner = createOwner(scenario.initialSnapshot)
const applied = owner.update(scenario.request)
assert.deepEqual(applied.errors, [])
assert.deepEqual(applied.result, scenario.appliedResult)
assert.deepEqual(applied.snapshot, scenario.expectedSnapshot)
assert.deepEqual(snapshotErrors(applied.snapshot), [])

// The Settings inspector and the Room header consume the same immutable selection data.
assert.equal(applied.snapshot.selection.title.fallback, scenario.request.patch.name)
assert.equal(applied.snapshot.selection.description.text.fallback, scenario.request.patch.description.text)
assert.deepEqual(applied.snapshot.selection.participants, scenario.initialSnapshot.selection.participants)
assert.deepEqual(applied.snapshot.selection.activeRuns, scenario.initialSnapshot.selection.activeRuns)
assert.deepEqual(applied.snapshot.items, scenario.initialSnapshot.items)
assert.deepEqual(applied.snapshot.composer, scenario.initialSnapshot.composer)
assert.deepEqual(applied.snapshot.headerActions, scenario.initialSnapshot.headerActions)
assert.equal(scenario.initialSnapshot.selection.description.state, 'empty')
assert.equal(applied.snapshot.selection.description.state, 'present')

// A crash/retry with the exact request is idempotent; divergent payload under the same ID conflicts.
const replay = owner.update(scenario.request)
assert.equal(replay.replayed, true)
assert.deepEqual(replay.result, applied.result)
assert.deepEqual(replay.snapshot, applied.snapshot)
assert.deepEqual(exchangeErrors(scenario.request, replay.result), [])
const divergent = structuredClone(scenario.request)
divergent.patch.name = 'Different payload'
const requestConflict = owner.update(divergent)
assert.equal(requestConflict.result.status, 'conflict')
assert.equal(requestConflict.result.code, 'request-conflict')
assert.deepEqual(requestConflict.snapshot, applied.snapshot)

// Clear is an explicit state, never an omitted or empty present string.
const cleared = owner.update(scenario.clearRequest)
assert.equal(cleared.result.status, 'applied')
assert.deepEqual(cleared.snapshot.selection.description, { state: 'empty' })
assert.equal(cleared.snapshot.snapshotSequence, 43)
const absentDescription = structuredClone(scenario.initialSnapshot)
delete absentDescription.selection.description
assert.deepEqual(snapshotErrors(absentDescription), [])
assert.notDeepEqual(
  absentDescription.selection,
  scenario.initialSnapshot.selection,
  'absent means undeclared while empty is an explicit presentation state',
)
assert.equal('description' in absentDescription.selection, false)
const absentCapability = await vector('valid/description-capability.json')
const absentOwner = createOwner(absentDescription)
const absentRequest = structuredClone(scenario.request)
absentRequest.requestId = 'settings-absent-description-capability'
absentRequest.patch = structuredClone(absentCapability.patch)
const absentBefore = absentOwner.snapshot()
const absentOutcome = absentOwner.update(absentRequest)
assert.equal(absentOutcome.result.status, absentCapability.expectedStatus)
assert.equal(absentOutcome.result.code, absentCapability.expectedCode)
assert.deepEqual(absentOutcome.snapshot, absentBefore)
assert.equal(
  absentOutcome.snapshot.selection.title.fallback,
  scenario.initialSnapshot.selection.title.fallback,
  'mixed patch must not partially apply name',
)
assert.equal('description' in absentOutcome.snapshot.selection, false)
const descriptionUnavailableOwner = createOwner(absentDescription)
const descriptionUnavailableRequest = structuredClone(scenario.request)
descriptionUnavailableRequest.requestId = 'description-capability-absent'
const descriptionUnavailable = descriptionUnavailableOwner.update(descriptionUnavailableRequest)
assert.equal(descriptionUnavailable.result.status, 'unavailable')
assert.equal(descriptionUnavailable.result.code, 'settings-unavailable')
assert.deepEqual(
  descriptionUnavailable.snapshot,
  absentDescription,
  'mixed patch must not rename when description capability is absent',
)
const nameOnlyOwner = createOwner(absentDescription)
const nameOnlyRequest = structuredClone(scenario.request)
nameOnlyRequest.requestId = 'name-only-without-description-capability'
nameOnlyRequest.patch = { name: 'Renamed without description' }
const nameOnlyApplied = nameOnlyOwner.update(nameOnlyRequest)
assert.equal(nameOnlyApplied.result.status, 'applied')
assert.equal(nameOnlyApplied.snapshot.selection.title.fallback, nameOnlyRequest.patch.name)
assert.equal('description' in nameOnlyApplied.snapshot.selection, false)

// Exact owner, generation, room, and snapshot fences fail closed without mutating state.
for (
  const [field, mutate, expectedCode] of [
    ['binding', request => {
      request.binding.bindingId = 'other-binding'
    }, 'owner-conflict'],
    ['owner', request => {
      request.binding.ownerGeneration = 'other-owner'
    }, 'owner-conflict'],
    ['generation', request => {
      request.generation = 'other-generation'
    }, 'generation-conflict'],
    ['room', request => {
      request.roomId = 'other-room'
    }, 'room-conflict'],
    ['snapshot', request => {
      request.expectedSnapshotSequence -= 1
    }, 'snapshot-conflict'],
  ]
) {
  const isolated = createOwner(scenario.initialSnapshot)
  const request = structuredClone(scenario.request)
  request.requestId = `conflict-${field}`
  mutate(request)
  const before = isolated.snapshot()
  const outcome = isolated.update(request)
  assert.equal(outcome.result.status, 'conflict')
  assert.equal(outcome.result.code, expectedCode)
  assert.deepEqual(exchangeErrors(request, outcome.result), [])
  assert.deepEqual(outcome.snapshot, before)
}

for (const code of ['owner-unavailable', 'settings-unavailable', 'disposed']) {
  const isolated = createOwner(scenario.initialSnapshot)
  isolated.setAvailability(code)
  const request = structuredClone(scenario.request)
  request.requestId = `unavailable-${code}`
  const outcome = isolated.update(request)
  assert.equal(outcome.result.status, 'unavailable')
  assert.equal(outcome.result.code, code)
  assert.deepEqual(exchangeErrors(request, outcome.result), [])
  assert.deepEqual(outcome.snapshot, scenario.initialSnapshot)
  if (code === 'settings-unavailable') {
    assert.equal('name' in request.patch, true)
    assert.equal('description' in request.patch, true)
    assert.equal(outcome.snapshot.selection.title.fallback, scenario.initialSnapshot.selection.title.fallback)
    assert.deepEqual(outcome.snapshot.selection.description, scenario.initialSnapshot.selection.description)
  }
}

// Snapshot replacement and the locally projected applied update converge atomically.
const replacement = structuredClone(scenario.expectedSnapshot)
assert.deepEqual(applied.snapshot, replacement)
assert.equal(applied.snapshot.snapshotSequence, applied.result.snapshotSequence)
const subscription = {
  $schema: schemas.get('agent-conversation-shell-subscription.v3.schema.json').$id,
  contract: 'cordisx.agent-conversation-shell-subscription/v3',
  schemaVersion: 3,
  subscriptionId: 'settings-convergence',
  binding: structuredClone(scenario.initialSnapshot.binding),
  generation: scenario.initialSnapshot.generation,
  afterSequence: scenario.initialSnapshot.snapshotSequence,
  snapshotSequence: scenario.initialSnapshot.snapshotSequence,
}
const replacementPage = {
  $schema: schemas.get('agent-conversation-shell-page.v3.schema.json').$id,
  contract: 'cordisx.agent-conversation-shell-page/v3',
  schemaVersion: 3,
  subscription,
  afterSequence: scenario.initialSnapshot.snapshotSequence,
  phase: 'live',
  updates: [{ kind: 'snapshot-replaced', sequence: applied.result.snapshotSequence, snapshot: replacement }],
  nextAfterSequence: applied.result.snapshotSequence,
  hasMore: false,
}
assert.equal(validatePageSchema(replacementPage), true, ajv.errorsText(validatePageSchema.errors))
assert.deepEqual(replacementPage.updates[0].snapshot, applied.snapshot)

const typed = await vector('valid/typed-results.json')
for (const value of typed.results) assert.deepEqual(resultErrors(value), [])
const validText = await vector('valid/text-normalization.json')
for (const name of validText.names) assert.deepEqual(textErrors(name, 'name'), [])
for (const description of validText.descriptions) assert.deepEqual(textErrors(description, 'description'), [])
assert.deepEqual(textErrors('😀'.repeat(256), 'name'), [])
assert.notDeepEqual(textErrors('😀'.repeat(257), 'name'), [])
assert.deepEqual(textErrors('😀'.repeat(4000), 'description'), [])
assert.notDeepEqual(textErrors('😀'.repeat(4001), 'description'), [])
const invalidText = await vector('invalid/text-normalization.json')
for (const name of invalidText.names) assert.notDeepEqual(textErrors(name, 'name'), [])
for (const description of invalidText.descriptions) assert.notDeepEqual(textErrors(description, 'description'), [])

for (
  const mutate of [
    request => {
      request.patch = {}
    },
    request => {
      request.patch.description = { state: 'present', text: '' }
      delete request.patch.name
    },
    request => {
      request.patch.description = { state: 'empty', text: 'must-not-exist' }
      delete request.patch.name
    },
    request => {
      request.patch.html = '<input>'
      delete request.patch.name
      delete request.patch.description
    },
    request => {
      request.callback = 'save'
    },
    request => {
      delete request.expectedSnapshotSequence
    },
  ]
) {
  const invalid = structuredClone(scenario.request)
  mutate(invalid)
  assert.notDeepEqual(requestErrors(invalid), [], 'invalid settings request must fail closed')
}

for (
  const mutate of [
    result => {
      result.snapshotSequence = result.expectedSnapshotSequence
    },
    result => {
      result.status = 'conflict'
      result.code = 'snapshot-conflict'
    },
    result => {
      result.status = 'unavailable'
      result.code = 'disposed'
    },
  ]
) {
  const invalid = structuredClone(scenario.appliedResult)
  mutate(invalid)
  assert.notDeepEqual(resultErrors(invalid), [], 'invalid settings result must fail closed')
}

const approvalVector = await vector('valid/approval-item-lifecycle.json')
const approvalBase = structuredClone(scenario.initialSnapshot)
approvalBase.items.push(structuredClone(approvalVector.pending))
assert.deepEqual(approvalSnapshotErrors(approvalBase), [])
assert.deepEqual(approvalVector.pending.actions.map(action => action.decision), ['approve', 'deny', 'cancel'])
const approvalCommandContext = {
  $schema: schemas.get('agent-conversation-shell-command-context.v3.schema.json').$id,
  contract: 'cordisx.agent-conversation-shell-command-context/v3',
  schemaVersion: 3,
  binding: structuredClone(approvalBase.binding),
  generation: approvalBase.generation,
  scope: 'approval',
  itemId: approvalVector.pending.itemId,
  command: structuredClone(approvalVector.pending.actions[0].command),
}
assert.deepEqual(approvalCommandContextErrors(approvalCommandContext, approvalBase), [])
for (
  const mutate of [
    context => {
      context.binding.bindingId = 'other-binding'
    },
    context => {
      context.binding.ownerGeneration = 'other-owner'
    },
    context => {
      context.generation = 'other-generation'
    },
    context => {
      context.itemId = 'unknown-item'
    },
    context => {
      context.command = { id: 'chatroom:unknown-approval-command' }
    },
    context => {
      context.submitPayload = 'approve'
    },
    context => {
      context.callback = 'approve'
    },
  ]
) {
  const invalid = structuredClone(approvalCommandContext)
  mutate(invalid)
  assert.notDeepEqual(
    approvalCommandContextErrors(invalid, approvalBase),
    [],
    'invalid approval command context must fail closed',
  )
}

function terminalApproval(state) {
  const item = structuredClone(approvalVector.pending)
  item.state = state
  item.actions = []
  if (state === 'failed') item.diagnostic = structuredClone(approvalVector.failedDiagnostic)
  return item
}

for (const state of approvalVector.terminalStates) {
  const item = terminalApproval(state)
  const outcome = applyApprovalUpdate(approvalBase, { kind: 'item-updated', sequence: 42, item })
  assert.deepEqual(outcome.errors, [])
  assert.equal(outcome.snapshot.items.length, approvalBase.items.length)
  assert.equal(outcome.snapshot.items[1].itemId, approvalVector.pending.itemId)
  assert.equal(outcome.snapshot.items[1].sequence, approvalVector.pending.sequence)
  assert.equal(outcome.snapshot.items[1].state, state)
  assert.deepEqual(outcome.snapshot.items[1].actions, [])
}
const failedApproval = applyApprovalUpdate(approvalBase, {
  kind: 'item-updated',
  sequence: 42,
  item: terminalApproval('failed'),
})
assert.deepEqual(failedApproval.errors, [])
assert.deepEqual(failedApproval.snapshot.items[1].diagnostic, approvalVector.failedDiagnostic)

const approvedUpdate = { kind: 'item-updated', sequence: 42, item: terminalApproval('approved') }
const approvedIncremental = applyApprovalUpdate(approvalBase, approvedUpdate)
assert.deepEqual(approvedIncremental.errors, [])
assert.notDeepEqual(
  approvalCommandContextErrors(approvalCommandContext, approvedIncremental.snapshot),
  [],
  'terminal approval command context must be stale',
)
const approvedReplacement = structuredClone(approvedIncremental.snapshot)
approvedReplacement.snapshotSequence = 43
assert.deepEqual(approvalSnapshotErrors(approvedReplacement), [])
const normalizeApprovalWatermark = snapshot => ({ ...snapshot, snapshotSequence: 0 })
assert.deepEqual(
  normalizeApprovalWatermark(approvedIncremental.snapshot),
  normalizeApprovalWatermark(approvedReplacement),
  'approval incremental and snapshot replacement must converge',
)
const approvalSubscription = {
  $schema: schemas.get('agent-conversation-shell-subscription.v3.schema.json').$id,
  contract: 'cordisx.agent-conversation-shell-subscription/v3',
  schemaVersion: 3,
  subscriptionId: 'approval-convergence',
  binding: structuredClone(approvalBase.binding),
  generation: approvalBase.generation,
  afterSequence: 41,
  snapshotSequence: 41,
}
const approvalPage = {
  $schema: schemas.get('agent-conversation-shell-page.v3.schema.json').$id,
  contract: 'cordisx.agent-conversation-shell-page/v3',
  schemaVersion: 3,
  subscription: approvalSubscription,
  afterSequence: 41,
  phase: 'live',
  updates: [approvedUpdate, { kind: 'snapshot-replaced', sequence: 43, snapshot: approvedReplacement }],
  nextAfterSequence: 43,
  hasMore: false,
}
assert.equal(validatePageSchema(approvalPage), true, ajv.errorsText(validatePageSchema.errors))

const invalidApprovalVector = await vector('invalid/approval-item-updates.json')
const invalidApprovalMutations = new Set(invalidApprovalVector.mutations)
function expectInvalidApproval(mutation, mutate) {
  assert.equal(invalidApprovalMutations.has(mutation), true)
  const item = structuredClone(approvalVector.pending)
  mutate(item)
  assert.notDeepEqual(
    approvalTransitionErrors(approvalVector.pending, item),
    [],
    `${mutation} approval update must fail closed`,
  )
}
expectInvalidApproval('cross-kind', item => {
  Object.assign(item, {
    kind: 'status',
    label: { key: 'status', fallback: 'Status' },
    state: 'info',
    ariaLive: 'polite',
  })
  delete item.participantId
  delete item.memberId
  delete item.runId
  delete item.binding
  delete item.turn
  delete item.approvalId
  delete item.approvalKind
  delete item.rationale
  delete item.actions
})
expectInvalidApproval('participant', item => {
  item.participantId = 'participant-owner'
})
expectInvalidApproval('member', item => {
  item.memberId = 'other-member'
})
expectInvalidApproval('run', item => {
  item.runId = 'other-run'
})
expectInvalidApproval('binding-id', item => {
  item.binding.bindingId = 'other-binding'
})
expectInvalidApproval('binding-generation', item => {
  item.binding.generation += 1
})
expectInvalidApproval('turn', item => {
  item.turn = 'other-turn'
})
expectInvalidApproval('approval-id', item => {
  item.approvalId = 'other-approval'
})
expectInvalidApproval('approval-kind', item => {
  item.approvalKind = 'file-change'
})
expectInvalidApproval('timeline-order', item => {
  item.sequence += 1
})
expectInvalidApproval('duplicate-decision', item => {
  item.actions[1].decision = 'approve'
})
expectInvalidApproval('terminal-actions', item => {
  item.state = 'approved'
})
expectInvalidApproval('failed-without-diagnostic', item => {
  item.state = 'failed'
  item.actions = []
})
expectInvalidApproval('callback', item => {
  item.actions[0].command.callback = 'approve'
})
expectInvalidApproval('dom', item => {
  item.dom = '#approval'
})
expectInvalidApproval('html', item => {
  item.html = '<button>Approve</button>'
})
expectInvalidApproval('raw-task', item => {
  item.task = 'task-private'
})

const unknownApproval = structuredClone(approvalVector.pending)
unknownApproval.itemId = 'unknown-approval-item'
assert.notDeepEqual(
  applyApprovalUpdate(approvalBase, { kind: 'item-updated', sequence: 42, item: unknownApproval }).errors,
  [],
)
const staleTerminal = applyApprovalUpdate(approvedIncremental.snapshot, {
  kind: 'item-updated',
  sequence: 43,
  item: terminalApproval('denied'),
})
assert.notDeepEqual(staleTerminal.errors, [], 'terminal approval update must fail closed')
for (
  const sequence of [
    approvalBase.snapshotSequence,
    approvalBase.snapshotSequence - 1,
    approvalBase.snapshotSequence + 2,
  ]
) {
  const outcome = applyApprovalUpdate(approvalBase, {
    kind: 'item-updated',
    sequence,
    item: terminalApproval('approved'),
  })
  assert.notDeepEqual(outcome.errors, [], 'stale or skipped approval update sequence must fail closed')
  assert.deepEqual(outcome.snapshot, approvalBase)
}
for (const field of ['participantId', 'memberId', 'runId']) {
  const bad = structuredClone(approvalBase)
  bad.items[1][field] = `unassociated-${field}`
  assert.notDeepEqual(approvalSnapshotErrors(bad), [], `approval ${field} must match an active run`)
}

const messageVector = await vector('valid/message-semantics.json')
const messageBase = structuredClone(scenario.initialSnapshot)
const initialSelfIntroduction = structuredClone(messageVector.selfIntroduction)
initialSelfIntroduction.deliveryState = 'sent'
messageBase.items.push(
  structuredClone(messageVector.conversation),
  initialSelfIntroduction,
  structuredClone(messageVector.acknowledgement),
)
assert.deepEqual(messageSnapshotErrors(messageBase), [])
assert.deepEqual(messageVector.selfIntroduction.semantic, {
  purpose: 'member-self-introduction',
  causation: { operationId: messageVector.agentLoopProjection.operationId },
  participantId: messageVector.agentLoopProjection.participantId,
  memberId: messageVector.agentLoopProjection.memberId,
  runId: messageVector.agentLoopProjection.runId,
  binding: messageVector.agentLoopProjection.binding,
  turn: messageVector.agentLoopProjection.turn,
})
assert.equal(messageVector.selfIntroduction.messageId, messageVector.agentLoopProjection.messageId)
assert.equal(messageVector.selfIntroduction.kind, 'message')
assert.equal(messageVector.selfIntroduction.source, 'agent-loop')
assert.equal(messageVector.selfIntroduction.author.role, 'agent')
assert.equal(messageVector.selfIntroduction.body.length, 1)
assert.equal(messageVector.selfIntroduction.body[0].kind, 'text')

// A self-introduction is updated as the same ordinary message bubble. Its
// durable operation, Agent/Run association, identity, and timeline position
// cannot be rewritten while delivery state converges.
const selfIntroductionUpdate = {
  kind: 'item-updated',
  sequence: 42,
  item: structuredClone(messageVector.selfIntroduction),
}
const selfIntroductionIncremental = applyMessageUpdate(messageBase, selfIntroductionUpdate)
assert.deepEqual(selfIntroductionIncremental.errors, [])
assert.equal(selfIntroductionIncremental.snapshot.items.length, messageBase.items.length)
assert.deepEqual(
  selfIntroductionIncremental.snapshot.items.map(item => item.itemId),
  messageBase.items.map(item => item.itemId),
)
assert.equal(selfIntroductionIncremental.snapshot.items[2].deliveryState, 'delivered')
const selfIntroductionReplacement = structuredClone(selfIntroductionIncremental.snapshot)
selfIntroductionReplacement.snapshotSequence = 43
assert.deepEqual(messageSnapshotErrors(selfIntroductionReplacement), [])
const normalizeMessageWatermark = snapshot => ({ ...snapshot, snapshotSequence: 0 })
assert.deepEqual(
  normalizeMessageWatermark(selfIntroductionIncremental.snapshot),
  normalizeMessageWatermark(selfIntroductionReplacement),
  'self-introduction incremental and snapshot replacement must converge',
)
const messageSubscription = {
  $schema: schemas.get('agent-conversation-shell-subscription.v3.schema.json').$id,
  contract: 'cordisx.agent-conversation-shell-subscription/v3',
  schemaVersion: 3,
  subscriptionId: 'self-introduction-convergence',
  binding: structuredClone(messageBase.binding),
  generation: messageBase.generation,
  afterSequence: 41,
  snapshotSequence: 41,
}
const messagePage = {
  $schema: schemas.get('agent-conversation-shell-page.v3.schema.json').$id,
  contract: 'cordisx.agent-conversation-shell-page/v3',
  schemaVersion: 3,
  subscription: messageSubscription,
  afterSequence: 41,
  phase: 'live',
  updates: [selfIntroductionUpdate, { kind: 'snapshot-replaced', sequence: 43, snapshot: selfIntroductionReplacement }],
  nextAfterSequence: 43,
  hasMore: false,
}
assert.equal(validatePageSchema(messagePage), true, ajv.errorsText(validatePageSchema.errors))

for (
  const [label, mutate] of [
    ['itemId', item => {
      item.itemId = 'other-item'
    }],
    ['kind', item => {
      Object.assign(item, { kind: 'status', label: { key: 'status', fallback: 'Status' }, state: 'info' })
      delete item.messageId
      delete item.source
      delete item.semantic
      delete item.author
      delete item.body
      delete item.reactions
      delete item.timestamp
      delete item.deliveryState
      delete item.runState
      delete item.actions
    }],
    ['timeline', item => {
      item.sequence += 1
    }],
    ['messageId', item => {
      item.messageId = 'other-message'
    }],
    ['source', item => {
      item.source = 'chatroom-acknowledgement'
    }],
    ['author', item => {
      item.author.participantId = 'participant-owner'
      item.author.role = 'human'
      delete item.author.agentIdentity
    }],
    ['participant', item => {
      item.semantic.participantId = 'participant-owner'
    }],
    ['member', item => {
      item.semantic.memberId = 'other-member'
    }],
    ['run', item => {
      item.semantic.runId = 'other-run'
    }],
    ['binding-id', item => {
      item.semantic.binding.bindingId = 'other-binding'
    }],
    ['binding-generation', item => {
      item.semantic.binding.generation += 1
    }],
    ['turn', item => {
      item.semantic.turn = 'other-turn'
    }],
    ['operation', item => {
      item.semantic.causation.operationId = 'other-operation'
    }],
    ['purpose', item => {
      item.semantic = { purpose: 'conversation' }
    }],
  ]
) {
  const invalid = structuredClone(messageVector.selfIntroduction)
  mutate(invalid)
  assert.notDeepEqual(
    messageTransitionErrors(initialSelfIntroduction, invalid),
    [],
    `${label} self-introduction update must fail closed`,
  )
}

const unknownSelfIntroduction = structuredClone(messageVector.selfIntroduction)
unknownSelfIntroduction.itemId = 'unknown-self-introduction'
assert.notDeepEqual(
  applyMessageUpdate(messageBase, { kind: 'item-updated', sequence: 42, item: unknownSelfIntroduction }).errors,
  [],
)
for (
  const sequence of [messageBase.snapshotSequence, messageBase.snapshotSequence - 1, messageBase.snapshotSequence + 2]
) {
  const outcome = applyMessageUpdate(messageBase, {
    kind: 'item-updated',
    sequence,
    item: structuredClone(messageVector.selfIntroduction),
  })
  assert.notDeepEqual(outcome.errors, [], 'stale or skipped self-introduction update sequence must fail closed')
  assert.deepEqual(outcome.snapshot, messageBase)
}

for (
  const mutate of [
    item => {
      item.callback = 'render'
    },
    item => {
      item.dom = '#message'
    },
    item => {
      item.html = '<article>introduction</article>'
    },
    item => {
      item.task = 'task-private'
    },
    item => {
      item.prompt = 'hidden provider prompt'
    },
    item => {
      item.debug = 'self-introduction'
    },
  ]
) {
  const invalid = structuredClone(messageVector.selfIntroduction)
  mutate(invalid)
  assert.equal(
    validateItemSchema(invalid),
    false,
    'self-introduction message must reject callback/DOM/HTML/raw task/provider-private fields',
  )
}

for (
  const mutate of [
    snapshot => {
      snapshot.items[2].semantic.participantId = 'participant-owner'
    },
    snapshot => {
      snapshot.items[2].semantic.memberId = 'other-member'
    },
    snapshot => {
      snapshot.items[2].semantic.runId = 'other-run'
    },
    snapshot => {
      snapshot.items[2].author.displayName.fallback = 'Guessed author'
    },
  ]
) {
  const invalid = structuredClone(messageBase)
  mutate(invalid)
  assert.notDeepEqual(messageSnapshotErrors(invalid), [], 'self-introduction snapshot association must fail closed')
}

const visualVector = await vector('valid/room-collection-leading-visual.json')
assert.deepEqual(visualVector.countVectors.map(value => value.participants.length), [0, 1, 2, 3, 5])
for (const visual of visualVector.countVectors) {
  assert.deepEqual(leadingVisualErrors(visual), [])
  assert.deepEqual(
    visual.participants.map(value => value.participantId),
    Array.from({ length: visual.participants.length }, (_, index) => `participant-${index + 1}`),
  )
}
assert.deepEqual(collectionErrors(visualVector.initialCollection), [])
assert.deepEqual(collectionErrors(visualVector.visualCollection), [])
const collectionOwner = createCollectionOwner(visualVector.initialCollection)
const visualReplacement = collectionOwner.replace(visualVector.visualCollection)
assert.equal(visualReplacement.accepted, true)
assert.deepEqual(visualReplacement.errors, [])

// Adding visuals does not rewrite generic Host-owned row identity, label, route, params, or order.
const withoutVisual = collection => collection.rows.map(({ leadingVisual: ignored, ...row }) => row)
assert.deepEqual(withoutVisual(visualReplacement.collection), withoutVisual(visualVector.initialCollection))
assert.deepEqual(
  visualReplacement.collection.rows.map(row => row.rowId),
  visualVector.initialCollection.rows.map(row => row.rowId),
)
assert.deepEqual(visualReplacement.collection.rows.at(-1).leadingVisual, {
  kind: 'semantic-icon',
  icon: 'host:action.add',
})

// Each Room row resolves only its own embedded data, independent of ambient selection.
const alphaAtAlphaSelection = rowVisual(visualReplacement.collection, 'row-alpha')
const betaAtAlphaSelection = rowVisual(visualReplacement.collection, 'row-beta')
const alphaAtBetaSelection = rowVisual(visualReplacement.collection, 'row-alpha')
const betaAtBetaSelection = rowVisual(visualReplacement.collection, 'row-beta')
assert.deepEqual(alphaAtAlphaSelection, alphaAtBetaSelection)
assert.deepEqual(betaAtAlphaSelection, betaAtBetaSelection)
assert.notDeepEqual(alphaAtAlphaSelection, betaAtAlphaSelection)
assert.equal(alphaAtAlphaSelection.roomId, 'room-alpha')
assert.equal(betaAtAlphaSelection.roomId, 'room-beta')

// Whole revisions are monotonic and idempotent; stale or same-revision divergent data fails closed.
const beforeRejectedRevision = collectionOwner.read()
const sameReplay = collectionOwner.replace(beforeRejectedRevision)
assert.equal(sameReplay.accepted, true)
assert.equal(sameReplay.replayed, true)
const sameDivergent = structuredClone(beforeRejectedRevision)
sameDivergent.rows[0].leadingVisual.participants.reverse()
const divergentOutcome = collectionOwner.replace(sameDivergent)
assert.equal(divergentOutcome.accepted, false)
assert.equal(divergentOutcome.code, 'same-revision-divergent')
assert.deepEqual(collectionOwner.read(), beforeRejectedRevision)
const stale = structuredClone(beforeRejectedRevision)
stale.revision -= 1
const staleOutcome = collectionOwner.replace(stale)
assert.equal(staleOutcome.accepted, false)
assert.equal(staleOutcome.code, 'stale-revision')
assert.deepEqual(collectionOwner.read(), beforeRejectedRevision)

// A single invalid Room prevents the entire list replacement; no earlier row is partially mixed in.
const invalidWholeList = structuredClone(beforeRejectedRevision)
invalidWholeList.revision += 1
invalidWholeList.rows[0].leadingVisual.participants[0].avatar = { kind: 'asset', ref: 'asset:new-alpha' }
invalidWholeList.rows[1].leadingVisual.roomId = 'room-alpha'
const invalidWholeListOutcome = collectionOwner.replace(invalidWholeList)
assert.equal(invalidWholeListOutcome.accepted, false)
assert.equal(invalidWholeListOutcome.code, 'invalid-replacement')
assert.deepEqual(collectionOwner.read(), beforeRejectedRevision)

const validComposite = visualVector.countVectors[1]
for (
  const mutate of [
    visual => {
      visual.participants.push(structuredClone(visual.participants[0]))
    },
    visual => {
      visual.participants = Array.from(
        { length: 65 },
        (_, index) => ({
          participantId: `participant-${index}`,
          avatar: { kind: 'asset', ref: `asset:avatar-${index}` },
        }),
      )
    },
    visual => {
      visual.participants[0].avatar = { kind: 'asset', ref: 'https://example.test/avatar.png' }
    },
    visual => {
      visual.participants[0].avatar = { kind: 'asset', ref: 'file:/tmp/avatar.png' }
    },
    visual => {
      visual.participants[0].avatar = { kind: 'asset', ref: 'data:image/png;base64,AAAA' }
    },
    visual => {
      visual.participants[0].avatar = { kind: 'asset', ref: 'base64:AAAA' }
    },
    visual => {
      visual.participants[0].avatar.url = 'https://example.test/avatar.png'
    },
    visual => {
      visual.participants[0].avatar = { kind: 'remote', ref: 'asset:avatar-1' }
    },
    visual => {
      visual.callback = 'render'
    },
    visual => {
      visual.dom = '#avatar'
    },
    visual => {
      visual.css = '.avatar{}'
    },
    visual => {
      visual.currentSelection = 'room-count-1'
    },
    visual => {
      visual.title = 'inferred title'
    },
  ]
) {
  const invalid = structuredClone(validComposite)
  mutate(invalid)
  assert.notDeepEqual(leadingVisualErrors(invalid), [], 'unsafe or ambiguous leading visual must fail closed')
}

for (
  const mutate of [
    collection => {
      collection.rows[0].leadingVisual.roomId = 'room-beta'
    },
    collection => {
      collection.rows.at(-1).leadingVisual.icon = 'host:action.edit'
    },
  ]
) {
  const invalid = structuredClone(visualVector.visualCollection)
  mutate(invalid)
  assert.notDeepEqual(collectionErrors(invalid), [], 'row/visual association must fail closed')
}

// v2 has no settings or description seam and remains closed to v3 fields.
const v2SnapshotSchema = JSON.parse(
  await readFile(path.join(root, 'schemas', 'agent-conversation-shell-snapshot.v2.schema.json'), 'utf8'),
)
const v2CommonSchema = JSON.parse(
  await readFile(path.join(root, 'schemas', 'agent-conversation-shell-common.v2.schema.json'), 'utf8'),
)
const v2Ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true })
addFormats(v2Ajv)
for (
  const name of [
    'ui-common.v1.schema.json',
    'agent-avatar.v1.schema.json',
    'agent-loop-common.v1.schema.json',
    'agent-loop-common.v2.schema.json',
    'agent-loop-task-details-common.v2.schema.json',
  ]
) v2Ajv.addSchema(schemas.get(name))
v2Ajv.addSchema(v2CommonSchema)
v2Ajv.addSchema(v2SnapshotSchema)
const validateV2Snapshot = v2Ajv.getSchema(v2SnapshotSchema.$id)
const v2Wire = structuredClone(scenario.initialSnapshot)
v2Wire.$schema = v2SnapshotSchema.$id
v2Wire.contract = 'cordisx.agent-conversation-shell-snapshot/v2'
v2Wire.schemaVersion = 2
delete v2Wire.selection.description
assert.equal(validateV2Snapshot(v2Wire), true, v2Ajv.errorsText(validateV2Snapshot.errors))
const v2MessageWire = structuredClone(v2Wire)
const v2Conversation = structuredClone(messageVector.conversation)
delete v2Conversation.semantic
v2MessageWire.items.push(v2Conversation)
assert.equal(validateV2Snapshot(v2MessageWire), true, v2Ajv.errorsText(validateV2Snapshot.errors))
const migratedMessageWire = structuredClone(v2MessageWire)
migratedMessageWire.$schema = schemas.get('agent-conversation-shell-snapshot.v3.schema.json').$id
migratedMessageWire.contract = 'cordisx.agent-conversation-shell-snapshot/v3'
migratedMessageWire.schemaVersion = 3
migratedMessageWire.items.find(item => item.kind === 'message').semantic = { purpose: 'conversation' }
assert.deepEqual(messageSnapshotErrors(migratedMessageWire), [])
assert.equal(
  'semantic' in v2MessageWire.items.find(item => item.kind === 'message'),
  false,
  'v2 source must remain byte-closed while v3 migration adds conversation purpose',
)
v2Wire.selection.description = { state: 'empty' }
assert.equal(validateV2Snapshot(v2Wire), false, 'Shell v2 must reject the v3 description field')

console.log(
  'Agent conversation shell v3 conformance: Room settings, approvals, message semantics/self-introduction, atomic convergence, v2 message migration, and collection visual checks passed',
)
