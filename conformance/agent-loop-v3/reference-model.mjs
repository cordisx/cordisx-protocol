import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { isDeepStrictEqual } from 'node:util'
import { fileURLToPath } from 'node:url'
import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const schemaNames = [
  'ui-common.v1.schema.json',
  'platform-model.v1.schema.json',
  'agent-avatar.v1.schema.json',
  'agent-conversation-shell-common.v1.schema.json',
  'agent-loop-common.v1.schema.json',
  'agent-loop-common.v2.schema.json',
  'agent-loop-task-details-common.v2.schema.json',
  'agent-definition.v1.schema.json',
  'agent-loop-common.v3.schema.json',
  'agent-loop-task-binding.v3.schema.json',
  'agent-loop-command.v3.schema.json',
  'agent-loop-result.v3.schema.json',
  'agent-loop-event.v3.schema.json',
  'agent-loop-event-subscription.v3.schema.json',
  'agent-loop-event-page.v3.schema.json',
  'agent-loop-bound-client.v3.schema.json',
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
const validateBinding = validator('agent-loop-task-binding.v3.schema.json')
const validateCommand = validator('agent-loop-command.v3.schema.json')
const validateResult = validator('agent-loop-result.v3.schema.json')
const validateEvent = validator('agent-loop-event.v3.schema.json')
const validateSubscription = validator('agent-loop-event-subscription.v3.schema.json')
const validatePage = validator('agent-loop-event-page.v3.schema.json')
const validateClient = validator('agent-loop-bound-client.v3.schema.json')
const schemaErrors = validate => (validate.errors ?? []).map(error => `${error.instancePath || '/'} ${error.message}`)
const allowedAuthorization = { capability: 'approvals.decide', state: 'allowed', code: 'allowed' }
const outcomeByDecision = { approve: 'approved', deny: 'denied', cancel: 'cancelled' }

async function vector(relative) {
  return JSON.parse(await readFile(path.join(root, 'test-vectors', 'agent-loop-v3', relative), 'utf8'))
}

async function v2Vector(name) {
  return JSON.parse(await readFile(path.join(root, 'test-vectors', 'agent-loop-v2', 'valid', name), 'utf8'))
}

const v2EnvelopeNames = new Set([
  'agent-loop-task-binding',
  'agent-loop-command',
  'agent-loop-result',
  'agent-loop-event',
  'agent-loop-event-subscription',
  'agent-loop-event-page',
  'agent-loop-bound-client',
])

function upgradeV2Wire(value) {
  if (Array.isArray(value)) return value.map(upgradeV2Wire)
  if (value === null || typeof value !== 'object') return value
  const next = Object.fromEntries(Object.entries(value).map(([key, child]) => [key, upgradeV2Wire(child)]))
  const match = typeof next.$schema === 'string'
    ? next.$schema.match(/\/schemas\/(agent-loop-[a-z-]+)\.v2\.schema\.json$/)
    : undefined
  if (match !== undefined && match !== null && v2EnvelopeNames.has(match[1])) {
    next.$schema = next.$schema.replace('.v2.schema.json', '.v3.schema.json')
    next.contract = next.contract.replace('/v2', '/v3')
    next.schemaVersion = 3
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

const bindingKey = binding => `${binding.binding.bindingId}\u0000${binding.binding.generation}`
const approvalKey = (binding, turn, approvalId) => `${bindingKey(binding)}\u0000${turn}\u0000${approvalId}`

function resultBase(command, status, authorization, extra = {}) {
  return {
    $schema: schemas.get('agent-loop-result.v3.schema.json').$id,
    contract: 'cordisx.agent-loop-result/v3',
    schemaVersion: 3,
    commandId: command.commandId,
    type: 'approval-decision',
    status,
    authorization,
    ...extra,
  }
}

function approvalResultErrors(command, result) {
  const errors = []
  if (!validateCommand(command)) errors.push(...schemaErrors(validateCommand))
  if (!validateResult(result)) errors.push(...schemaErrors(validateResult))
  if (errors.length > 0) return errors
  if (command.type !== 'approval-decision' || result.type !== command.type || result.commandId !== command.commandId) {
    errors.push('approval decision result correlation drift')
  }
  if (result.authorization.capability !== 'approvals.decide') {
    errors.push('approval decision authorization capability drift')
  }
  if (result.status === 'accepted') {
    if (!isDeepStrictEqual(result.binding, command.binding)) errors.push('accepted approval binding drift')
    if (
      result.turn !== command.turn || result.approvalId !== command.approvalId || result.decision !== command.decision
    ) errors.push('accepted approval tuple drift')
  }
  return errors
}

function legacyExchangeErrors(command, result) {
  const errors = []
  if (!validateCommand(command)) errors.push(...schemaErrors(validateCommand))
  if (!validateResult(result)) errors.push(...schemaErrors(validateResult))
  if (errors.length > 0) return errors
  if (result.type !== command.type || result.commandId !== command.commandId) {
    errors.push('create/send result correlation drift')
  }
  if (result.status === 'accepted' && command.type === 'create-or-bind') {
    if (result.detailsUrl === undefined || result.binding === undefined || result.delivery === undefined) {
      errors.push('accepted create/bind lost detailsUrl, binding, or delivery')
    }
    if (command.target.mode === 'bind' && result.binding.task !== command.target.task) {
      errors.push('explicit bind task drift')
    }
  }
  if (result.status === 'accepted' && command.type === 'send') {
    if (result.messageId === undefined || result.turn === undefined || result.delivery === undefined) {
      errors.push('accepted send lost messageId, turn, or delivery')
    }
    if (!isDeepStrictEqual(result.binding, command.binding)) errors.push('accepted send binding drift')
  }
  return errors
}

function approvalEventErrors(event, expectedPending, expectedOperationId) {
  const errors = []
  if (!validateEvent(event)) return schemaErrors(validateEvent)
  if (event.type !== 'approval') return ['decision event is not an approval event']
  if (expectedPending !== undefined) {
    if (!isDeepStrictEqual(event.binding, expectedPending.binding)) errors.push('resolved approval binding drift')
    if (
      event.turn !== expectedPending.turn || event.approval.approvalId !== expectedPending.approval.approvalId
      || event.approval.kind !== expectedPending.approval.kind
    ) errors.push('resolved approval tuple drift')
  }
  if (event.approval.state === 'resolved' && ['approved', 'denied', 'cancelled'].includes(event.approval.outcome)) {
    if (event.causation?.operationId === undefined) errors.push('resolved decision approval lacks causation')
    else if (expectedOperationId !== undefined && event.causation.operationId !== expectedOperationId) {
      errors.push('resolved decision approval causation drift')
    }
  }
  return errors
}

function createApprovalOwner(bindings, pendingEvents) {
  const knownBindings = new Map(bindings.map(binding => [bindingKey(binding), structuredClone(binding)]))
  const approvals = new Map()
  for (const event of pendingEvents) {
    assert.deepEqual(approvalEventErrors(event), [])
    approvals.set(approvalKey({ binding: event.binding }, event.turn, event.approval.approvalId), {
      pending: structuredClone(event),
      state: 'pending',
      available: true,
    })
  }
  const ledger = new Map()
  let decisionCount = 0
  let eventCounter = 0
  let providerState = 'current'
  let forcedOperationCode
  let authorization = structuredClone(allowedAuthorization)

  function decide(command, clientId) {
    if (!validateCommand(command)) return { errors: schemaErrors(validateCommand) }
    const remembered = ledger.get(command.commandId)
    if (remembered !== undefined) {
      if (!isDeepStrictEqual(remembered.command, command)) {
        const result = resultBase(command, 'conflict', allowedAuthorization, { code: 'operation-conflict' })
        return { result, errors: approvalResultErrors(command, result), decisionCount }
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
        errors: approvalResultErrors(command, result),
        decisionCount,
      }
    }
    let result
    let event
    if (authorization.state === 'denied') {
      result = resultBase(command, 'denied', authorization)
    } else if (authorization.state === 'unavailable') {
      result = resultBase(command, 'unavailable', authorization)
    } else if (providerState === 'replaced') {
      result = resultBase(command, 'unavailable', allowedAuthorization, { code: 'provider-replaced' })
    } else if (forcedOperationCode !== undefined) {
      result = resultBase(command, 'unavailable', allowedAuthorization, { code: forcedOperationCode })
    } else if (!knownBindings.has(bindingKey(command.binding))) {
      result = resultBase(command, 'conflict', allowedAuthorization, { code: 'binding-conflict' })
    } else {
      const approval = approvals.get(approvalKey(command.binding, command.turn, command.approvalId))
      if (approval === undefined) {
        result = resultBase(command, 'conflict', allowedAuthorization, { code: 'approval-conflict' })
      } else if (!approval.available) {
        result = resultBase(command, 'unavailable', allowedAuthorization, { code: 'approval-unavailable' })
      } else if (approval.state === 'expired') {
        result = resultBase(command, 'unavailable', allowedAuthorization, { code: 'approval-expired' })
      } else if (approval.state === 'resolved') {
        result = resultBase(command, 'conflict', allowedAuthorization, { code: 'approval-conflict' })
      } else {
        approval.state = 'resolved'
        approval.outcome = outcomeByDecision[command.decision]
        decisionCount += 1
        result = resultBase(command, 'accepted', allowedAuthorization, {
          binding: structuredClone(command.binding),
          turn: command.turn,
          approvalId: command.approvalId,
          decision: command.decision,
          delivery: { disposition: 'executed' },
        })
        eventCounter += 1
        event = {
          $schema: schemas.get('agent-loop-event.v3.schema.json').$id,
          contract: 'cordisx.agent-loop-event/v3',
          schemaVersion: 3,
          eventId: `event-resolved-${eventCounter}`,
          binding: structuredClone(command.binding.binding),
          sequence: approval.pending.sequence + 100,
          occurredAt: '2026-08-31T09:10:00.000Z',
          causation: { operationId: command.commandId },
          type: 'approval',
          turn: command.turn,
          approval: {
            approvalId: command.approvalId,
            kind: approval.pending.approval.kind,
            state: 'resolved',
            outcome: approval.outcome,
          },
        }
      }
    }
    ledger.set(command.commandId, {
      command: structuredClone(command),
      result: structuredClone(result),
      event: structuredClone(event),
      clientId,
    })
    return {
      result,
      event,
      errors: [
        ...approvalResultErrors(command, result),
        ...(event === undefined
          ? []
          : approvalEventErrors(
            event,
            approvals.get(approvalKey(command.binding, command.turn, command.approvalId))?.pending,
            command.commandId,
          )),
      ],
      decisionCount,
    }
  }

  return {
    decide,
    decisionCount: () => decisionCount,
    approvalState: (binding, turn, approvalId) =>
      structuredClone(approvals.get(approvalKey(binding, turn, approvalId))),
    markExpired(binding, turn, approvalId) {
      approvals.get(approvalKey(binding, turn, approvalId)).state = 'expired'
    },
    markUnavailable(binding, turn, approvalId) {
      approvals.get(approvalKey(binding, turn, approvalId)).available = false
    },
    setProviderState(value) {
      providerState = value
    },
    setForcedOperationCode(value) {
      forcedOperationCode = value
    },
    setAuthorization(value) {
      authorization = structuredClone(value)
    },
  }
}

function introductionResultBase(command, status, authorization, extra = {}) {
  return {
    $schema: schemas.get('agent-loop-result.v3.schema.json').$id,
    contract: 'cordisx.agent-loop-result/v3',
    schemaVersion: 3,
    commandId: command.commandId,
    type: command.type,
    status,
    authorization,
    ...extra,
  }
}

function introductionResultErrors(command, result) {
  const errors = []
  if (!validateCommand(command)) errors.push(...schemaErrors(validateCommand))
  if (!validateResult(result)) errors.push(...schemaErrors(validateResult))
  if (errors.length > 0) return errors
  if (result.commandId !== command.commandId || result.type !== command.type) {
    errors.push('self-introduction result correlation drift')
  }
  if (result.authorization.capability !== 'turns.introduce') {
    errors.push('self-introduction authorization capability drift')
  }
  if (result.status === 'accepted') {
    if (!isDeepStrictEqual(result.binding, command.binding)) errors.push('self-introduction accepted binding drift')
    for (const field of ['participantId', 'memberId', 'runId']) {
      if (result[field] !== command[field]) errors.push(`self-introduction accepted ${field} drift`)
    }
    if (
      command.type === 'request-member-self-introduction'
      && (result.turn === undefined || result.messageId === undefined)
    ) errors.push('self-introduction accepted identity is incomplete')
    if (
      command.type === 'cancel-member-self-introduction'
      && (result.requestOperationId !== command.requestOperationId || result.turn === undefined
        || result.messageId === undefined)
    ) errors.push('self-introduction cancel target or identity drift')
  }
  return errors
}

function introductionTraceErrors(command, result, events) {
  const errors = [...introductionResultErrors(command, result)]
  for (const event of events) {
    if (!validateEvent(event)) errors.push(...schemaErrors(validateEvent))
    if (!isDeepStrictEqual(event.binding, command.binding.binding)) errors.push('self-introduction event binding drift')
    if (event.causation?.operationId !== command.commandId) errors.push('self-introduction event causation drift')
  }
  if (command.type === 'request-member-self-introduction' && result.status === 'accepted') {
    const messages = events.filter(event => event.type === 'message')
    const failures = events.filter(event => event.type === 'lifecycle' && event.lifecycle.phase === 'turn.failed')
    const deferred = events.length === 1 && events[0].type === 'lifecycle'
      && events[0].lifecycle.phase === 'turn.started'
    if (failures.length === 0 && !deferred) {
      if (messages.length !== 1) errors.push('self-introduction did not produce exactly one assistant message')
      const message = messages[0]
      if (message?.message.role !== 'assistant' || message?.message.purpose !== 'member-self-introduction') {
        errors.push('self-introduction message role or purpose drift')
      }
      if (message?.message.messageId !== result.messageId || message?.turn !== result.turn) {
        errors.push('self-introduction message identity drift')
      }
      if (
        message?.message.content.length !== 1 || message.message.content[0].kind !== 'text'
        || message.message.content[0].text.length === 0
      ) errors.push('self-introduction did not emit one non-empty free-text block')
      if (!events.some(event => event.type === 'lifecycle' && event.lifecycle.phase === 'turn.completed')) {
        errors.push('self-introduction completion event is absent')
      }
    } else if (messages.length !== 0) errors.push('pending or failed self-introduction emitted a visible message')
    if (!events.some(event => event.type === 'lifecycle' && event.lifecycle.phase === 'turn.started')) {
      errors.push('self-introduction start event is absent')
    }
    if (events.some(event => event.type === 'message' && event.message.role === 'user')) {
      errors.push('self-introduction emitted a synthetic user trigger')
    }
  }
  return errors
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
  const operationLedger = new Map()
  const introductions = new Map()
  let generationCount = 0
  let cancellationCount = 0
  let providerState = 'current'
  let forcedCode
  let authorization = { capability: 'turns.introduce', state: 'allowed', code: 'allowed' }

  function replay(command, clientId, remembered) {
    if (!isDeepStrictEqual(remembered.command, command)) {
      const result = introductionResultBase(command, 'conflict', {
        capability: 'turns.introduce',
        state: 'allowed',
        code: 'allowed',
      }, { code: 'operation-conflict' })
      return {
        result,
        events: [],
        errors: introductionResultErrors(command, result),
        generationCount,
        cancellationCount,
      }
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
      errors: introductionTraceErrors(command, result, remembered.events),
      generationCount,
      cancellationCount,
    }
  }

  function preflight(command) {
    if (authorization.state === 'denied') return introductionResultBase(command, 'denied', authorization)
    if (authorization.state === 'unavailable') return introductionResultBase(command, 'unavailable', authorization)
    if (providerState === 'replaced') {
      return introductionResultBase(command, 'unavailable', authorization, { code: 'provider-replaced' })
    }
    if (forcedCode !== undefined) {
      return introductionResultBase(command, 'unavailable', authorization, { code: forcedCode })
    }
    if (!knownBindings.has(bindingKey(command.binding))) {
      return introductionResultBase(command, 'conflict', authorization, { code: 'binding-conflict' })
    }
    const association = associationByBinding.get(bindingKey(command.binding))
    if (
      association === undefined || association.participantId !== command.participantId
      || association.memberId !== command.memberId
    ) return introductionResultBase(command, 'conflict', authorization, { code: 'member-conflict' })
    if (association.runId !== command.runId) {
      return introductionResultBase(command, 'conflict', authorization, { code: 'run-conflict' })
    }
  }

  function request(command, clientId, options = {}) {
    if (!validateCommand(command)) return { errors: schemaErrors(validateCommand) }
    const remembered = operationLedger.get(command.commandId)
    if (remembered !== undefined) return replay(command, clientId, remembered)
    const failed = preflight(command)
    if (failed !== undefined) {
      operationLedger.set(command.commandId, {
        command: structuredClone(command),
        result: structuredClone(failed),
        events: [],
        clientId,
      })
      return {
        result: failed,
        events: [],
        errors: introductionResultErrors(command, failed),
        generationCount,
        cancellationCount,
      }
    }
    const providerInput = privateByParticipant.get(command.participantId)
    if (
      providerInput === undefined || !isDeepStrictEqual(providerInput.definition.identity, command.binding.definition)
    ) {
      const result = introductionResultBase(command, 'unavailable', authorization, { code: 'introduction-unavailable' })
      return {
        result,
        events: [],
        errors: introductionResultErrors(command, result),
        generationCount,
        cancellationCount,
      }
    }
    const turn = `turn-${command.commandId}`
    const messageId = `message-${command.commandId}`
    const result = introductionResultBase(command, 'accepted', authorization, {
      binding: structuredClone(command.binding),
      participantId: command.participantId,
      memberId: command.memberId,
      runId: command.runId,
      turn,
      messageId,
      delivery: { disposition: 'executed' },
    })
    generationCount += 1
    // The provider-authored message is simulator-private evidence. The Protocol
    // does not prescribe or synthesize wording from Agent Definition fields.
    const providerMessage = providerInput.providerAuthoredMessage
    const eventBase = (eventId, sequence) => ({
      $schema: schemas.get('agent-loop-event.v3.schema.json').$id,
      contract: 'cordisx.agent-loop-event/v3',
      schemaVersion: 3,
      eventId,
      binding: structuredClone(command.binding.binding),
      sequence,
      occurredAt: `2026-08-31T10:00:0${sequence}.000Z`,
      causation: { operationId: command.commandId },
      turn,
    })
    const events = [{
      ...eventBase(`event-${command.commandId}-started`, 0),
      type: 'lifecycle',
      lifecycle: { phase: 'turn.started' },
    }]
    let state = 'pending'
    if (!options.defer && options.fail) {
      events.push({
        ...eventBase(`event-${command.commandId}-failed`, 1),
        type: 'lifecycle',
        lifecycle: { phase: 'turn.failed', failure: { code: 'INTRODUCTION_GENERATION_FAILED', retryable: true } },
      })
      state = 'failed'
    } else if (!options.defer) {
      events.push({
        ...eventBase(`event-${command.commandId}-message`, 1),
        type: 'message',
        message: {
          messageId,
          role: 'assistant',
          purpose: 'member-self-introduction',
          content: [{ kind: 'text', text: providerMessage }],
        },
      })
      events.push({
        ...eventBase(`event-${command.commandId}-completed`, 2),
        type: 'lifecycle',
        lifecycle: { phase: 'turn.completed' },
      })
      state = 'completed'
    }
    introductions.set(command.commandId, {
      command: structuredClone(command),
      result: structuredClone(result),
      state,
      turn,
    })
    operationLedger.set(command.commandId, {
      command: structuredClone(command),
      result: structuredClone(result),
      events: structuredClone(events),
      clientId,
    })
    return {
      result,
      events,
      errors: introductionTraceErrors(command, result, events),
      generationCount,
      cancellationCount,
    }
  }

  function cancel(command, clientId) {
    if (!validateCommand(command)) return { errors: schemaErrors(validateCommand) }
    const remembered = operationLedger.get(command.commandId)
    if (remembered !== undefined) return replay(command, clientId, remembered)
    const failed = preflight(command)
    if (failed !== undefined) {
      operationLedger.set(command.commandId, {
        command: structuredClone(command),
        result: structuredClone(failed),
        events: [],
        clientId,
      })
      return {
        result: failed,
        events: [],
        errors: introductionResultErrors(command, failed),
        generationCount,
        cancellationCount,
      }
    }
    const introduction = introductions.get(command.requestOperationId)
    let result
    let events = []
    if (introduction === undefined) {
      result = introductionResultBase(command, 'unavailable', authorization, { code: 'introduction-not-found' })
    } else if (
      !['participantId', 'memberId', 'runId'].every(field => introduction.command[field] === command[field])
      || !isDeepStrictEqual(introduction.command.binding, command.binding)
    ) result = introductionResultBase(command, 'conflict', authorization, { code: 'introduction-conflict' })
    else if (introduction.state === 'completed') {
      result = introductionResultBase(command, 'conflict', authorization, { code: 'introduction-completed' })
    } else if (introduction.state === 'cancelled') {
      result = introductionResultBase(command, 'conflict', authorization, { code: 'introduction-cancelled' })
    } else if (introduction.state !== 'pending') {
      result = introductionResultBase(command, 'conflict', authorization, { code: 'introduction-conflict' })
    } else {
      introduction.state = 'cancelled'
      cancellationCount += 1
      result = introductionResultBase(command, 'accepted', authorization, {
        binding: structuredClone(command.binding),
        participantId: command.participantId,
        memberId: command.memberId,
        runId: command.runId,
        requestOperationId: command.requestOperationId,
        turn: introduction.result.turn,
        messageId: introduction.result.messageId,
        delivery: { disposition: 'executed' },
      })
      events = [{
        $schema: schemas.get('agent-loop-event.v3.schema.json').$id,
        contract: 'cordisx.agent-loop-event/v3',
        schemaVersion: 3,
        eventId: `event-${command.commandId}-cancelled`,
        binding: structuredClone(command.binding.binding),
        sequence: 1,
        occurredAt: '2026-08-31T10:00:01.000Z',
        causation: { operationId: command.commandId },
        turn: introduction.turn,
        type: 'lifecycle',
        lifecycle: { phase: 'turn.cancelled' },
      }]
    }
    operationLedger.set(command.commandId, {
      command: structuredClone(command),
      result: structuredClone(result),
      events: structuredClone(events),
      clientId,
    })
    return {
      result,
      events,
      errors: [
        ...introductionResultErrors(command, result),
        ...events.flatMap(event => validateEvent(event) ? [] : schemaErrors(validateEvent)),
      ],
      generationCount,
      cancellationCount,
    }
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

export {
  ajv,
  approvalEventErrors,
  createApprovalOwner,
  createIntroductionOwner,
  legacyExchangeErrors,
  outcomeByDecision,
  schemas,
  upgradeV2Wire,
  v2Vector,
  validateBinding,
  validateClient,
  validateCommand,
  validateEvent,
  validatePage,
  validateSubscription,
  vector,
}
