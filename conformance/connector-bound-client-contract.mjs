import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'
import { validateSubscription } from './connector-bound-client.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const names = ['connector-common.v1.schema.json', 'connector-event.v1.schema.json', 'connector-command.v1.schema.json', 'connector-client-common.v1.schema.json', 'connector-client-snapshot.v1.schema.json', 'connector-event-subscription.v1.schema.json', 'connector-event-page.v1.schema.json', 'connector-client-result.v1.schema.json', 'connector-bound-client-result.v1.schema.json']
const schemas = new Map(await Promise.all(names.map(async name => [name, JSON.parse(await readFile(path.join(root, 'schemas', name), 'utf8'))])))
const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true })
addFormats(ajv); for (const schema of schemas.values()) ajv.addSchema(schema)
const resultValidator = ajv.getSchema(schemas.get('connector-bound-client-result.v1.schema.json').$id)
const pageValidator = ajv.getSchema(schemas.get('connector-event-page.v1.schema.json').$id)
if (resultValidator === undefined || pageValidator === undefined) throw new Error('fake Host validators were not registered')
const validateResult = value => assert.equal(resultValidator(value), true, JSON.stringify(resultValidator.errors))
const validatePage = value => assert.equal(pageValidator(value), true, JSON.stringify(pageValidator.errors))
const registration = { registrationId: 'registration-1', connectorId: 'agent.connector', generation: 1 }
const identity = { $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/connector-bound-client-result.v1.schema.json', contract: 'cordisx.bound-connector-client-result/v1', schemaVersion: 1 }
const allowed = capability => ({ capability, state: 'allowed', code: 'allowed' })
const unavailable = capability => ({ capability, state: 'unavailable', code: 'registration-unavailable' })

function fakeHostBoundClient() {
  let disposed = false
  const unavailableResult = (callId, type, capability) => ({ ...identity, callId, type, status: 'unavailable', authorization: unavailable(capability) })
  return {
    async discover() { const result = disposed ? unavailableResult('discover-after-dispose', 'discover', 'connector.discovery') : { ...identity, callId: 'discover-1', type: 'discover', status: 'accepted', authorization: allowed('connector.discovery'), snapshot: { $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/connector-client-snapshot.v1.schema.json', contract: 'cordisx.connector-client-snapshot/v1', schemaVersion: 1, observedAt: '2026-08-28T00:00:00.000Z', registrations: [] } }; validateResult(result); return result },
    async execute(command) { const result = disposed ? unavailableResult(command.commandId, 'execute', 'connector.command.execute') : { ...identity, callId: command.commandId, type: 'execute', status: 'accepted', authorization: allowed('connector.command.execute'), execution: { kind: 'run.stopped', binding: { registration, conversation: command.conversation, run: command.run } } }; validateResult(result); return result },
    async subscribe(requestedRegistration, afterSequence) {
      const result = disposed ? unavailableResult('subscribe-after-dispose', 'subscribe', 'connector.events.subscribe') : { ...identity, callId: 'subscribe-1', type: 'subscribe', status: 'accepted', authorization: allowed('connector.events.subscribe'), subscription: { $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/connector-event-subscription.v1.schema.json', contract: 'cordisx.connector-event-subscription/v1', schemaVersion: 1, subscriptionId: 'subscription-1', registration: requestedRegistration, afterSequence, snapshotSequence: 0 } }
      validateResult(result); if (result.status !== 'accepted') return { result }
      let stopped = false
      const page = { $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/connector-event-page.v1.schema.json', contract: 'cordisx.connector-event-page/v1', schemaVersion: 1, subscription: result.subscription, afterSequence: -1, phase: 'replay', events: [{ $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/connector-event.v1.schema.json', contract: 'cordisx.connector-event/v1', schemaVersion: 1, eventId: 'event-0', registration, sequence: 0, occurredAt: '2026-08-28T00:00:00.000Z', type: 'conversation.opened', conversation: 'conversation-1' }], nextAfterSequence: 0, hasMore: false }
      validatePage(page)
      return { result, handle: { subscription: result.subscription, pages: (async function * () { if (!stopped && !disposed) yield page })(), unsubscribe() { stopped = true } } }
    },
    dispose() { disposed = true },
  }
}

const client = fakeHostBoundClient()
const command = { $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/connector-command.v1.schema.json', contract: 'cordisx.connector-command/v1', schemaVersion: 1, commandId: 'execute-1', registration, type: 'run.stop', conversation: 'conversation-1', run: 'run-1' }
const discovered = await client.discover(); assert.equal(discovered.status, 'accepted')
const executed = await client.execute(command); assert.equal(executed.status, 'accepted')
const subscribed = await client.subscribe(registration, -1); assert.equal(subscribed.result.status, 'accepted')
const iterator = subscribed.handle.pages[Symbol.asyncIterator](); const first = await iterator.next(); assert.equal(first.done, false)
const vector = { case: 'subscription', binding: { $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/connector-client-binding.v1.schema.json', contract: 'cordisx.connector-client-binding/v1', schemaVersion: 1, bindingId: 'binding-1', issuedAt: '2026-08-28T00:00:00.000Z', principal: { principalHandle: 'principal-1', pluginId: 'consumer.plugin', generation: 1 }, userHandle: 'user-1', authorizations: [{ authorizationId: 'authorization-1', capability: 'connector.events.subscribe', target: { kind: 'registration', registration } }] }, context: { decision: 'allowed', registrations: [{ registration, state: 'active' }] }, call: { $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/connector-bound-client-call.v1.schema.json', contract: 'cordisx.bound-connector-client-call/v1', schemaVersion: 1, callId: 'subscribe-1', type: 'subscribe', registration, afterSequence: -1 }, result: subscribed.result, pages: [first.value] }
assert.deepEqual(validateSubscription(vector), [])
subscribed.handle.unsubscribe(); assert.equal((await iterator.next()).done, true)
const owned = await client.subscribe(registration, -1); const ownedIterator = owned.handle.pages[Symbol.asyncIterator](); assert.equal((await ownedIterator.next()).done, false)
client.dispose(); assert.equal((await ownedIterator.next()).done, true)
for (const result of [await client.discover(), await client.execute(command), (await client.subscribe(registration, -1)).result]) { assert.equal(result.status, 'unavailable'); validateResult(result) }
console.log('Bound Connector fake Host/plugin consumer AJV and lifecycle pre-gate: all cases passed')
