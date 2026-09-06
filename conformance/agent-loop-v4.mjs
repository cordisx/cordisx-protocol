import assert from 'node:assert/strict'
import { isDeepStrictEqual } from 'node:util'
import {
  ajv,
  allowedIntroduction,
  approvalTraceErrors,
  createApprovalOwner,
  createIntroductionOwner,
  exchangeErrors,
  introResultBase,
  legacyVector,
  upgradeWire,
  validateBinding,
  validateClient,
  validateCommand,
  validateEvent,
  validatePage,
  validateResult,
  validateSubscription,
  vector,
} from './agent-loop-v4/reference-model.mjs'

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
