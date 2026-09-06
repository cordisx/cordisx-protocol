import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { isDeepStrictEqual } from 'node:util'
import { fileURLToPath } from 'node:url'
import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'
import { cloneAgentAvatarRef } from '../../runtime/agent-avatar.v1.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
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

export {
  ajv,
  applyApprovalUpdate,
  applyMessageUpdate,
  approvalCommandContextErrors,
  approvalSnapshotErrors,
  approvalTransitionErrors,
  collectionErrors,
  createCollectionOwner,
  createOwner,
  exchangeErrors,
  leadingVisualErrors,
  messageSnapshotErrors,
  messageTransitionErrors,
  requestErrors,
  resultErrors,
  root,
  rowVisual,
  schemas,
  snapshotErrors,
  textErrors,
  validateItemSchema,
  validatePageSchema,
  vector,
}
