import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { isDeepStrictEqual } from 'node:util'
import { fileURLToPath } from 'node:url'
import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const schemaNames = [
  'ui-common.v1.schema.json',
  'platform-model.v1.schema.json',
  'agent-avatar.v1.schema.json',
  'agent-conversation-shell-common.v1.schema.json',
  'agent-loop-common.v1.schema.json',
  'agent-loop-common.v2.schema.json',
  'agent-loop-task-details-common.v2.schema.json',
  'agent-definition.v1.schema.json',
  'agent-loop-common.v4.schema.json',
  'agent-loop-task-binding.v4.schema.json',
  'agent-loop-command.v4.schema.json',
  'agent-loop-result.v4.schema.json',
  'agent-loop-event.v4.schema.json',
  'agent-loop-event-subscription.v4.schema.json',
  'agent-loop-event-page.v4.schema.json',
  'agent-loop-bound-client.v4.schema.json',
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
const validateBinding = validator('agent-loop-task-binding.v4.schema.json')
const validateCommand = validator('agent-loop-command.v4.schema.json')
const validateResult = validator('agent-loop-result.v4.schema.json')
const validateEvent = validator('agent-loop-event.v4.schema.json')
const validateSubscription = validator('agent-loop-event-subscription.v4.schema.json')
const validatePage = validator('agent-loop-event-page.v4.schema.json')
const validateClient = validator('agent-loop-bound-client.v4.schema.json')
const schemaErrors = validate => (validate.errors ?? []).map(error => `${error.instancePath || '/'} ${error.message}`)
const allowedIntroduction = { capability: 'turns.introduce', state: 'allowed', code: 'allowed' }

async function vector(relative) {
  return JSON.parse(await readFile(path.join(root, 'test-vectors', 'agent-loop-v4', relative), 'utf8'))
}

async function legacyVector(version, relative) {
  return JSON.parse(await readFile(path.join(root, 'test-vectors', `agent-loop-v${version}`, relative), 'utf8'))
}

const v4EnvelopeNames = new Set([
  'agent-loop-task-binding',
  'agent-loop-command',
  'agent-loop-result',
  'agent-loop-event',
  'agent-loop-event-subscription',
  'agent-loop-event-page',
  'agent-loop-bound-client',
])

function upgradeWire(value) {
  if (Array.isArray(value)) return value.map(upgradeWire)
  if (value === null || typeof value !== 'object') return value
  const next = Object.fromEntries(Object.entries(value).map(([key, child]) => [key, upgradeWire(child)]))
  const match = typeof next.$schema === 'string'
    ? next.$schema.match(/\/schemas\/(agent-loop-[a-z-]+)\.v[23]\.schema\.json$/)
    : undefined
  if (match !== undefined && match !== null && v4EnvelopeNames.has(match[1])) {
    next.$schema = next.$schema.replace(/\.v[23]\.schema\.json$/, '.v4.schema.json')
    next.contract = next.contract.replace(/\/v[23]$/, '/v4')
    next.schemaVersion = 4
    if (match[1] === 'agent-loop-bound-client') {
      next.operations = [
        'createOrBind',
        'send',
        'decideApproval',
        'requestMemberSelfIntroduction',
        'cancelMemberSelfIntroduction',
        'subscribe',
        'dispose',
      ]
    }
    if (match[1] === 'agent-loop-event' && next.type === 'message' && next.message.purpose === undefined) {
      next.message.purpose = 'conversation'
    }
  }
  return next
}

const bindingKey = value => `${value.binding.bindingId}\u0000${value.binding.generation}`

function introResultBase(command, status, authorization = allowedIntroduction, extra = {}) {
  return {
    $schema: schemas.get('agent-loop-result.v4.schema.json').$id,
    contract: 'cordisx.agent-loop-result/v4',
    schemaVersion: 4,
    commandId: command.commandId,
    type: command.type,
    status,
    authorization: structuredClone(authorization),
    ...extra,
  }
}

function exchangeErrors(command, result, events = []) {
  const errors = []
  if (!validateCommand(command)) errors.push(...schemaErrors(validateCommand))
  if (!validateResult(result)) errors.push(...schemaErrors(validateResult))
  for (const event of events) if (!validateEvent(event)) errors.push(...schemaErrors(validateEvent))
  if (errors.length > 0) return errors
  if (result.commandId !== command.commandId || result.type !== command.type) errors.push('result correlation drift')
  const isIntroduction = ['request-member-self-introduction', 'cancel-member-self-introduction'].includes(command.type)
  const isApproval = command.type === 'approval-decision'
  if (isIntroduction && result.authorization.capability !== 'turns.introduce') {
    errors.push('self-introduction authorization capability drift')
  }
  if (!isIntroduction && !isApproval && result.causation !== undefined) {
    errors.push('legacy accepted result acquired causation')
  }
  if (result.status !== 'accepted') {
    if (result.causation !== undefined) errors.push('non-accepted result acquired causation')
    return errors
  }
  if (isIntroduction) {
    if (result.causation?.operationId !== command.commandId) {
      errors.push('accepted self-introduction result causation drift')
    }
    if (!isDeepStrictEqual(result.binding, command.binding)) errors.push('self-introduction accepted binding drift')
    for (const field of ['participantId', 'memberId', 'runId']) {
      if (result[field] !== command[field]) errors.push(`self-introduction accepted ${field} drift`)
    }
    if (result.turn === undefined || result.messageId === undefined || result.delivery === undefined) {
      errors.push('self-introduction accepted identity is incomplete')
    }
    if (
      command.type === 'cancel-member-self-introduction' && result.requestOperationId !== command.requestOperationId
    ) errors.push('self-introduction cancel target drift')
    for (const event of events) {
      if (!isDeepStrictEqual(event.binding, command.binding.binding)) {
        errors.push('self-introduction event binding drift')
      }
      if (!isDeepStrictEqual(event.causation, result.causation)) {
        errors.push('self-introduction event/result causation drift')
      }
      if (event.turn !== result.turn) errors.push('self-introduction event/result turn drift')
    }
    if (command.type === 'request-member-self-introduction') {
      if (!events.some(event => event.type === 'lifecycle' && event.lifecycle.phase === 'turn.started')) {
        errors.push('self-introduction start event is absent')
      }
      const messages = events.filter(event => event.type === 'message')
      const failure = events.find(event => event.type === 'lifecycle' && event.lifecycle.phase === 'turn.failed')
      const completed = events.some(event => event.type === 'lifecycle' && event.lifecycle.phase === 'turn.completed')
      if (failure !== undefined) {
        if (messages.length !== 0 || completed) errors.push('failed self-introduction emitted a message or completion')
        if (typeof failure.lifecycle.failure.retryable !== 'boolean') {
          errors.push('failed self-introduction omitted retryability')
        }
      } else if (completed) {
        if (messages.length !== 1) errors.push('self-introduction did not produce exactly one assistant message')
        const message = messages[0]
        if (message?.message.role !== 'assistant' || message?.message.purpose !== 'member-self-introduction') {
          errors.push('self-introduction message role or purpose drift')
        }
        if (message?.message.messageId !== result.messageId) errors.push('self-introduction message identity drift')
        if (
          message?.message.content.length !== 1 || message.message.content[0].kind !== 'text'
          || message.message.content[0].text.length === 0
        ) errors.push('self-introduction did not emit one non-empty free-text block')
      } else if (events.length !== 1) errors.push('pending self-introduction emitted more than its start event')
      if (events.some(event => event.type === 'message' && event.message.role === 'user')) {
        errors.push('self-introduction emitted a synthetic user trigger')
      }
    } else {
      if (events.length !== 1 || events[0].type !== 'lifecycle' || events[0].lifecycle.phase !== 'turn.cancelled') {
        errors.push('accepted cancellation did not emit exactly one cancellation lifecycle event')
      }
    }
  } else if (command.type === 'create-or-bind') {
    if (result.binding === undefined || result.detailsUrl === undefined || result.delivery === undefined) {
      errors.push('accepted create/bind lost its v3 result fields')
    }
  } else if (command.type === 'send') {
    if (
      result.binding === undefined || result.turn === undefined || result.messageId === undefined
      || result.delivery === undefined
    ) errors.push('accepted send lost its v3 result fields')
    if (!isDeepStrictEqual(result.binding, command.binding)) errors.push('accepted send binding drift')
  } else if (command.type === 'approval-decision') {
    if (
      result.binding === undefined || result.turn !== command.turn || result.approvalId !== command.approvalId
      || result.decision !== command.decision || result.delivery === undefined
    ) errors.push('accepted approval result drift')
    if (result.causation?.operationId !== command.commandId) errors.push('accepted approval result causation drift')
    if (!isDeepStrictEqual(result.binding, command.binding)) errors.push('accepted approval binding drift')
    for (const event of events) {
      if (!isDeepStrictEqual(event.binding, command.binding.binding)) errors.push('resolved approval binding drift')
      if (
        event.turn !== result.turn || event.approval?.approvalId !== result.approvalId
        || event.approval?.outcome !== result.decision
      ) errors.push('resolved approval tuple drift')
      if (!isDeepStrictEqual(event.causation, result.causation)) errors.push('approval event/result causation drift')
    }
  }
  return errors
}

function approvalTraceErrors(command, result, event, pending) {
  const errors = exchangeErrors(command, result, event === undefined ? [] : [event])
  if (errors.length > 0 || result.status !== 'accepted') return errors
  if (event === undefined || event.type !== 'approval' || event.approval.state !== 'resolved') {
    errors.push('accepted approval omitted its resolved event')
  } else if (pending !== undefined) {
    if (!isDeepStrictEqual(event.binding, pending.binding)) errors.push('resolved approval escaped pending binding')
    if (
      event.turn !== pending.turn || event.approval.approvalId !== pending.approval.approvalId
      || event.approval.kind !== pending.approval.kind
    ) errors.push('resolved approval drifted from exact pending tuple')
  }
  return errors
}

function createApprovalOwner(bindings, pendingEvents) {
  const knownBindings = new Map(bindings.map(binding => [bindingKey(binding), structuredClone(binding)]))
  const approvalKey = (binding, turn, approvalId) => `${bindingKey(binding)}\u0000${turn}\u0000${approvalId}`
  const approvals = new Map(
    pendingEvents.map(
      event => [approvalKey({ binding: event.binding }, event.turn, event.approval.approvalId), {
        pending: structuredClone(event),
        state: event.approval.state,
        available: true,
      }],
    ),
  )
  const ledger = new Map()
  let sideEffectCount = 0
  let providerState = 'current'
  let forcedCode
  let authorization = { capability: 'approvals.decide', state: 'allowed', code: 'allowed' }

  function resultBase(command, status, extra = {}) {
    return {
      $schema: schemas.get('agent-loop-result.v4.schema.json').$id,
      contract: 'cordisx.agent-loop-result/v4',
      schemaVersion: 4,
      commandId: command.commandId,
      type: 'approval-decision',
      status,
      authorization: structuredClone(authorization),
      ...extra,
    }
  }

  function decide(command, clientId) {
    if (!validateCommand(command)) return { errors: schemaErrors(validateCommand) }
    const remembered = ledger.get(command.commandId)
    if (remembered !== undefined) {
      if (!isDeepStrictEqual(remembered.command, command)) {
        const result = resultBase(command, 'conflict', { code: 'operation-conflict' })
        return { result, errors: exchangeErrors(command, result), sideEffectCount }
      }
      const result = structuredClone(remembered.result)
      if (result.status === 'accepted') {
        result.delivery.disposition = remembered.clientId === clientId
          ? 'replayed'
          : 'reconciled'
      }
      return {
        result,
        event: structuredClone(remembered.event),
        errors: approvalTraceErrors(command, result, remembered.event, remembered.pending),
        sideEffectCount,
      }
    }
    let result
    let event
    let pending
    const known = knownBindings.get(bindingKey(command.binding))
    if (authorization.state === 'denied') result = resultBase(command, 'denied')
    else if (authorization.state === 'unavailable') result = resultBase(command, 'unavailable')
    else if (known === undefined) result = resultBase(command, 'conflict', { code: 'binding-conflict' })
    else if (known.state === 'closed') result = resultBase(command, 'unavailable', { code: 'binding-closed' })
    else if (!isDeepStrictEqual(known, command.binding)) {
      result = resultBase(command, 'conflict', { code: 'binding-conflict' })
    } else if (providerState === 'replaced') result = resultBase(command, 'unavailable', { code: 'provider-replaced' })
    else if (forcedCode !== undefined) result = resultBase(command, 'unavailable', { code: forcedCode })
    else {
      const approval = approvals.get(approvalKey(command.binding, command.turn, command.approvalId))
      pending = approval?.pending
      if (approval === undefined) result = resultBase(command, 'conflict', { code: 'approval-conflict' })
      else if (approval.state === 'expired') result = resultBase(command, 'unavailable', { code: 'approval-expired' })
      else if (approval.state !== 'pending') result = resultBase(command, 'conflict', { code: 'approval-conflict' })
      else if (!approval.available) result = resultBase(command, 'unavailable', { code: 'approval-unavailable' })
      else {
        approval.state = 'resolved'
        sideEffectCount += 1
        result = resultBase(command, 'accepted', {
          binding: structuredClone(command.binding),
          turn: command.turn,
          approvalId: command.approvalId,
          decision: command.decision,
          causation: { operationId: command.commandId },
          delivery: { disposition: 'executed' },
        })
        event = {
          $schema: schemas.get('agent-loop-event.v4.schema.json').$id,
          contract: 'cordisx.agent-loop-event/v4',
          schemaVersion: 4,
          eventId: `event-resolved-${command.commandId}`,
          binding: structuredClone(command.binding.binding),
          sequence: approval.pending.sequence + 1,
          occurredAt: '2026-08-31T12:00:00.000Z',
          causation: structuredClone(result.causation),
          type: 'approval',
          turn: command.turn,
          approval: {
            approvalId: command.approvalId,
            kind: approval.pending.approval.kind,
            state: 'resolved',
            outcome: command.decision,
          },
        }
      }
    }
    ledger.set(command.commandId, {
      command: structuredClone(command),
      result: structuredClone(result),
      event: structuredClone(event),
      pending: structuredClone(pending),
      clientId,
    })
    return { result, event, errors: approvalTraceErrors(command, result, event, pending), sideEffectCount }
  }

  return {
    decide,
    sideEffectCount: () => sideEffectCount,
    setProviderState(value) {
      providerState = value
    },
    setForcedCode(value) {
      forcedCode = value
    },
    setAuthorization(value) {
      authorization = structuredClone(value)
    },
    setApprovalState(command, value) {
      approvals.get(approvalKey(command.binding, command.turn, command.approvalId)).state = value
    },
    setApprovalAvailable(command, value) {
      approvals.get(approvalKey(command.binding, command.turn, command.approvalId)).available = value
    },
  }
}

function eventBase(command, turn, eventId, sequence) {
  return {
    $schema: schemas.get('agent-loop-event.v4.schema.json').$id,
    contract: 'cordisx.agent-loop-event/v4',
    schemaVersion: 4,
    eventId,
    binding: structuredClone(command.binding.binding),
    sequence,
    occurredAt: `2026-08-31T11:00:0${sequence}.000Z`,
    causation: { operationId: command.commandId },
    turn,
  }
}

function createIntroductionOwner(bindings, registeredCommands, privateInputs) {
  const knownBindings = new Map(bindings.map(binding => [bindingKey(binding), structuredClone(binding)]))
  const associationByBinding = new Map(
    registeredCommands.map(
      command => [bindingKey(command.binding), {
        participantId: command.participantId,
        memberId: command.memberId,
        runId: command.runId,
      }],
    ),
  )
  const privateByParticipant = new Map(privateInputs.map(input => [input.participantId, structuredClone(input)]))
  const ledger = new Map()
  const introductions = new Map()
  let generationCount = 0
  let cancellationCount = 0
  let providerState = 'current'
  let forcedCode
  let authorization = structuredClone(allowedIntroduction)

  function replay(command, clientId, remembered) {
    if (!isDeepStrictEqual(remembered.command, command)) {
      const result = introResultBase(command, 'conflict', allowedIntroduction, { code: 'operation-conflict' })
      return { result, events: [], errors: exchangeErrors(command, result), generationCount, cancellationCount }
    }
    const result = structuredClone(remembered.result)
    if (result.status === 'accepted') {
      result.delivery.disposition = remembered.clientId === clientId
        ? 'replayed'
        : 'reconciled'
    }
    return {
      result,
      events: structuredClone(remembered.events),
      errors: exchangeErrors(command, result, remembered.events),
      generationCount,
      cancellationCount,
    }
  }

  function preflight(command) {
    if (authorization.state === 'denied') return introResultBase(command, 'denied', authorization)
    if (authorization.state === 'unavailable') return introResultBase(command, 'unavailable', authorization)
    const authoritative = knownBindings.get(bindingKey(command.binding))
    if (authoritative === undefined) {
      return introResultBase(command, 'conflict', allowedIntroduction, { code: 'binding-conflict' })
    }
    if (authoritative.state === 'closed') {
      return introResultBase(command, 'unavailable', allowedIntroduction, { code: 'binding-closed' })
    }
    if (!isDeepStrictEqual(authoritative, command.binding)) {
      return introResultBase(command, 'conflict', allowedIntroduction, { code: 'binding-conflict' })
    }
    if (providerState === 'replaced') {
      return introResultBase(command, 'unavailable', allowedIntroduction, { code: 'provider-replaced' })
    }
    if (forcedCode !== undefined) {
      return introResultBase(command, 'unavailable', allowedIntroduction, { code: forcedCode })
    }
    const association = associationByBinding.get(bindingKey(command.binding))
    if (
      association === undefined || association.participantId !== command.participantId
      || association.memberId !== command.memberId
    ) return introResultBase(command, 'conflict', allowedIntroduction, { code: 'member-conflict' })
    if (association.runId !== command.runId) {
      return introResultBase(command, 'conflict', allowedIntroduction, { code: 'run-conflict' })
    }
  }

  function request(command, clientId, options = {}) {
    if (!validateCommand(command)) return { errors: schemaErrors(validateCommand) }
    const remembered = ledger.get(command.commandId)
    if (remembered !== undefined) return replay(command, clientId, remembered)
    const failed = preflight(command)
    if (failed !== undefined) {
      ledger.set(command.commandId, {
        command: structuredClone(command),
        result: structuredClone(failed),
        events: [],
        clientId,
      })
      return { result: failed, events: [], errors: exchangeErrors(command, failed), generationCount, cancellationCount }
    }
    const providerInput = privateByParticipant.get(command.participantId)
    if (
      providerInput === undefined || !isDeepStrictEqual(providerInput.definition.identity, command.binding.definition)
    ) {
      const result = introResultBase(command, 'unavailable', allowedIntroduction, { code: 'introduction-unavailable' })
      return { result, events: [], errors: exchangeErrors(command, result), generationCount, cancellationCount }
    }
    const turn = `turn-${command.commandId}`
    const messageId = `message-${command.commandId}`
    const result = introResultBase(command, 'accepted', allowedIntroduction, {
      binding: structuredClone(command.binding),
      participantId: command.participantId,
      memberId: command.memberId,
      runId: command.runId,
      turn,
      messageId,
      causation: { operationId: command.commandId },
      delivery: { disposition: 'executed' },
    })
    generationCount += 1
    const events = [{
      ...eventBase(command, turn, `event-${command.commandId}-started`, 1),
      type: 'lifecycle',
      lifecycle: { phase: 'turn.started' },
    }]
    let state = 'pending'
    if (!options.defer && options.fail) {
      events.push({
        ...eventBase(command, turn, `event-${command.commandId}-failed`, 2),
        type: 'lifecycle',
        lifecycle: { phase: 'turn.failed', failure: { code: 'INTRODUCTION_GENERATION_FAILED', retryable: true } },
      })
      state = 'failed'
    } else if (!options.defer) {
      events.push({
        ...eventBase(command, turn, `event-${command.commandId}-message`, 2),
        type: 'message',
        message: {
          messageId,
          role: 'assistant',
          purpose: 'member-self-introduction',
          content: [{ kind: 'text', text: providerInput.providerAuthoredMessage }],
        },
      })
      events.push({
        ...eventBase(command, turn, `event-${command.commandId}-completed`, 3),
        type: 'lifecycle',
        lifecycle: { phase: 'turn.completed' },
      })
      state = 'completed'
    }
    introductions.set(command.commandId, { command: structuredClone(command), result: structuredClone(result), state })
    ledger.set(command.commandId, {
      command: structuredClone(command),
      result: structuredClone(result),
      events: structuredClone(events),
      clientId,
    })
    return { result, events, errors: exchangeErrors(command, result, events), generationCount, cancellationCount }
  }

  function cancel(command, clientId) {
    if (!validateCommand(command)) return { errors: schemaErrors(validateCommand) }
    const remembered = ledger.get(command.commandId)
    if (remembered !== undefined) return replay(command, clientId, remembered)
    const failed = preflight(command)
    if (failed !== undefined) {
      ledger.set(command.commandId, {
        command: structuredClone(command),
        result: structuredClone(failed),
        events: [],
        clientId,
      })
      return { result: failed, events: [], errors: exchangeErrors(command, failed), generationCount, cancellationCount }
    }
    const introduction = introductions.get(command.requestOperationId)
    let result
    let events = []
    if (introduction === undefined) {
      result = introResultBase(command, 'unavailable', allowedIntroduction, { code: 'introduction-not-found' })
    } else if (
      !['participantId', 'memberId', 'runId'].every(field => introduction.command[field] === command[field])
      || !isDeepStrictEqual(introduction.command.binding, command.binding)
    ) result = introResultBase(command, 'conflict', allowedIntroduction, { code: 'introduction-conflict' })
    else if (introduction.state === 'completed') {
      result = introResultBase(command, 'conflict', allowedIntroduction, { code: 'introduction-completed' })
    } else if (introduction.state === 'cancelled') {
      result = introResultBase(command, 'conflict', allowedIntroduction, { code: 'introduction-cancelled' })
    } else if (introduction.state !== 'pending') {
      result = introResultBase(command, 'conflict', allowedIntroduction, { code: 'introduction-conflict' })
    } else {
      introduction.state = 'cancelled'
      cancellationCount += 1
      result = introResultBase(command, 'accepted', allowedIntroduction, {
        binding: structuredClone(command.binding),
        participantId: command.participantId,
        memberId: command.memberId,
        runId: command.runId,
        requestOperationId: command.requestOperationId,
        turn: introduction.result.turn,
        messageId: introduction.result.messageId,
        causation: { operationId: command.commandId },
        delivery: { disposition: 'executed' },
      })
      events = [{
        ...eventBase(command, result.turn, `event-${command.commandId}-cancelled`, 2),
        type: 'lifecycle',
        lifecycle: { phase: 'turn.cancelled' },
      }]
    }
    ledger.set(command.commandId, {
      command: structuredClone(command),
      result: structuredClone(result),
      events: structuredClone(events),
      clientId,
    })
    return { result, events, errors: exchangeErrors(command, result, events), generationCount, cancellationCount }
  }

  return {
    request,
    cancel,
    counts: () => ({ generationCount, cancellationCount }),
    setProviderState(value) {
      providerState = value
    },
    setForcedCode(value) {
      forcedCode = value
    },
    setAuthorization(value) {
      authorization = structuredClone(value)
    },
  }
}

// V4 preserves the V3 create/send data plane exactly: no result causation was added.
const completeV2 = upgradeWire(await legacyVector(2, 'valid/complete.json'))
assert.equal(validateClient(completeV2.client), true, ajv.errorsText(validateClient.errors))
assert.equal(validateBinding(completeV2.binding), true, ajv.errorsText(validateBinding.errors))
assert.deepEqual(exchangeErrors(completeV2.createCommand, completeV2.createResult), [])
assert.deepEqual(exchangeErrors(completeV2.sendCommand, completeV2.sendResult), [])
assert.equal(completeV2.createResult.causation, undefined)
assert.equal(completeV2.sendResult.causation, undefined)
for (const page of completeV2.pages) {
  // Legacy v2 resolved approvals without durable decision causation are not
  // fabricated during compatibility migration.
  page.events = page.events.filter(event =>
    !(event.type === 'approval' && event.approval.state === 'resolved' && event.approval.outcome !== 'expired'
      && event.causation === undefined)
  )
  assert.equal(validateSubscription(page.subscription), true, ajv.errorsText(validateSubscription.errors))
  assert.equal(validatePage(page), true, ajv.errorsText(validatePage.errors))
  assert.ok(
    page.events.every(event => isDeepStrictEqual(event.binding, page.subscription.binding)),
    'legacy subscription escaped its exact binding generation',
  )
}

const idempotentV2 = upgradeWire(await legacyVector(2, 'valid/idempotent-commands.json'))
for (const exchange of idempotentV2.exchanges) assert.deepEqual(exchangeErrors(exchange.command, exchange.result), [])
for (
  const [first, replay] of [[idempotentV2.exchanges[0], idempotentV2.exchanges[1]], [
    idempotentV2.exchanges[2],
    idempotentV2.exchanges[3],
  ]]
) {
  assert.deepEqual(first.command, replay.command)
  assert.equal(first.result.delivery.disposition, 'executed')
  assert.equal(replay.result.delivery.disposition, 'replayed')
  assert.equal(first.result.causation, undefined)
  assert.equal(replay.result.causation, undefined)
  if (first.command.type === 'send') {
    assert.equal(replay.result.turn, first.result.turn)
    assert.equal(replay.result.messageId, first.result.messageId)
  }
}

const approvalScenario = await vector('valid/approval-decision-result-causation.json')
assert.equal(validateBinding(approvalScenario.binding), true, ajv.errorsText(validateBinding.errors))
assert.equal(validateEvent(approvalScenario.pendingEvent), true, ajv.errorsText(validateEvent.errors))
assert.equal(validateCommand(approvalScenario.command), true, ajv.errorsText(validateCommand.errors))
assert.deepEqual(
  approvalTraceErrors(
    approvalScenario.command,
    approvalScenario.acceptedResult,
    approvalScenario.resolvedEvent,
    approvalScenario.pendingEvent,
  ),
  [],
)
assert.equal(approvalScenario.acceptedResult.causation.operationId, approvalScenario.command.commandId)
assert.deepEqual(approvalScenario.resolvedEvent.causation, approvalScenario.acceptedResult.causation)

for (const decision of ['approved', 'denied', 'cancelled']) {
  const command = structuredClone(approvalScenario.command)
  command.commandId = `operation-${decision}`
  command.approvalId = `approval-${decision}`
  command.decision = decision
  const pendingEvent = structuredClone(approvalScenario.pendingEvent)
  pendingEvent.eventId = `event-pending-${decision}`
  pendingEvent.approval.approvalId = command.approvalId
  const isolated = createApprovalOwner([approvalScenario.binding], [pendingEvent])
  const outcome = isolated.decide(command, 'approval-client')
  assert.deepEqual(outcome.errors, [])
  assert.equal(outcome.result.status, 'accepted')
  assert.equal(outcome.result.decision, decision)
  assert.equal(outcome.result.causation.operationId, command.commandId)
  assert.equal(outcome.event.approval.outcome, decision)
  assert.deepEqual(outcome.event.causation, outcome.result.causation)
  assert.equal(isolated.sideEffectCount(), 1)
}

const approvalOwner = createApprovalOwner([approvalScenario.binding], [approvalScenario.pendingEvent])
const approvalExecuted = approvalOwner.decide(approvalScenario.command, 'approval-client')
assert.deepEqual(approvalExecuted.errors, [])
assert.equal(approvalExecuted.result.delivery.disposition, 'executed')
assert.equal(approvalOwner.sideEffectCount(), 1)
const approvalReplay = approvalOwner.decide(approvalScenario.command, 'approval-client')
assert.deepEqual(approvalReplay.errors, [])
assert.equal(approvalReplay.result.delivery.disposition, 'replayed')
assert.deepEqual(approvalReplay.result.causation, approvalExecuted.result.causation)
assert.deepEqual(approvalReplay.event, approvalExecuted.event)
assert.equal(approvalOwner.sideEffectCount(), 1, 'approval replay performed a second side effect')
const approvalReconcile = approvalOwner.decide(approvalScenario.command, 'approval-client-after-reload')
assert.deepEqual(approvalReconcile.errors, [])
assert.equal(approvalReconcile.result.delivery.disposition, 'reconciled')
assert.deepEqual(approvalReconcile.result.causation, approvalExecuted.result.causation)
assert.deepEqual(approvalReconcile.event, approvalExecuted.event)
assert.equal(approvalOwner.sideEffectCount(), 1, 'approval reconciliation performed a second side effect')

const approvalInvalidVector = await vector('invalid/approval-decision-result-causation.json')
const approvalInvalidCases = new Map(approvalInvalidVector.cases.map(value => [value.mutation, value]))
function expectApprovalOutcome(outcome, mutation) {
  const expected = approvalInvalidCases.get(mutation)
  assert.deepEqual(outcome.errors, [])
  assert.equal(outcome.result.status, expected.expectedStatus)
  assert.equal(outcome.result.code, expected.expectedCode)
  assert.equal(outcome.result.causation, undefined)
}

const missingApprovalCausation = structuredClone(approvalScenario.acceptedResult)
delete missingApprovalCausation.causation
assert.equal(validateResult(missingApprovalCausation), false, 'accepted approval result must require causation')
const wrongApprovalCausation = structuredClone(approvalScenario.acceptedResult)
wrongApprovalCausation.causation.operationId = 'other-operation'
assert.notDeepEqual(
  approvalTraceErrors(
    approvalScenario.command,
    wrongApprovalCausation,
    approvalScenario.resolvedEvent,
    approvalScenario.pendingEvent,
  ),
  [],
)
const driftedApprovalEvent = structuredClone(approvalScenario.resolvedEvent)
driftedApprovalEvent.causation.operationId = 'other-operation'
assert.notDeepEqual(
  approvalTraceErrors(
    approvalScenario.command,
    approvalScenario.acceptedResult,
    driftedApprovalEvent,
    approvalScenario.pendingEvent,
  ),
  [],
)
const kindDriftEvent = structuredClone(approvalScenario.resolvedEvent)
kindDriftEvent.approval.kind = 'file-change'
assert.notDeepEqual(
  approvalTraceErrors(
    approvalScenario.command,
    approvalScenario.acceptedResult,
    kindDriftEvent,
    approvalScenario.pendingEvent,
  ),
  [],
)

for (
  const [mutation, mutate] of [
    ['binding-id', command => {
      command.binding.binding.bindingId = 'other-binding'
    }],
    ['binding-generation', command => {
      command.binding.binding.generation += 1
    }],
    ['binding-task', command => {
      command.binding.task = 'other-task'
    }],
    ['binding-definition', command => {
      command.binding.definition.revision = 'other-definition'
    }],
    ['consumer-binding-state', command => {
      command.binding.state = 'closed'
    }],
    ['turn', command => {
      command.turn = 'wrong-turn'
    }],
    ['approval-id', command => {
      command.approvalId = 'wrong-approval'
    }],
  ]
) {
  const isolated = createApprovalOwner([approvalScenario.binding], [approvalScenario.pendingEvent])
  const command = structuredClone(approvalScenario.command)
  command.commandId = `operation-${mutation}`
  mutate(command)
  expectApprovalOutcome(isolated.decide(command, 'approval-client'), mutation)
  assert.equal(isolated.sideEffectCount(), 0)
}

const closedBinding = structuredClone(approvalScenario.binding)
closedBinding.state = 'closed'
const closedCommand = structuredClone(approvalScenario.command)
closedCommand.commandId = 'operation-authoritative-binding-closed'
const closedOwner = createApprovalOwner([closedBinding], [approvalScenario.pendingEvent])
const closedApprovalOutcome = closedOwner.decide(closedCommand, 'approval-client')
expectApprovalOutcome(closedApprovalOutcome, 'authoritative-binding-closed')
assert.equal(closedApprovalOutcome.event, undefined)
assert.equal(closedOwner.sideEffectCount(), 0)

const notPendingOwner = createApprovalOwner([approvalScenario.binding], [approvalScenario.pendingEvent])
notPendingOwner.setApprovalState(approvalScenario.command, 'resolved')
const notPendingCommand = structuredClone(approvalScenario.command)
notPendingCommand.commandId = 'operation-not-pending'
expectApprovalOutcome(notPendingOwner.decide(notPendingCommand, 'approval-client'), 'not-pending')
assert.equal(notPendingOwner.sideEffectCount(), 0)

const divergentApprovalCommand = structuredClone(approvalScenario.command)
divergentApprovalCommand.decision = 'denied'
expectApprovalOutcome(
  approvalOwner.decide(divergentApprovalCommand, 'approval-client'),
  'same-operation-different-decision',
)
assert.equal(approvalOwner.sideEffectCount(), 1)

for (
  const [mutation, prepare] of [
    ['approval-expired', isolated => isolated.setApprovalState(approvalScenario.command, 'expired')],
    ['approval-unavailable', isolated => isolated.setApprovalAvailable(approvalScenario.command, false)],
    ['provider-replaced', isolated => isolated.setProviderState('replaced')],
    ['operation-expired', isolated => isolated.setForcedCode('operation-expired')],
    ['reconciliation-required', isolated => isolated.setForcedCode('reconciliation-required')],
  ]
) {
  const isolated = createApprovalOwner([approvalScenario.binding], [approvalScenario.pendingEvent])
  prepare(isolated)
  const command = structuredClone(approvalScenario.command)
  command.commandId = `operation-${mutation}`
  expectApprovalOutcome(isolated.decide(command, 'approval-client'), mutation)
  assert.equal(isolated.sideEffectCount(), 0)
}

for (
  const authorization of [
    { capability: 'approvals.decide', state: 'denied', code: 'policy-denied' },
    { capability: 'approvals.decide', state: 'unavailable', code: 'host-unavailable' },
  ]
) {
  const isolated = createApprovalOwner([approvalScenario.binding], [approvalScenario.pendingEvent])
  isolated.setAuthorization(authorization)
  const command = structuredClone(approvalScenario.command)
  command.commandId = `operation-approval-auth-${authorization.state}`
  const outcome = isolated.decide(command, 'approval-client')
  assert.deepEqual(outcome.errors, [])
  assert.equal(outcome.result.status, authorization.state)
  assert.deepEqual(outcome.result.authorization, authorization)
  assert.equal(outcome.result.causation, undefined)
  assert.equal(isolated.sideEffectCount(), 0)
}

const scenario = await vector('valid/member-self-introduction-result-causation.json')
for (const binding of scenario.bindings) {
  assert.equal(validateBinding(binding), true, ajv.errorsText(validateBinding.errors))
}
for (const command of [...scenario.requestCommands, scenario.cancelCommand]) {
  assert.equal(validateCommand(command), true, ajv.errorsText(validateCommand.errors))
}
for (const [index, result] of scenario.acceptedRequestResults.entries()) {
  assert.deepEqual(exchangeErrors(scenario.requestCommands[index], result, scenario.requestEvents[index]), [])
  assert.equal(result.causation.operationId, result.commandId)
  assert.ok(scenario.requestEvents[index].every(event => isDeepStrictEqual(event.causation, result.causation)))
}
assert.deepEqual(exchangeErrors(scenario.cancelCommand, scenario.acceptedCancelResult, [scenario.cancelEvent]), [])
assert.equal(scenario.acceptedCancelResult.requestOperationId, scenario.cancelCommand.requestOperationId)
assert.equal(scenario.acceptedCancelResult.causation.operationId, scenario.cancelCommand.commandId)
assert.notEqual(scenario.acceptedCancelResult.causation.operationId, scenario.cancelCommand.requestOperationId)

const commandWire = JSON.stringify(scenario.requestCommands)
for (const providerInput of scenario.providerPrivateInputs) {
  for (
    const privateValue of [
      providerInput.definition.introduction,
      providerInput.definition.personality,
      providerInput.definition.role,
      ...providerInput.definition.capabilities,
      providerInput.providerAuthoredMessage,
    ]
  ) {
    assert.equal(
      commandWire.includes(privateValue),
      false,
      'provider-private definition input leaked into the consumer command',
    )
  }
}
const forbiddenWireFields = await legacyVector(3, 'invalid/member-self-introduction-wire-fields.json')
for (const field of forbiddenWireFields.fields) {
  const invalid = structuredClone(scenario.requestCommands[0])
  invalid[field] = field === 'issuedAt' ? '2026-08-31T00:00:00.000Z' : 'provider-private'
  assert.equal(validateCommand(invalid), false, `self-introduction command must reject ${field}`)
}

const owner = createIntroductionOwner(scenario.bindings, scenario.requestCommands, scenario.providerPrivateInputs)
const reviewerCommand = scenario.requestCommands[0]
const reviewerExecuted = owner.request(reviewerCommand, 'client-a')
assert.deepEqual(reviewerExecuted.errors, [])
assert.equal(reviewerExecuted.result.status, 'accepted')
assert.equal(reviewerExecuted.result.delivery.disposition, 'executed')
assert.equal(reviewerExecuted.result.causation.operationId, reviewerCommand.commandId)
assert.deepEqual(reviewerExecuted.events.map(event => event.lifecycle?.phase ?? event.message?.purpose), [
  'turn.started',
  'member-self-introduction',
  'turn.completed',
])
assert.deepEqual(owner.counts(), { generationCount: 1, cancellationCount: 0 })

const reviewerReplay = owner.request(reviewerCommand, 'client-a')
assert.deepEqual(reviewerReplay.errors, [])
assert.equal(reviewerReplay.result.delivery.disposition, 'replayed')
assert.equal(reviewerReplay.result.turn, reviewerExecuted.result.turn)
assert.equal(reviewerReplay.result.messageId, reviewerExecuted.result.messageId)
assert.deepEqual(reviewerReplay.result.causation, reviewerExecuted.result.causation)
assert.deepEqual(reviewerReplay.events, reviewerExecuted.events)
assert.deepEqual(owner.counts(), { generationCount: 1, cancellationCount: 0 })

const reviewerReconcile = owner.request(reviewerCommand, 'client-after-reload')
assert.deepEqual(reviewerReconcile.errors, [])
assert.equal(reviewerReconcile.result.delivery.disposition, 'reconciled')
assert.equal(reviewerReconcile.result.turn, reviewerExecuted.result.turn)
assert.equal(reviewerReconcile.result.messageId, reviewerExecuted.result.messageId)
assert.deepEqual(reviewerReconcile.result.causation, reviewerExecuted.result.causation)
assert.deepEqual(owner.counts(), { generationCount: 1, cancellationCount: 0 })

const divergent = structuredClone(reviewerCommand)
divergent.runId = 'run-divergent'
const divergentOutcome = owner.request(divergent, 'client-a')
assert.deepEqual(divergentOutcome.errors, [])
assert.equal(divergentOutcome.result.status, 'conflict')
assert.equal(divergentOutcome.result.code, 'operation-conflict')
assert.equal(divergentOutcome.result.causation, undefined)
assert.deepEqual(owner.counts(), { generationCount: 1, cancellationCount: 0 })

const writerExecuted = owner.request(scenario.requestCommands[1], 'client-a')
assert.deepEqual(writerExecuted.errors, [])
assert.notEqual(writerExecuted.result.turn, reviewerExecuted.result.turn)
assert.notEqual(writerExecuted.result.messageId, reviewerExecuted.result.messageId)
assert.notDeepEqual(writerExecuted.result.causation, reviewerExecuted.result.causation)
assert.deepEqual(owner.counts(), { generationCount: 2, cancellationCount: 0 })

const invalidVector = await vector('invalid/member-self-introduction-result-causation.json')
const introductionBindingCases = new Map(invalidVector.bindingCases.map(value => [value.mutation, value]))
for (
  const [mutation, mutate] of [
    ['binding-id', command => {
      command.binding.binding.bindingId = 'other-binding'
    }],
    ['binding-generation', command => {
      command.binding.binding.generation += 1
    }],
    ['binding-task', command => {
      command.binding.task = 'other-task'
    }],
    ['binding-definition', command => {
      command.binding.definition.revision = 'other-definition'
    }],
    ['consumer-binding-state', command => {
      command.binding.state = 'closed'
    }],
    ['member-conflict', command => {
      command.memberId = 'other-member'
    }],
    ['run-conflict', command => {
      command.runId = 'other-run'
    }],
  ]
) {
  const isolated = createIntroductionOwner(scenario.bindings, scenario.requestCommands, scenario.providerPrivateInputs)
  const command = structuredClone(reviewerCommand)
  command.commandId = `operation-${mutation}`
  mutate(command)
  const outcome = isolated.request(command, 'client-a')
  assert.deepEqual(outcome.errors, [])
  assert.equal(outcome.result.status, 'conflict')
  const expected = introductionBindingCases.get(mutation)
  assert.equal(outcome.result.code, expected?.expectedCode ?? mutation)
  assert.equal(outcome.result.causation, undefined)
  assert.deepEqual(isolated.counts(), { generationCount: 0, cancellationCount: 0 })
}

const closedIntroductionBindings = structuredClone(scenario.bindings)
closedIntroductionBindings[0].state = 'closed'
const closedIntroductionOwner = createIntroductionOwner(
  closedIntroductionBindings,
  scenario.requestCommands,
  scenario.providerPrivateInputs,
)
const closedIntroduction = closedIntroductionOwner.request(reviewerCommand, 'client-a')
const closedIntroductionExpected = introductionBindingCases.get('authoritative-binding-closed')
assert.deepEqual(closedIntroduction.errors, [])
assert.equal(closedIntroduction.result.status, closedIntroductionExpected.expectedStatus)
assert.equal(closedIntroduction.result.code, closedIntroductionExpected.expectedCode)
assert.equal(closedIntroduction.result.causation, undefined)
assert.deepEqual(closedIntroduction.events, [])
assert.deepEqual(closedIntroductionOwner.counts(), { generationCount: 0, cancellationCount: 0 })
const closedIntroductionCancel = closedIntroductionOwner.cancel(scenario.cancelCommand, 'client-a')
assert.deepEqual(closedIntroductionCancel.errors, [])
assert.equal(closedIntroductionCancel.result.status, closedIntroductionExpected.expectedStatus)
assert.equal(closedIntroductionCancel.result.code, closedIntroductionExpected.expectedCode)
assert.equal(closedIntroductionCancel.result.causation, undefined)
assert.deepEqual(closedIntroductionCancel.events, [])
assert.deepEqual(closedIntroductionOwner.counts(), { generationCount: 0, cancellationCount: 0 })

for (
  const code of [
    'reconciliation-required',
    'operation-expired',
    'provider-replaced',
    'introduction-expired',
    'introduction-unavailable',
  ]
) {
  const isolated = createIntroductionOwner(scenario.bindings, scenario.requestCommands, scenario.providerPrivateInputs)
  if (code === 'provider-replaced') isolated.setProviderState('replaced')
  else isolated.setForcedCode(code)
  const command = structuredClone(reviewerCommand)
  command.commandId = `operation-${code}`
  const outcome = isolated.request(command, 'client-a')
  assert.deepEqual(outcome.errors, [])
  assert.equal(outcome.result.status, 'unavailable')
  assert.equal(outcome.result.code, code)
  assert.equal(outcome.result.causation, undefined)
  assert.deepEqual(isolated.counts(), { generationCount: 0, cancellationCount: 0 })
}

for (
  const authorization of [
    { capability: 'turns.introduce', state: 'denied', code: 'policy-denied' },
    { capability: 'turns.introduce', state: 'unavailable', code: 'host-unavailable' },
  ]
) {
  const isolated = createIntroductionOwner(scenario.bindings, scenario.requestCommands, scenario.providerPrivateInputs)
  isolated.setAuthorization(authorization)
  const command = structuredClone(reviewerCommand)
  command.commandId = `operation-auth-${authorization.state}`
  const outcome = isolated.request(command, 'client-a')
  assert.deepEqual(outcome.errors, [])
  assert.equal(outcome.result.status, authorization.state)
  assert.equal(outcome.result.causation, undefined)
  assert.deepEqual(isolated.counts(), { generationCount: 0, cancellationCount: 0 })
}

const retryOwner = createIntroductionOwner(scenario.bindings, scenario.requestCommands, scenario.providerPrivateInputs)
const failedCommand = structuredClone(reviewerCommand)
failedCommand.commandId = 'operation-intro-failed'
const failed = retryOwner.request(failedCommand, 'client-a', { fail: true })
assert.deepEqual(failed.errors, [])
assert.equal(failed.result.status, 'accepted')
assert.equal(failed.result.causation.operationId, failedCommand.commandId)
assert.deepEqual(failed.events.map(event => event.lifecycle.phase), ['turn.started', 'turn.failed'])
assert.equal(failed.events[1].lifecycle.failure.retryable, true)
assert.equal(failed.events.some(event => event.type === 'message'), false)
const retryCommand = structuredClone(reviewerCommand)
retryCommand.commandId = 'operation-intro-retry'
const retried = retryOwner.request(retryCommand, 'client-a')
assert.deepEqual(retried.errors, [])
assert.equal(retried.result.status, 'accepted')
assert.equal(retried.result.causation.operationId, retryCommand.commandId)
assert.notEqual(retried.result.turn, failed.result.turn)
assert.equal(retried.events.filter(event => event.type === 'message').length, 1)
assert.deepEqual(retryOwner.counts(), { generationCount: 2, cancellationCount: 0 })

const cancelOwner = createIntroductionOwner(scenario.bindings, scenario.requestCommands, scenario.providerPrivateInputs)
const pending = cancelOwner.request(reviewerCommand, 'client-a', { defer: true })
assert.deepEqual(pending.errors, [])
assert.equal(pending.events.length, 1)
const cancelled = cancelOwner.cancel(scenario.cancelCommand, 'client-a')
assert.deepEqual(cancelled.errors, [])
assert.equal(cancelled.result.status, 'accepted')
assert.equal(cancelled.result.delivery.disposition, 'executed')
assert.equal(cancelled.result.requestOperationId, reviewerCommand.commandId)
assert.equal(cancelled.result.causation.operationId, scenario.cancelCommand.commandId)
assert.notEqual(cancelled.result.causation.operationId, cancelled.result.requestOperationId)
assert.equal(cancelled.result.turn, pending.result.turn)
assert.equal(cancelled.result.messageId, pending.result.messageId)
assert.deepEqual(cancelOwner.counts(), { generationCount: 1, cancellationCount: 1 })
const cancelReplay = cancelOwner.cancel(scenario.cancelCommand, 'client-a')
assert.deepEqual(cancelReplay.errors, [])
assert.equal(cancelReplay.result.delivery.disposition, 'replayed')
assert.deepEqual(cancelReplay.result.causation, cancelled.result.causation)
assert.deepEqual(cancelOwner.counts(), { generationCount: 1, cancellationCount: 1 })
const cancelReconcile = cancelOwner.cancel(scenario.cancelCommand, 'client-after-reload')
assert.deepEqual(cancelReconcile.errors, [])
assert.equal(cancelReconcile.result.delivery.disposition, 'reconciled')
assert.deepEqual(cancelReconcile.result.causation, cancelled.result.causation)
assert.deepEqual(cancelOwner.counts(), { generationCount: 1, cancellationCount: 1 })

for (const invalidCase of invalidVector.acceptedMutations) {
  if (invalidCase.target === 'request') {
    const invalid = structuredClone(scenario.acceptedRequestResults[0])
    if (invalidCase.mutation === 'remove-causation') delete invalid.causation
    else invalid.causation.operationId = 'other-operation'
    if (invalidCase.expected === 'schema-invalid') assert.equal(validateResult(invalid), false, invalidCase.name)
    else {assert.notDeepEqual(
        exchangeErrors(scenario.requestCommands[0], invalid, scenario.requestEvents[0]),
        [],
        invalidCase.name,
      )}
  } else if (invalidCase.target === 'cancel') {
    const invalid = structuredClone(scenario.acceptedCancelResult)
    if (invalidCase.mutation === 'remove-causation') delete invalid.causation
    else invalid.causation.operationId = invalid.requestOperationId
    if (invalidCase.expected === 'schema-invalid') assert.equal(validateResult(invalid), false, invalidCase.name)
    else {assert.notDeepEqual(
        exchangeErrors(scenario.cancelCommand, invalid, [scenario.cancelEvent]),
        [],
        invalidCase.name,
      )}
  } else {
    const events = structuredClone(scenario.requestEvents[0])
    events[1].causation.operationId = 'other-operation'
    assert.notDeepEqual(
      exchangeErrors(scenario.requestCommands[0], scenario.acceptedRequestResults[0], events),
      [],
      invalidCase.name,
    )
  }
}

for (const invalidCase of invalidVector.forbiddenCausationCases) {
  let invalid
  if (invalidCase.type === 'create-or-bind') invalid = structuredClone(completeV2.createResult)
  else if (invalidCase.type === 'send') invalid = structuredClone(completeV2.sendResult)
  else {
    const command = invalidCase.type === 'request-member-self-introduction' ? reviewerCommand : scenario.cancelCommand
    if (invalidCase.status === 'denied') {
      invalid = introResultBase(command, 'denied', {
        capability: 'turns.introduce',
        state: 'denied',
        code: 'policy-denied',
      })
    } else if (invalidCase.status === 'unavailable') {
      invalid = introResultBase(command, 'unavailable', allowedIntroduction, { code: 'introduction-unavailable' })
    } else invalid = introResultBase(command, 'conflict', allowedIntroduction, { code: 'operation-conflict' })
  }
  assert.equal(
    validateResult(invalid),
    true,
    `forbidden-causation baseline must be valid: ${invalidCase.type}/${invalidCase.status}`,
  )
  invalid.causation = { operationId: invalid.commandId }
  assert.equal(validateResult(invalid), false, `causation must be forbidden: ${invalidCase.type}/${invalidCase.status}`)
}

console.log(
  'Agent Loop v4 conformance: v3 create/send compatibility plus exact approval and self-introduction result causation, replay, retry, cancellation, provider fencing, and multi-agent isolation passed',
)
