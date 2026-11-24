import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import Ajv from 'ajv/dist/2020.js'
const root = new URL('../', import.meta.url)
const metadata = JSON.parse(await readFile(new URL('package.json', root), 'utf8'))
assert.deepEqual(metadata.exports['./channel-model-priority/v1'], { types: './types/channel-model-priority.v1.d.ts' })
assert.ok(metadata.files.includes('types/channel-model-priority.v1.d.ts'))
const schema = JSON.parse(await readFile(new URL('schemas/channel-model-priority.v1.schema.json', root), 'utf8'))
const valid = new Ajv({ strict: false }).compile(schema)
const candidate = { providerId: 'example', model: 'one' }
assert.ok(valid({ revision: 0, candidates: [candidate] }))
assert.ok(valid({ revision: 1, candidates: [] }))
for (
  const input of [
    { revision: 0, candidates: [candidate, candidate] },
    { revision: 0, candidates: Array.from({ length: 9 }, (_, i) => ({ ...candidate, model: String(i) })) },
    { revision: 0, candidates: [{ ...candidate, secret: 'value' }] },
    { revision: -1, candidates: [] },
  ]
) assert.equal(valid(input), false)
console.log('Channel model priority: bounded ordered configuration and credential exclusion passed.')

const failureSchema = JSON.parse(
  await readFile(new URL('schemas/channel-failure-notices.v1.schema.json', root), 'utf8'),
)
const validFailure = new Ajv({ strict: false }).compile(failureSchema)
assert.ok(validFailure({ revision: 0, enabled: true }))
assert.equal(validFailure({ revision: 0, enabled: 'true' }), false)
assert.equal(validFailure({ revision: 0, enabled: true, secret: 'value' }), false)
