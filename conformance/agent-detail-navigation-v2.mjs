import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Ajv2020 from 'ajv/dist/2020.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ajv = new Ajv2020({ strict: true, allErrors: true })
const families = [
  'agent-session-detail-reference-request',
  'agent-session-detail-reference-result',
  'agent-detail-navigation-request',
  'agent-detail-navigation-result',
]
for (const name of ['session-common.v1', 'agent-detail-reference.v1', ...families.map(name => `${name}.v2`)]) {
  ajv.addSchema(JSON.parse(await readFile(path.join(root, 'schemas', `${name}.schema.json`), 'utf8')))
}
const valid = (name, value) =>
  ajv.getSchema(`https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/${name}.v2.schema.json`)(value)
const target = { kind: 'host', ref: 'issued.opaque-capability' }
assert.equal(valid(families[0], { sessionId: 'historical-session' }), true)
assert.equal(valid(families[1], { status: 'accepted', sessionId: 'historical-session', target }), true)
assert.equal(valid(families[1], { status: 'denied', code: 'ambiguous-session' }), true)
assert.equal(valid(families[2], { target }), true)
assert.equal(valid(families[3], { status: 'accepted', code: 'opened' }), true)
for (const extra of ['owner', 'source', 'roomId', 'url', 'nativeId', 'generation', 'runningStatus']) {
  assert.equal(valid(families[0], { sessionId: 'historical-session', [extra]: 'untrusted' }), false)
  assert.equal(
    valid(families[1], { status: 'accepted', sessionId: 'historical-session', target, [extra]: 'untrusted' }),
    false,
  )
  assert.equal(valid(families[2], { target, [extra]: 'untrusted' }), false)
}
assert.equal(valid(families[2], { target: { kind: 'external', ref: 'https://example.invalid/' } }), false)
assert.equal(valid(families[2], { target: { ...target, url: 'app://private' } }), false)

// Host-neutral authority model. Native storage and routing are Host integration gates.
const owner = { source: 'source-a', pluginId: 'chatroom', generation: 'g1', connection: 'c1' }
const coordinate = value => JSON.stringify([value.source, value.pluginId, value.generation, value.connection])
let currentOwner = { ...owner }
let records = [{ source: owner.source, pluginId: owner.pluginId, sessionId: 'historical-session', revision: 'r1' }]
let bridge = true
let permitted = true
let sequence = 0
let afterRead = () => {}
const issued = new Map()
const effects = { create: 0, resume: 0, recovery: 0, submit: 0, replay: 0, write: 0, navigate: 0 }
const active = caller => permitted && coordinate(caller) === coordinate(currentOwner)
const mapping = caller =>
  records.filter(record => record.source === caller.source && record.pluginId === caller.pluginId)
const get = async caller => {
  if (!active(caller)) return { status: 'denied', code: 'permission-denied' }
  if (!bridge) return { status: 'unavailable', code: 'unsupported' }
  const matches = mapping(caller).filter(record => record.sessionId === 'historical-session')
  if (matches.length > 1) return { status: 'denied', code: 'ambiguous-session' }
  const record = matches[0]
  if (!record) return { status: 'unavailable', code: 'session-unavailable' }
  const revision = record.revision
  await afterRead()
  if (!active(caller) || record.revision !== revision) return { status: 'unavailable', code: 'generation-replaced' }
  const ref = `issued.${++sequence}`
  issued.set(ref, { owner: coordinate(caller), sessionId: record.sessionId, revision })
  return { status: 'accepted', sessionId: record.sessionId, target: { kind: 'host', ref } }
}
const open = async (caller, reference) => {
  const entry = issued.get(reference.ref)
  if (reference.kind !== 'host' || !active(caller) || entry?.owner !== coordinate(caller)) return false
  const matches = mapping(caller).filter(record => record.sessionId === entry.sessionId)
  if (matches.length !== 1 || matches[0].revision !== entry.revision) return false
  await afterRead()
  if (!active(caller) || matches[0].revision !== entry.revision) return false
  effects.navigate++
  return true
}
const first = await get(owner)
assert.equal(first.status, 'accepted', 'an unloaded persisted mapping does not require a live Agent')
assert.equal(await open(owner, first.target), true)
assert.equal(
  await open({ ...owner, source: 'source-b' }, first.target),
  false,
  'same plugin id at another source is foreign',
)
assert.equal(await open(owner, { kind: 'host', ref: 'forged' }), false)
records[0].revision = 'r2'
assert.equal(await open(owner, first.target), false, 'mapping replacement invalidates the old capability')
const second = await get(owner)
assert.equal(await open(owner, second.target), true, 'fresh issuance can open the new mapping')
records.push({ ...records[0] })
assert.deepEqual(await get(owner), { status: 'denied', code: 'ambiguous-session' })
assert.equal(await open(owner, second.target), false, 'open also rejects ambiguity')
records.pop()
currentOwner = { ...owner, generation: 'g2' }
assert.equal(await open(currentOwner, second.target), false)
assert.equal(await open(owner, second.target), false)
currentOwner = { ...owner, connection: 'c2' }
assert.equal(await open(currentOwner, second.target), false)
currentOwner = { ...owner }
permitted = false
assert.equal(await open(owner, second.target), false)
permitted = true
bridge = false
assert.deepEqual(await get(owner), { status: 'unavailable', code: 'unsupported' })
bridge = true
records = []
assert.deepEqual(await get(owner), { status: 'unavailable', code: 'session-unavailable' })
records = [{ source: owner.source, pluginId: owner.pluginId, sessionId: 'historical-session', revision: 'r3' }]
afterRead = () => {
  currentOwner = { ...owner, generation: 'g3' }
}
assert.notEqual((await get(owner)).status, 'accepted', 'issuance rechecks async owner replacement')
currentOwner = { ...owner }
afterRead = () => {}
const third = await get(owner)
afterRead = () => {
  records[0].revision = 'r4'
}
assert.equal(await open(owner, third.target), false, 'open rechecks mapping changes across an async read')
assert.deepEqual(effects, { create: 0, resume: 0, recovery: 0, submit: 0, replay: 0, write: 0, navigate: 2 })

console.log('Agent detail navigation v2 conformance passed')
