import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Ajv2020 from 'ajv/dist/2020.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const names = [
  'session-common.v1.schema.json',
  'agent-detail-reference.v1.schema.json',
  'agent-session-detail-reference-request.v1.schema.json',
  'agent-session-detail-reference-result.v1.schema.json',
  'agent-detail-navigation-request.v1.schema.json',
  'agent-detail-navigation-result.v1.schema.json',
]
const ajv = new Ajv2020({ strict: true, allErrors: true })
for (const name of names) ajv.addSchema(JSON.parse(await readFile(path.join(root, 'schemas', name), 'utf8')))
const validate = name =>
  ajv.getSchema(`https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/${name}`)

const target = { kind: 'host', ref: 'detail-ref.session-lead' }
const acceptedReference = { status: 'accepted', sessionId: 'session-lead', target }
const acceptedOpen = { status: 'accepted', code: 'opened' }
assert.equal(validate('agent-detail-reference.v1.schema.json')(target), true)
assert.equal(validate('agent-session-detail-reference-request.v1.schema.json')({ sessionId: 'session-lead' }), true)
assert.equal(validate('agent-session-detail-reference-result.v1.schema.json')(acceptedReference), true)
assert.equal(validate('agent-detail-navigation-request.v1.schema.json')({ target }), true)
assert.equal(validate('agent-detail-navigation-result.v1.schema.json')(acceptedOpen), true)
assert.deepEqual(structuredClone({ target, acceptedReference, acceptedOpen }), {
  target,
  acceptedReference,
  acceptedOpen,
})

for (
  const unavailable of [
    { status: 'unavailable', code: 'detail-unavailable' },
    { status: 'unavailable', code: 'generation-replaced' },
    { status: 'unavailable', code: 'connection-replaced' },
    { status: 'unavailable', code: 'stale-reference' },
    { status: 'unavailable', code: 'unknown-detail' },
  ]
) {
  const schema = unavailable.code === 'detail-unavailable' || unavailable.code === 'generation-replaced'
      || unavailable.code === 'connection-replaced'
    ? 'agent-session-detail-reference-result.v1.schema.json'
    : 'agent-detail-navigation-result.v1.schema.json'
  assert.equal(validate(schema)(unavailable), true)
}
assert.equal(
  validate('agent-detail-navigation-result.v1.schema.json')({ status: 'denied', code: 'ambiguous-detail' }),
  true,
)

for (
  const invalid of [
    { target: { kind: 'external', ref: 'https://example.invalid/detail' } },
    { target: { url: 'app://private-detail', target: 'host' } },
    { target: { kind: 'host', ref: 'detail-ref', url: 'app://private-detail' } },
  ]
) assert.equal(validate('agent-detail-navigation-request.v1.schema.json')(invalid), false)

const records = [
  { owner: 'chatroom\u00001', sessionId: 'session-lead', generation: 4, detail: target, live: true },
]
const resolveCurrent = (owner, sessionId) =>
  records.filter(record => record.owner === owner && record.sessionId === sessionId && record.live)
const resolveTarget = (owner, detail) =>
  records.filter(record =>
    record.owner === owner && record.live && JSON.stringify(record.detail) === JSON.stringify(detail)
  )
assert.equal(
  resolveCurrent('chatroom\u00001', 'session-lead').length,
  1,
  'current Session projection is exact and owner-scoped',
)
assert.equal(resolveTarget('chatroom\u00001', target).length, 1, 'open requires one exact current owner record')
assert.equal(resolveTarget('other\u00001', target).length, 0, 'foreign owner cannot navigate a matching ref')
records.push({ owner: 'chatroom\u00001', sessionId: 'session-other', generation: 5, detail: target, live: true })
assert.equal(resolveTarget('chatroom\u00001', target).length, 2, 'ambiguous current refs must deny rather than choose')
records[1].live = false
records[0].live = false
assert.equal(resolveTarget('chatroom\u00001', target).length, 0, 'stale or replaced records never navigate')

console.log('Agent detail navigation v1 conformance passed')
