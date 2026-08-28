import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'
import { validateSubscription } from './connector-bound-client.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const schemaDirectory = path.resolve(here, '../schemas')
const schemaFiles = [
  'connector-common.v1.schema.json',
  'connector-event.v1.schema.json',
  'connector-command.v1.schema.json',
  'connector-client-common.v1.schema.json',
  'connector-client-binding.v1.schema.json',
  'connector-bound-client-call.v1.schema.json',
  'connector-client-snapshot.v1.schema.json',
  'connector-event-subscription.v1.schema.json',
  'connector-event-page.v1.schema.json',
  'connector-client-result.v1.schema.json',
  'connector-bound-client-result.v1.schema.json'
]

const ajv = new Ajv2020({ allErrors: true, strict: true })
addFormats(ajv)
const schemas = new Map()
for (const schemaFile of schemaFiles) {
  const schema = JSON.parse(await readFile(path.join(schemaDirectory, schemaFile), 'utf8'))
  schemas.set(schemaFile, schema)
  ajv.addSchema(schema)
}

const validateResultSchema = ajv.getSchema(schemas.get('connector-bound-client-result.v1.schema.json').$id)
const validatePageSchema = ajv.getSchema(schemas.get('connector-event-page.v1.schema.json').$id)
const schema = name => schemas.get(name).$id

function validateResult(value) {
  assert.ok(validateResultSchema(value), ajv.errorsText(validateResultSchema.errors))
}

function validatePage(value) {
  assert.ok(validatePageSchema(value), ajv.errorsText(validatePageSchema.errors))
}

const registration = {
  connectorId: 'connector.example',
  registrationId: 'registration-1',
  generation: 1
}

const authorization = (capability, state = 'allowed') => ({
  capability,
  state,
  code: state === 'allowed' ? 'allowed' : 'principal-unavailable'
})

const stopCommand = {
  $schema: schema('connector-command.v1.schema.json'),
  contract: 'cordisx.connector-command/v1',
  schemaVersion: 1,
  type: 'run.stop',
  commandId: 'command-1',
  registration,
  conversation: 'conversation-1',
  run: 'run-1'
}

function deferred() {
  let release
  const promise = new Promise(resolve => {
    release = resolve
  })
  return { promise, release }
}

function unavailableResult(type, callId) {
  return {
    $schema: schema('connector-bound-client-result.v1.schema.json'),
    contract: 'cordisx.bound-connector-client-result/v1',
    schemaVersion: 1,
    type,
    callId,
    status: 'unavailable',
    authorization: authorization({ discover: 'connector.discovery', execute: 'connector.command.execute', subscribe: 'connector.events.subscribe' }[type], 'unavailable')
  }
}

function event(sequence, type) {
  return {
    $schema: schema('connector-event.v1.schema.json'),
    contract: 'cordisx.connector-event/v1',
    schemaVersion: 1,
    eventId: `event-${sequence}`,
    registration,
    sequence,
    occurredAt: '2026-08-28T00:00:00.000Z',
    type,
    conversation: 'conversation-1',
    ...(type === 'run.started' ? { run: 'run-1' } : {})
  }
}

function page(subscription, afterSequence, phase, eventValue) {
  return {
    $schema: schema('connector-event-page.v1.schema.json'),
    contract: 'cordisx.connector-event-page/v1',
    schemaVersion: 1,
    subscription,
    afterSequence,
    phase,
    events: [eventValue],
    nextAfterSequence: eventValue.sequence,
    hasMore: false
  }
}

function subscriptionVector(result, pages) {
  return {
    name: 'fake-host-bound-subscription',
    binding: {
      $schema: schema('connector-client-binding.v1.schema.json'),
      contract: 'cordisx.connector-client-binding/v1',
      schemaVersion: 1,
      bindingId: 'binding-1',
      issuedAt: '2026-08-28T00:00:00.000Z',
      principal: { principalHandle: 'principal-1', pluginId: 'consumer.plugin', generation: 1 },
      userHandle: 'user-1',
      authorizations: [{ authorizationId: 'authorization-1', capability: 'connector.events.subscribe', target: { kind: 'registration', registration } }]
    },
    context: {
      decision: 'allowed',
      registrations: [{ registration, state: 'active' }]
    },
    call: {
      $schema: schema('connector-bound-client-call.v1.schema.json'),
      contract: 'cordisx.bound-connector-client-call/v1',
      schemaVersion: 1,
      type: 'subscribe',
      callId: result.callId,
      registration,
      afterSequence: -1
    },
    result,
    pages
  }
}

function fakeHostBoundClient({ ignoreCancellation = false, calls = { discover: 0, execute: 0 } } = {}) {
  let disposed = false
  const records = []

  function buildUnavailable(type, callId) {
    const result = unavailableResult(type, callId)
    validateResult(result)
    return result
  }

  return {
    async discover() {
      calls.discover += 1
      if (disposed) return buildUnavailable('discover', 'discover-disposed')
      const result = {
        $schema: schema('connector-bound-client-result.v1.schema.json'),
        contract: 'cordisx.bound-connector-client-result/v1',
        schemaVersion: 1,
        type: 'discover',
        callId: 'discover-1',
        status: 'accepted',
        authorization: authorization('connector.discovery'),
        snapshot: {
          $schema: schema('connector-client-snapshot.v1.schema.json'),
          contract: 'cordisx.connector-client-snapshot/v1',
          schemaVersion: 1,
          observedAt: '2026-08-28T00:00:00.000Z',
          registrations: [{ registration, capabilities: ['conversation.open', 'events.receive'], availability: 'available' }]
        }
      }
      validateResult(result)
      return result
    },

    async execute(command) {
      calls.execute += 1
      if (disposed) return buildUnavailable('execute', 'execute-disposed')
      assert.deepEqual(command, stopCommand)
      const result = {
        $schema: schema('connector-bound-client-result.v1.schema.json'),
        contract: 'cordisx.bound-connector-client-result/v1',
        schemaVersion: 1,
        type: 'execute',
        callId: 'execute-1',
        status: 'accepted',
        authorization: authorization('connector.command.execute'),
        execution: { kind: 'run.stopped', binding: { registration, conversation: 'conversation-1', run: 'run-1' } }
      }
      validateResult(result)
      return result
    },

    async subscribe(requestedRegistration, afterSequence) {
      assert.deepEqual(requestedRegistration, registration)
      assert.equal(afterSequence, -1)
      if (disposed) return { result: buildUnavailable('subscribe', 'subscribe-disposed') }

      const result = {
        $schema: schema('connector-bound-client-result.v1.schema.json'),
        contract: 'cordisx.bound-connector-client-result/v1',
        schemaVersion: 1,
        type: 'subscribe',
        callId: 'subscribe-1',
        status: 'accepted',
        authorization: authorization('connector.events.subscribe'),
        subscription: {
          $schema: schema('connector-event-subscription.v1.schema.json'),
          contract: 'cordisx.connector-event-subscription/v1',
          schemaVersion: 1,
          subscriptionId: 'subscription-1',
          registration,
          afterSequence,
          snapshotSequence: 0
        }
      }
      validateResult(result)

      const gate = deferred()
      const record = { gate, stopped: false }
      records.push(record)
      const firstPage = page(result.subscription, -1, 'replay', event(0, 'conversation.opened'))
      const secondPage = page(result.subscription, 0, 'live', event(1, 'run.started'))
      validatePage(firstPage)
      validatePage(secondPage)

      const pages = (async function* () {
        yield firstPage
        await gate.promise
        if (ignoreCancellation || (!record.stopped && !disposed)) yield secondPage
      })()

      return {
        result,
        handle: {
          subscription: result.subscription,
          pages,
          unsubscribe() {
            if (!ignoreCancellation) record.stopped = true
          }
        }
      }
    },

    dispose() {
      disposed = true
      if (!ignoreCancellation) {
        for (const record of records) record.stopped = true
      }
    },

    releaseAll() {
      for (const record of records) record.gate.release()
    }
  }
}

const control = fakeHostBoundClient()
const controlSubscribe = await control.subscribe(registration, -1)
assert.equal(controlSubscribe.result.status, 'accepted')
const controlIterator = controlSubscribe.handle.pages[Symbol.asyncIterator]()
const controlFirst = await controlIterator.next()
assert.equal(controlFirst.done, false)
assert.equal(controlFirst.value.nextAfterSequence, 0)
control.releaseAll()
const controlSecond = await controlIterator.next()
assert.equal(controlSecond.done, false)
assert.equal(controlSecond.value.nextAfterSequence, 1)
assert.equal((await controlIterator.next()).done, true)
assert.deepEqual(validateSubscription(subscriptionVector(controlSubscribe.result, [controlFirst.value, controlSecond.value])), [])

const unsubscribeClient = fakeHostBoundClient()
const unsubscribeSubscribe = await unsubscribeClient.subscribe(registration, -1)
const unsubscribeIterator = unsubscribeSubscribe.handle.pages[Symbol.asyncIterator]()
const unsubscribeFirst = await unsubscribeIterator.next()
assert.equal(unsubscribeFirst.done, false)
unsubscribeSubscribe.handle.unsubscribe()
unsubscribeClient.releaseAll()
assert.equal((await unsubscribeIterator.next()).done, true)
assert.deepEqual(validateSubscription(subscriptionVector(unsubscribeSubscribe.result, [unsubscribeFirst.value])), [])

const ownerCalls = { discover: 0, execute: 0 }
const ownerClient = fakeHostBoundClient({ calls: ownerCalls })
const activeDiscover = await ownerClient.discover()
assert.equal(activeDiscover.status, 'accepted')
validateResult(activeDiscover)
const invalidActiveDiscover = structuredClone(activeDiscover)
invalidActiveDiscover.snapshot.registrations[0].capabilities[1] = 'events.subscribe'
assert.equal(validateResultSchema(invalidActiveDiscover), false, 'AJV must reject non-capability events.subscribe in an active discovery snapshot')
const activeExecute = await ownerClient.execute(stopCommand)
assert.equal(activeExecute.status, 'accepted')
validateResult(activeExecute)
assert.deepEqual(ownerCalls, { discover: 1, execute: 1 }, 'pre-gate must exercise accepted discover and execute exactly once before dispose')
const ownerSubscribe = await ownerClient.subscribe(registration, -1)
const ownerIterator = ownerSubscribe.handle.pages[Symbol.asyncIterator]()
const ownerFirst = await ownerIterator.next()
assert.equal(ownerFirst.done, false)
ownerClient.dispose()
ownerClient.releaseAll()
assert.equal((await ownerIterator.next()).done, true)
assert.deepEqual(validateSubscription(subscriptionVector(ownerSubscribe.result, [ownerFirst.value])), [])

for (const result of [
  await ownerClient.discover(),
  await ownerClient.execute(stopCommand),
  (await ownerClient.subscribe(registration, -1)).result
]) {
  assert.equal(result.status, 'unavailable')
  validateResult(result)
}

const unsubscribeMutant = fakeHostBoundClient({ ignoreCancellation: true })
const unsubscribeMutantSubscribe = await unsubscribeMutant.subscribe(registration, -1)
const unsubscribeMutantIterator = unsubscribeMutantSubscribe.handle.pages[Symbol.asyncIterator]()
assert.equal((await unsubscribeMutantIterator.next()).done, false)
unsubscribeMutantSubscribe.handle.unsubscribe()
unsubscribeMutant.releaseAll()
assert.equal((await unsubscribeMutantIterator.next()).done, false, 'mutation self-check: unsubscribe no-op must leak page 2')

const ownerMutant = fakeHostBoundClient({ ignoreCancellation: true })
const ownerMutantSubscribe = await ownerMutant.subscribe(registration, -1)
const ownerMutantIterator = ownerMutantSubscribe.handle.pages[Symbol.asyncIterator]()
assert.equal((await ownerMutantIterator.next()).done, false)
ownerMutant.dispose()
ownerMutant.releaseAll()
assert.equal((await ownerMutantIterator.next()).done, false, 'mutation self-check: owner dispose no-op must leak page 2')

console.log('Bound Connector fake Host/plugin consumer AJV, deferred lifecycle, and mutation pre-gate: all cases passed')
