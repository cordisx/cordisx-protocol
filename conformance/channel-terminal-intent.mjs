import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import Ajv2020 from 'ajv/dist/2020.js'

const read = async path => JSON.parse(await readFile(new URL('../' + path, import.meta.url), 'utf8'))
const validate = new Ajv2020({ strict: true }).compile(await read('schemas/channel-terminal-intent.v1.schema.json'))
const vectors = await read('test-vectors/channel-terminal-intent/v1.json')
assert.equal(validate(vectors.intent), true)
for (const invalid of vectors.invalid) assert.equal(validate({ ...vectors.intent, ...invalid }), false)
assert.equal(validate({ ...vectors.intent, inputOperationId: 'x'.repeat(129) }), false)
console.log('Channel terminal intent v1 conformance passed')
