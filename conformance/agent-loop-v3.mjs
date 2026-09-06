import assert from 'node:assert/strict'
import { isDeepStrictEqual } from 'node:util'
import {
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
} from './agent-loop-v3/reference-model.mjs'

const v2Complete = await v2Vector('complete.json')
const migratedComplete = upgradeV2Wire(v2Complete)
assert.equal(validateClient(migratedComplete.client), true, ajv.errorsText(validateClient.errors))
assert.deepEqual(legacyExchangeErrors(migratedComplete.createCommand, migratedComplete.createResult), [])
assert.deepEqual(legacyExchangeErrors(migratedComplete.sendCommand, migratedComplete.sendResult), [])
assert.equal(validateBinding(migratedComplete.binding), true, ajv.errorsText(validateBinding.errors))
assert.equal(migratedComplete.createResult.detailsUrl.url, v2Complete.createResult.detailsUrl.url)
assert.equal(migratedComplete.sendResult.messageId, v2Complete.sendResult.messageId)
assert.equal(migratedComplete.sendResult.turn, v2Complete.sendResult.turn)
assert.deepEqual(migratedComplete.sendResult.delivery, v2Complete.sendResult.delivery)
for (const originalPage of migratedComplete.pages) {
  // V3 decision-resolved approvals require an actual durable decision operation.
  // That new fact cannot be fabricated while migrating the legacy create/send data plane.
  const page = structuredClone(originalPage)
  page.events = page.events.filter(event =>
    !(event.type === 'approval' && event.approval.state === 'resolved' && event.approval.outcome !== 'expired'
      && event.causation === undefined)
  )
  assert.equal(validateSubscription(page.subscription), true, ajv.errorsText(validateSubscription.errors))
  assert.equal(validatePage(page), true, ajv.errorsText(validatePage.errors))
  for (const event of page.events) assert.equal(validateEvent(event), true, ajv.errorsText(validateEvent.errors))
  assert.ok(
    page.events.every(event => isDeepStrictEqual(event.binding, page.subscription.binding)),
    'migrated event escaped its binding generation',
  )
  for (let index = 1; index < page.events.length; index += 1) {
    assert.ok(page.events[index].sequence > page.events[index - 1].sequence, 'migrated event order regressed')
  }
  assert.equal(page.nextAfterSequence, originalPage.nextAfterSequence)
}
const migratedCreateEvent = migratedComplete.pages.flatMap(page => page.events).find(event =>
  event.causation?.operationId === migratedComplete.createCommand.commandId
)
const migratedSendEvent = migratedComplete.pages.flatMap(page => page.events).find(event =>
  event.type === 'message' && event.causation?.operationId === migratedComplete.sendCommand.commandId
)
assert.equal(migratedCreateEvent.lifecycle.phase, 'binding.created')
assert.equal(migratedSendEvent.message.messageId, migratedComplete.sendResult.messageId)
assert.equal(migratedSendEvent.turn, migratedComplete.sendResult.turn)

const migratedIdempotency = upgradeV2Wire(await v2Vector('idempotent-commands.json'))
for (const exchange of migratedIdempotency.exchanges) {
  assert.deepEqual(legacyExchangeErrors(exchange.command, exchange.result), [])
}
for (
  const [first, replay] of [[migratedIdempotency.exchanges[0], migratedIdempotency.exchanges[1]], [
    migratedIdempotency.exchanges[2],
    migratedIdempotency.exchanges[3],
  ]]
) {
  assert.deepEqual(first.command, replay.command)
  assert.equal(first.result.delivery.disposition, 'executed')
  assert.equal(replay.result.delivery.disposition, 'replayed')
  if (first.command.type === 'create-or-bind') {
    assert.deepEqual(first.result.binding, replay.result.binding)
    assert.deepEqual(first.result.detailsUrl, replay.result.detailsUrl)
  } else {
    assert.equal(first.result.messageId, replay.result.messageId)
    assert.equal(first.result.turn, replay.result.turn)
  }
}

const durableV2 = await v2Vector('durable-delivery.json')
const durableBindings = Object.fromEntries(
  Object.entries(durableV2.bindings).map(([key, binding]) => [key, upgradeV2Wire(binding)]),
)
for (const binding of Object.values(durableBindings)) {
  assert.equal(validateBinding(binding), true, ajv.errorsText(validateBinding.errors))
}
function materializeDurableCommand(name) {
  const source = durableV2.commands[name]
  const base = {
    $schema: schemas.get('agent-loop-command.v3.schema.json').$id,
    contract: 'cordisx.agent-loop-command/v3',
    schemaVersion: 3,
    commandId: source.commandId,
    type: source.type,
  }
  return source.type === 'create-or-bind'
    ? {
      ...base,
      definition: durableV2.definition.identity,
      definitions: [durableV2.definition],
      target: structuredClone(source.target),
    }
    : {
      ...base,
      binding: structuredClone(durableBindings[source.binding]),
      content: [{ kind: 'text', text: source.text }],
    }
}
function materializeDurableResult(step, command) {
  const source = step.result
  const authorization = command.type === 'send'
    ? { capability: 'turns.submit', state: 'allowed', code: 'allowed' }
    : {
      capability: command.target.mode === 'create' ? 'tasks.create' : 'tasks.content.read',
      state: 'allowed',
      code: 'allowed',
    }
  const base = {
    $schema: schemas.get('agent-loop-result.v3.schema.json').$id,
    contract: 'cordisx.agent-loop-result/v3',
    schemaVersion: 3,
    commandId: command.commandId,
    type: command.type,
    status: source.status,
    authorization,
  }
  if (source.status === 'unavailable') return { ...base, code: source.code }
  if (command.type === 'create-or-bind') {
    return {
      ...base,
      binding: structuredClone(durableBindings[source.binding]),
      detailsUrl: structuredClone(source.detailsUrl),
      delivery: { disposition: source.disposition },
    }
  }
  return {
    ...base,
    binding: structuredClone(durableBindings[source.binding]),
    messageId: source.messageId,
    turn: source.turn,
    delivery: { disposition: source.disposition },
  }
}
for (const step of durableV2.steps.filter(step => step.action === 'attempt')) {
  const command = materializeDurableCommand(step.command)
  const result = materializeDurableResult(step, command)
  assert.deepEqual(legacyExchangeErrors(command, result), [])
  for (const event of step.events ?? []) {
    assert.equal(validateEvent(upgradeV2Wire(event)), true, ajv.errorsText(validateEvent.errors))
  }
}

for (
  const [command, authorization, status] of [
    [migratedComplete.createCommand, { capability: 'tasks.create', state: 'denied', code: 'policy-denied' }, 'denied'],
    [
      migratedComplete.createCommand,
      { capability: 'tasks.create', state: 'unavailable', code: 'host-unavailable' },
      'unavailable',
    ],
    [migratedComplete.sendCommand, { capability: 'turns.submit', state: 'denied', code: 'user-denied' }, 'denied'],
    [
      migratedComplete.sendCommand,
      { capability: 'turns.submit', state: 'unavailable', code: 'task-unavailable' },
      'unavailable',
    ],
  ]
) {
  const result = {
    $schema: schemas.get('agent-loop-result.v3.schema.json').$id,
    contract: 'cordisx.agent-loop-result/v3',
    schemaVersion: 3,
    commandId: command.commandId,
    type: command.type,
    status,
    authorization,
  }
  assert.deepEqual(legacyExchangeErrors(command, result), [])
}

const introductionVector = await vector('valid/member-self-introduction-durable.json')
for (const binding of introductionVector.bindings) {
  assert.equal(validateBinding(binding), true, ajv.errorsText(validateBinding.errors))
}
for (const command of [...introductionVector.commands, introductionVector.cancelCommand]) {
  assert.equal(validateCommand(command), true, ajv.errorsText(validateCommand.errors))
}
const forbiddenIntroductionFields = await vector('invalid/member-self-introduction-wire-fields.json')
for (const field of forbiddenIntroductionFields.fields) {
  const invalid = structuredClone(introductionVector.commands[0])
  invalid[field] = field === 'issuedAt' ? '2026-08-31T00:00:00.000Z' : 'provider-private'
  assert.equal(validateCommand(invalid), false, `self-introduction command must reject ${field}`)
}
const commandWire = JSON.stringify(introductionVector.commands)
for (const providerInput of introductionVector.providerPrivateInputs) {
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
      'provider-private definition input leaked into self-introduction command',
    )
  }
}

const introductionOwner = createIntroductionOwner(
  introductionVector.bindings,
  introductionVector.commands,
  introductionVector.providerPrivateInputs,
)
const reviewerCommand = introductionVector.commands[0]
const reviewerExecuted = introductionOwner.request(reviewerCommand, 'intro-client-a')
assert.deepEqual(reviewerExecuted.errors, [])
assert.equal(reviewerExecuted.result.status, 'accepted')
assert.equal(reviewerExecuted.result.delivery.disposition, 'executed')
assert.deepEqual(reviewerExecuted.events.map(event => event.lifecycle?.phase ?? event.message?.purpose), [
  'turn.started',
  'member-self-introduction',
  'turn.completed',
])
assert.equal(reviewerExecuted.events.filter(event => event.type === 'message').length, 1)
assert.ok(reviewerExecuted.events.every(event => event.causation.operationId === reviewerCommand.commandId))
assert.equal(introductionOwner.counts().generationCount, 1)

const reviewerReplay = introductionOwner.request(reviewerCommand, 'intro-client-a')
assert.deepEqual(reviewerReplay.errors, [])
assert.equal(reviewerReplay.result.delivery.disposition, 'replayed')
assert.equal(reviewerReplay.result.turn, reviewerExecuted.result.turn)
assert.equal(reviewerReplay.result.messageId, reviewerExecuted.result.messageId)
assert.equal(introductionOwner.counts().generationCount, 1)
const reviewerReconcile = introductionOwner.request(reviewerCommand, 'intro-client-after-reload')
assert.deepEqual(reviewerReconcile.errors, [])
assert.equal(reviewerReconcile.result.delivery.disposition, 'reconciled')
assert.equal(reviewerReconcile.result.turn, reviewerExecuted.result.turn)
assert.equal(reviewerReconcile.result.messageId, reviewerExecuted.result.messageId)
assert.equal(introductionOwner.counts().generationCount, 1)

const divergentIntroduction = structuredClone(reviewerCommand)
divergentIntroduction.runId = 'run-divergent'
const divergentIntroductionResult = introductionOwner.request(divergentIntroduction, 'intro-client-a')
assert.equal(divergentIntroductionResult.result.status, 'conflict')
assert.equal(divergentIntroductionResult.result.code, 'operation-conflict')
assert.equal(introductionOwner.counts().generationCount, 1)

const writerExecuted = introductionOwner.request(introductionVector.commands[1], 'intro-client-a')
assert.deepEqual(writerExecuted.errors, [])
assert.equal(writerExecuted.result.status, 'accepted')
assert.notEqual(writerExecuted.result.turn, reviewerExecuted.result.turn)
assert.notEqual(writerExecuted.result.messageId, reviewerExecuted.result.messageId)
assert.equal(introductionOwner.counts().generationCount, 2)

for (
  const [code, mutate] of [
    ['binding-conflict', command => {
      command.binding.binding.generation += 1
    }],
    ['member-conflict', command => {
      command.memberId = 'other-member'
    }],
    ['run-conflict', command => {
      command.runId = 'other-run'
    }],
  ]
) {
  const isolated = createIntroductionOwner(
    introductionVector.bindings,
    introductionVector.commands,
    introductionVector.providerPrivateInputs,
  )
  const command = structuredClone(reviewerCommand)
  command.commandId = `operation-intro-${code}`
  mutate(command)
  const outcome = isolated.request(command, 'intro-client')
  assert.deepEqual(outcome.errors, [])
  assert.equal(outcome.result.status, 'conflict')
  assert.equal(outcome.result.code, code)
  assert.equal(isolated.counts().generationCount, 0)
}

for (
  const code of [
    'reconciliation-required',
    'operation-expired',
    'provider-replaced',
    'introduction-expired',
    'introduction-unavailable',
  ]
) {
  const isolated = createIntroductionOwner(
    introductionVector.bindings,
    introductionVector.commands,
    introductionVector.providerPrivateInputs,
  )
  if (code === 'provider-replaced') isolated.setProviderState('replaced')
  else isolated.setForcedCode(code)
  const command = structuredClone(reviewerCommand)
  command.commandId = `operation-intro-${code}`
  const outcome = isolated.request(command, 'intro-client')
  assert.deepEqual(outcome.errors, [])
  assert.equal(outcome.result.status, 'unavailable')
  assert.equal(outcome.result.code, code)
  assert.equal(isolated.counts().generationCount, 0)
}

for (
  const authorization of [
    { capability: 'turns.introduce', state: 'denied', code: 'policy-denied' },
    { capability: 'turns.introduce', state: 'unavailable', code: 'host-unavailable' },
  ]
) {
  const isolated = createIntroductionOwner(
    introductionVector.bindings,
    introductionVector.commands,
    introductionVector.providerPrivateInputs,
  )
  isolated.setAuthorization(authorization)
  const command = structuredClone(reviewerCommand)
  command.commandId = `operation-intro-auth-${authorization.state}`
  const outcome = isolated.request(command, 'intro-client')
  assert.deepEqual(outcome.errors, [])
  assert.equal(outcome.result.status, authorization.state)
  assert.equal(outcome.result.code, undefined)
  assert.equal(isolated.counts().generationCount, 0)
}

const failedIntroductionOwner = createIntroductionOwner(
  introductionVector.bindings,
  introductionVector.commands,
  introductionVector.providerPrivateInputs,
)
const failedIntroductionCommand = structuredClone(reviewerCommand)
failedIntroductionCommand.commandId = 'operation-intro-failed'
const failedIntroduction = failedIntroductionOwner.request(failedIntroductionCommand, 'intro-client', { fail: true })
assert.deepEqual(failedIntroduction.errors, [])
assert.equal(failedIntroduction.result.status, 'accepted')
assert.deepEqual(failedIntroduction.events.map(event => event.lifecycle.phase), ['turn.started', 'turn.failed'])
assert.ok(failedIntroduction.events.every(event => event.causation.operationId === failedIntroductionCommand.commandId))
assert.equal(failedIntroduction.events.some(event => event.type === 'message'), false)

const cancelOwner = createIntroductionOwner(
  introductionVector.bindings,
  introductionVector.commands,
  introductionVector.providerPrivateInputs,
)
const pendingIntroduction = cancelOwner.request(reviewerCommand, 'intro-client', { defer: true })
assert.deepEqual(pendingIntroduction.errors, [])
assert.equal(pendingIntroduction.events.length, 1)
const cancelExecuted = cancelOwner.cancel(introductionVector.cancelCommand, 'intro-client')
assert.deepEqual(cancelExecuted.errors, [])
assert.equal(cancelExecuted.result.status, 'accepted')
assert.equal(cancelExecuted.result.delivery.disposition, 'executed')
assert.equal(cancelExecuted.result.turn, pendingIntroduction.result.turn)
assert.equal(cancelExecuted.result.messageId, pendingIntroduction.result.messageId)
assert.equal(cancelExecuted.events.length, 1)
assert.equal(cancelExecuted.events[0].lifecycle.phase, 'turn.cancelled')
assert.equal(cancelExecuted.events[0].turn, pendingIntroduction.result.turn)
assert.equal(cancelExecuted.events[0].causation.operationId, introductionVector.cancelCommand.commandId)
assert.deepEqual(cancelOwner.counts(), { generationCount: 1, cancellationCount: 1 })
const cancelReplay = cancelOwner.cancel(introductionVector.cancelCommand, 'intro-client')
assert.deepEqual(cancelReplay.errors, [])
assert.equal(cancelReplay.result.delivery.disposition, 'replayed')
assert.deepEqual(cancelOwner.counts(), { generationCount: 1, cancellationCount: 1 })
const cancelReconcile = cancelOwner.cancel(introductionVector.cancelCommand, 'intro-client-reloaded')
assert.deepEqual(cancelReconcile.errors, [])
assert.equal(cancelReconcile.result.delivery.disposition, 'reconciled')
assert.deepEqual(cancelOwner.counts(), { generationCount: 1, cancellationCount: 1 })

const afterCompleteCancelOwner = createIntroductionOwner(
  introductionVector.bindings,
  introductionVector.commands,
  introductionVector.providerPrivateInputs,
)
afterCompleteCancelOwner.request(reviewerCommand, 'intro-client')
const afterCompleteCancel = afterCompleteCancelOwner.cancel(introductionVector.cancelCommand, 'intro-client')
assert.deepEqual(afterCompleteCancel.errors, [])
assert.equal(afterCompleteCancel.result.status, 'conflict')
assert.equal(afterCompleteCancel.result.code, 'introduction-completed')
assert.equal(afterCompleteCancelOwner.counts().cancellationCount, 0)
const unknownCancelOwner = createIntroductionOwner(
  introductionVector.bindings,
  introductionVector.commands,
  introductionVector.providerPrivateInputs,
)
const unknownCancel = unknownCancelOwner.cancel(introductionVector.cancelCommand, 'intro-client')
assert.deepEqual(unknownCancel.errors, [])
assert.equal(unknownCancel.result.status, 'unavailable')
assert.equal(unknownCancel.result.code, 'introduction-not-found')

const reboundReplayOwner = createIntroductionOwner(
  introductionVector.bindings,
  introductionVector.commands,
  introductionVector.providerPrivateInputs,
)
reboundReplayOwner.request(reviewerCommand, 'intro-client')
const reboundPayload = structuredClone(reviewerCommand)
reboundPayload.binding.binding.generation += 1
const reboundOutcome = reboundReplayOwner.request(reboundPayload, 'intro-client-reloaded')
assert.equal(reboundOutcome.result.status, 'conflict')
assert.equal(reboundOutcome.result.code, 'operation-conflict')
assert.equal(reboundReplayOwner.counts().generationCount, 1, 'reload/rebind replay generated a duplicate introduction')

const scenario = await vector('valid/approval-decision-durable.json')
for (const binding of scenario.bindings) {
  assert.equal(validateBinding(binding), true, ajv.errorsText(validateBinding.errors))
}
for (const event of scenario.pendingEvents) assert.deepEqual(approvalEventErrors(event), [])
for (const command of scenario.commands) {
  assert.equal(validateCommand(command), true, ajv.errorsText(validateCommand.errors))
}
const clientDescriptor = {
  $schema: schemas.get('agent-loop-bound-client.v3.schema.json').$id,
  contract: 'cordisx.bound-agent-loop-client/v3',
  schemaVersion: 3,
  injection: 'host-bound',
  operations: [
    'createOrBind',
    'send',
    'decideApproval',
    'requestMemberSelfIntroduction',
    'cancelMemberSelfIntroduction',
    'subscribe',
    'dispose',
  ],
  lifetime: 'fiber-owned',
  subscription: { pages: 'ordered', unsubscribe: 'explicit', ownerDispose: 'terminates' },
  durableLedger: {
    operationId: 'commandId',
    scope: 'owner-provider',
    providerAffinity: 'generation-fenced',
    survivesClientDispose: true,
    payloadMatch: 'structural-exact',
    retention: { active: 'logical-task-lifetime', recoveryDays: 30 },
  },
}
assert.equal(validateClient(clientDescriptor), true, ajv.errorsText(validateClient.errors))
assert.deepEqual(
  new Set(clientDescriptor.operations),
  new Set([
    'createOrBind',
    'send',
    'decideApproval',
    'requestMemberSelfIntroduction',
    'cancelMemberSelfIntroduction',
    'subscribe',
    'dispose',
  ]),
)

for (
  const [binding, afterSequence, events] of [
    [scenario.bindings[0], 3, [scenario.pendingEvents[0], scenario.pendingEvents[2]]],
    [scenario.bindings[1], 10, [scenario.pendingEvents[1]]],
  ]
) {
  const subscription = {
    $schema: schemas.get('agent-loop-event-subscription.v3.schema.json').$id,
    contract: 'cordisx.agent-loop-event-subscription/v3',
    schemaVersion: 3,
    subscriptionId: `subscription-${binding.binding.bindingId}`,
    binding: structuredClone(binding.binding),
    afterSequence,
    snapshotSequence: events.at(-1).sequence,
  }
  const page = {
    $schema: schemas.get('agent-loop-event-page.v3.schema.json').$id,
    contract: 'cordisx.agent-loop-event-page/v3',
    schemaVersion: 3,
    subscription,
    afterSequence,
    phase: 'replay',
    events: structuredClone(events),
    nextAfterSequence: events.at(-1).sequence,
    hasMore: false,
  }
  assert.equal(validateSubscription(subscription), true, ajv.errorsText(validateSubscription.errors))
  assert.equal(validatePage(page), true, ajv.errorsText(validatePage.errors))
  assert.ok(
    page.events.every(event => isDeepStrictEqual(event.binding, subscription.binding)),
    'multi-binding approval subscriptions must remain isolated',
  )
  assert.deepEqual(
    page.events.map(event => event.sequence),
    Array.from({ length: events.length }, (_, index) => afterSequence + index + 1),
  )
}

const owner = createApprovalOwner(scenario.bindings, scenario.pendingEvents)
const firstCommand = scenario.commands[0]
const executed = owner.decide(firstCommand, 'client-a')
assert.deepEqual(executed.errors, [])
assert.equal(executed.result.status, 'accepted')
assert.equal(executed.result.delivery.disposition, 'executed')
assert.equal(executed.event.approval.outcome, 'approved')
assert.equal(executed.event.causation.operationId, firstCommand.commandId)
assert.equal(owner.decisionCount(), 1)

const replayed = owner.decide(firstCommand, 'client-a')
assert.deepEqual(replayed.errors, [])
assert.equal(replayed.result.delivery.disposition, 'replayed')
assert.equal(owner.decisionCount(), 1, 'same-client replay performed a second decision')
const reconciled = owner.decide(firstCommand, 'client-after-reload')
assert.deepEqual(reconciled.errors, [])
assert.equal(reconciled.result.delivery.disposition, 'reconciled')
assert.equal(owner.decisionCount(), 1, 'cross-client reconciliation performed a second decision')

const divergentPayload = structuredClone(firstCommand)
divergentPayload.decision = 'deny'
const operationConflict = owner.decide(divergentPayload, 'client-a')
assert.equal(operationConflict.result.status, 'conflict')
assert.equal(operationConflict.result.code, 'operation-conflict')
assert.equal(owner.decisionCount(), 1)

for (const command of scenario.commands.slice(1)) {
  const outcome = owner.decide(command, 'client-a')
  assert.deepEqual(outcome.errors, [])
  assert.equal(outcome.result.status, 'accepted')
  assert.equal(outcome.result.delivery.disposition, 'executed')
  assert.equal(outcome.event.approval.outcome, outcomeByDecision[command.decision])
  assert.equal(outcome.event.causation.operationId, command.commandId)
}
assert.equal(owner.decisionCount(), 3)
assert.equal(owner.approvalState(scenario.bindings[0], 'turn-a', 'approval-a').outcome, 'approved')
assert.equal(owner.approvalState(scenario.bindings[1], 'turn-b', 'approval-b').outcome, 'denied')
assert.equal(owner.approvalState(scenario.bindings[0], 'turn-c', 'approval-c').outcome, 'cancelled')

const conflictVector = await vector('invalid/approval-decision-conflicts.json')
const cases = new Map(conflictVector.cases.map(value => [value.mutation, value]))
function expectOutcome(outcome, mutation) {
  const expected = cases.get(mutation)
  assert.deepEqual(outcome.errors, [])
  assert.equal(outcome.result.status, expected.expectedStatus)
  assert.equal(outcome.result.code, expected.expectedCode)
}

for (
  const [mutation, mutate] of [
    ['binding-generation', command => {
      command.binding.binding.generation += 1
    }],
    ['turn', command => {
      command.turn = 'wrong-turn'
    }],
    ['approval-id', command => {
      command.approvalId = 'wrong-approval'
    }],
  ]
) {
  const isolated = createApprovalOwner(scenario.bindings, scenario.pendingEvents)
  const command = structuredClone(firstCommand)
  command.commandId = `operation-${mutation}`
  mutate(command)
  expectOutcome(isolated.decide(command, 'client-a'), mutation)
  assert.equal(isolated.decisionCount(), 0)
}

const alreadyResolved = createApprovalOwner(scenario.bindings, scenario.pendingEvents)
assert.equal(alreadyResolved.decide(firstCommand, 'client-a').result.status, 'accepted')
const differentResolution = structuredClone(firstCommand)
differentResolution.commandId = 'operation-different-resolution'
differentResolution.decision = 'deny'
expectOutcome(alreadyResolved.decide(differentResolution, 'client-a'), 'already-differently-resolved')
assert.equal(alreadyResolved.decisionCount(), 1)

for (
  const [mutation, prepare] of [
    ['approval-expired', isolated => isolated.markExpired(scenario.bindings[0], 'turn-a', 'approval-a')],
    ['approval-unavailable', isolated => isolated.markUnavailable(scenario.bindings[0], 'turn-a', 'approval-a')],
    ['provider-replaced', isolated => isolated.setProviderState('replaced')],
    ['operation-expired', isolated => isolated.setForcedOperationCode('operation-expired')],
    ['reconciliation-required', isolated => isolated.setForcedOperationCode('reconciliation-required')],
  ]
) {
  const isolated = createApprovalOwner(scenario.bindings, scenario.pendingEvents)
  prepare(isolated)
  const command = structuredClone(firstCommand)
  command.commandId = `operation-${mutation}`
  expectOutcome(isolated.decide(command, 'client-a'), mutation)
  assert.equal(isolated.decisionCount(), 0)
}

for (
  const authorization of [
    { capability: 'approvals.decide', state: 'denied', code: 'policy-denied' },
    { capability: 'approvals.decide', state: 'unavailable', code: 'host-unavailable' },
  ]
) {
  const isolated = createApprovalOwner(scenario.bindings, scenario.pendingEvents)
  isolated.setAuthorization(authorization)
  const command = structuredClone(firstCommand)
  command.commandId = `operation-auth-${authorization.state}`
  const outcome = isolated.decide(command, 'client-a')
  assert.deepEqual(outcome.errors, [])
  assert.equal(outcome.result.status, authorization.state)
  assert.equal(outcome.result.code, undefined)
  assert.equal(isolated.decisionCount(), 0)
}

for (
  const mutate of [
    command => {
      command.callback = 'approve'
    },
    command => {
      command.binding.binding.generation = 0
    },
    command => {
      delete command.approvalId
    },
    command => {
      command.decision = 'allow'
    },
  ]
) {
  const invalid = structuredClone(firstCommand)
  mutate(invalid)
  assert.equal(validateCommand(invalid), false, 'invalid approval command must fail schema validation')
}

const missingCausation = structuredClone(executed.event)
delete missingCausation.causation
assert.notDeepEqual(approvalEventErrors(missingCausation, scenario.pendingEvents[0], firstCommand.commandId), [])
const wrongCausation = structuredClone(executed.event)
wrongCausation.causation.operationId = 'other-operation'
assert.notDeepEqual(approvalEventErrors(wrongCausation, scenario.pendingEvents[0], firstCommand.commandId), [])
const expiredEvent = structuredClone(executed.event)
expiredEvent.eventId = 'event-expired'
expiredEvent.approval.outcome = 'expired'
delete expiredEvent.causation
assert.deepEqual(approvalEventErrors(expiredEvent, scenario.pendingEvents[0]), [])

console.log(
  'Agent Loop v3 conformance: preserved v2 create/send plus durable approvals and member self-introduction/cancellation, exact fences, typed failures, and causation checks passed',
)
