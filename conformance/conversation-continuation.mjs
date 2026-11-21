import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import Ajv from 'ajv/dist/2020.js'
const root = new URL('../', import.meta.url)
const read = async path => JSON.parse(await readFile(new URL(path, root), 'utf8'))
const ajv = new Ajv({ strict: false })
const request = ajv.compile(await read('schemas/conversation-continuation-request.v1.schema.json'))
const relation = ajv.compile(await read('schemas/conversation-continuation-relation.v1.schema.json'))
const result = ajv.compile(await read('schemas/conversation-continuation-result.v1.schema.json'))
const history = ajv.compile(await read('schemas/continuation-history-request.v1.schema.json'))
const page = ajv.compile(await read('schemas/continuation-history-page.v1.schema.json'))
const preference = ajv.compile(await read('schemas/conversation-continuation-preference.v1.schema.json'))
const example = await read('test-vectors/conversation-continuation/valid/linked.json')
assert.ok(request(example))
for (const file of ['consent-mismatch.json', 'injected-actor.json']) {
  assert.equal(request(await read(`test-vectors/conversation-continuation/invalid/${file}`)), false)
}
const { historyCategories: _categories, handoffConsent: _handoff, ...withoutCategories } = example
assert.ok(request({ ...withoutCategories, mode: 'fork', historyConsent: 'inherit' }))
assert.ok(request({ ...withoutCategories, mode: 'fresh', historyConsent: 'none' }))
assert.equal(request({ ...withoutCategories, mode: 'fresh', historyConsent: 'on-demand' }), false)
assert.equal(request({ ...example, historyCategories: [] }), false)
assert.equal(request({ ...example, handoffConsent: undefined }), false)
assert.equal(request({ ...example, mode: 'fork', historyConsent: 'inherit' }), false)
assert.ok(history({ contract: 'cordisx.continuation-history-request/v1', limit: 32 }))
assert.equal(history({ contract: 'cordisx.continuation-history-request/v1', sourceSessionId: 'other' }), false)
assert.equal(history({ contract: 'cordisx.continuation-history-request/v1', limit: 33 }), false)
assert.ok(
  preference({
    contract: 'cordisx.conversation-continuation-preference/v1',
    revision: 0,
    scope: { kind: 'project', id: 'project' },
    mode: 'linked',
  }),
)
const link = {
  contract: 'cordisx.conversation-continuation-relation/v1',
  operationId: 'op',
  logicalConversationId: 'logical',
  revision: 1,
  source: example.source,
  destination: { ...example.source, sessionId: 'destination' },
  target: example.target,
  mode: 'linked',
  historyAccess: 'on-demand',
  handoff: 'unavailable',
  historyCategories: example.historyCategories,
}
assert.ok(relation(link))
assert.ok(relation({ ...link, handoff: 'none' }))
assert.equal(relation({ ...link, handoff: 'invented' }), false)
assert.equal(relation({ ...link, historyAccess: 'inherited' }), false)
assert.ok(result({ state: 'applied', operationId: 'op', destination: example.source }))
assert.equal(result({ state: 'applied', operationId: 'op' }), false)
assert.ok(result({ state: 'unknown', operationId: 'op' }))
const meta = await read('package.json')
assert.deepEqual(meta.exports['./conversation-continuation/v1'], { types: './types/conversation-continuation.v1.d.ts' })
assert.ok(meta.files.includes('types/conversation-continuation.v1.d.ts'))
console.log('Logical continuation v1: explicit mode, bounded scoped history and result fencing passed.')
