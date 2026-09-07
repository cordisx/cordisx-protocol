import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import Ajv2020 from 'ajv/dist/2020.js'

const ajv = new Ajv2020({ strict: true, allErrors: true, allowUnionTypes: true })
const names = [
  'agent-loop-common',
  'entity-settings-navigation-request',
  'entity-settings-availability-result',
  'entity-settings-navigation-result',
  'route-link-reference',
  'route-link-resolution-result',
]
for (const name of names) {
  ajv.addSchema(JSON.parse(await readFile(new URL(`../schemas/${name}.v1.schema.json`, import.meta.url))))
}
const valid = (name, value) =>
  ajv.getSchema(`https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/${name}.v1.schema.json`)(value)
const identity = { agentId: 'agent', revision: 'frozen' }
assert.ok(valid('entity-settings-navigation-request', { identity }))
for (const key of ['owner', 'source', 'generation', 'url', 'route', 'contributionId']) {
  assert.equal(valid('entity-settings-navigation-request', { identity, [key]: 'forged' }), false)
  assert.equal(valid('route-link-reference', { id: 'room', [key]: 'forged' }), false)
}
assert.equal(valid('entity-settings-navigation-request', { identity: { ...identity, newest: true } }), false)
assert.equal(valid('entity-settings-navigation-request', { identity: { ...identity, revision: '' } }), false)
assert.ok(valid('entity-settings-availability-result', { status: 'available' }))
assert.ok(valid('entity-settings-navigation-result', { status: 'accepted', code: 'opened' }))
assert.ok(valid('route-link-reference', { id: 'room', params: { roomId: 'one', optional: null } }))
assert.equal(valid('route-link-reference', { id: 'room', params: { nested: {} } }), false)
assert.ok(valid('route-link-resolution-result', { status: 'accepted', url: 'host-generated-link' }))
assert.equal(valid('route-link-resolution-result', { status: 'accepted', url: 'link', owner: 'hidden' }), false)

// Host-neutral reference model: availability cannot authorize a later open.
let caller = 'source-a/g1'
let targets = [{ identity, visible: true, owner: 'entity-source-a/g1' }]
let opens = 0
const match = input =>
  targets.filter(target =>
    target.visible
    && target.identity.agentId === input.agentId && target.identity.revision === input.revision
  )
const service = boundCaller => ({
  get: input => caller === boundCaller && match(input).length === 1,
  open: input => {
    if (caller !== boundCaller || match(input).length !== 1) return false
    opens += 1
    return true
  },
})
const first = service(caller)
assert.equal(first.get(identity), true)
targets[0].visible = false
assert.equal(first.open(identity), false)
targets[0].visible = true
targets.push({ identity, visible: true, owner: 'entity-source-b/g2' })
assert.equal(first.open(identity), false)
targets.pop()
assert.equal(first.open({ ...identity, revision: 'latest' }), false)
caller = 'source-a/g2'
assert.equal(first.open(identity), false)
assert.equal(service(caller).open(identity), true)
assert.equal(opens, 1)
console.log('navigation parity v1 conformance passed')
