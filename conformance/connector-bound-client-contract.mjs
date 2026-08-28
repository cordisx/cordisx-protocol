import assert from 'node:assert/strict'

const registration = { registrationId: 'registration-1', connectorId: 'agent.connector', generation: 1 }
const resultIdentity = {
  $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/connector-bound-client-result.v1.schema.json',
  contract: 'cordisx.bound-connector-client-result/v1', schemaVersion: 1,
}
const allowed = capability => ({ capability, state: 'allowed', code: 'allowed' })
const unavailable = capability => ({ capability, state: 'unavailable', code: 'registration-unavailable' })

function fakeHostBoundClient() {
  let disposed = false
  let unsubscribed = false
  const unavailableResult = (callId, type, capability) => ({ ...resultIdentity, callId, type, status: 'unavailable', authorization: unavailable(capability) })
  return {
    $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/connector-bound-client.v1.schema.json',
    contract: 'cordisx.bound-connector-client/v1', schemaVersion: 1,
    async discover() {
      return disposed ? unavailableResult('discover-after-dispose', 'discover', 'connector.discovery') : {
        ...resultIdentity, callId: 'discover-1', type: 'discover', status: 'accepted', authorization: allowed('connector.discovery'),
        snapshot: { $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/connector-client-snapshot.v1.schema.json', contract: 'cordisx.connector-client-snapshot/v1', schemaVersion: 1, observedAt: '2026-08-28T00:00:00.000Z', registrations: [] },
      }
    },
    async execute(command) {
      return disposed ? unavailableResult(command.commandId, 'execute', 'connector.command.execute') : {
        ...resultIdentity, callId: command.commandId, type: 'execute', status: 'accepted', authorization: allowed('connector.command.execute'),
        execution: { kind: 'run.stopped', binding: { registration, conversation: command.conversation, run: command.run } },
      }
    },
    async subscribe(requestedRegistration, afterSequence) {
      if (disposed) return unavailableResult('subscribe-after-dispose', 'subscribe', 'connector.events.subscribe')
      const subscription = { $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/connector-event-subscription.v1.schema.json', contract: 'cordisx.connector-event-subscription/v1', schemaVersion: 1, subscriptionId: 'subscription-1', registration: requestedRegistration, afterSequence, snapshotSequence: 0 }
      return {
        ...resultIdentity, callId: 'subscribe-1', type: 'subscribe', status: 'accepted', authorization: allowed('connector.events.subscribe'),
        subscription: {
          subscription,
          pages: (async function * pages() {
            if (!unsubscribed && !disposed) yield { $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/connector-event-page.v1.schema.json', contract: 'cordisx.connector-event-page/v1', schemaVersion: 1, subscription, afterSequence: -1, phase: 'replay', events: [], nextAfterSequence: -1, hasMore: false }
            if (!unsubscribed && !disposed) yield { $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/connector-event-page.v1.schema.json', contract: 'cordisx.connector-event-page/v1', schemaVersion: 1, subscription, afterSequence: -1, phase: 'live', events: [], nextAfterSequence: -1, hasMore: false }
          })(),
          unsubscribe() { unsubscribed = true },
        },
      }
    },
    dispose() { disposed = true; unsubscribed = true },
  }
}

const client = fakeHostBoundClient()
const discovered = await client.discover()
assert.equal(discovered.contract, resultIdentity.contract)
assert.equal(discovered.$schema, resultIdentity.$schema)
assert.equal(discovered.type, 'discover')
assert.equal(discovered.status, 'accepted')
assert.ok('snapshot' in discovered)

const command = { $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/connector-command.v1.schema.json', contract: 'cordisx.connector-command/v1', schemaVersion: 1, commandId: 'execute-1', registration, type: 'run.stop', conversation: 'conversation-1', run: 'run-1' }
const executed = await client.execute(command)
assert.equal(executed.type, 'execute')
assert.equal(executed.status, 'accepted')
assert.deepEqual(executed.execution.binding, { registration, conversation: 'conversation-1', run: 'run-1' })

const subscribed = await client.subscribe(registration, -1)
assert.equal(subscribed.type, 'subscribe')
assert.equal(subscribed.status, 'accepted')
const iterator = subscribed.subscription.pages[Symbol.asyncIterator]()
assert.equal((await iterator.next()).done, false)
subscribed.subscription.unsubscribe()
assert.equal((await iterator.next()).done, true)
client.dispose()
const afterDispose = await client.discover()
assert.equal(afterDispose.status, 'unavailable')
assert.equal(afterDispose.authorization.state, 'unavailable')
console.log('Bound Connector fake Host/plugin consumer contract: all cases passed')
