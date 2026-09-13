import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import Ajv from 'ajv/dist/2020.js'
const schema = JSON.parse(readFileSync(new URL('../schemas/http-session-scope.v2.schema.json', import.meta.url)))
const validate = new Ajv().compile(schema)
const scope = { origin: 'https://games.example:8443', sourceId: 'game', accountId: '' }
assert.equal(validate(scope), true)
for (
  const patch of [
    { token: 'never-public' },
    { nativeAccount: 'not-caller-authority' },
    { sourceId: '' },
    { accountId: '\n' },
    { accountId: 'x'.repeat(257) },
    { origin: 'https://user@games.example' },
    { origin: 'https://games.example/path' },
  ]
) assert.equal(validate({ ...scope, ...patch }), false)
console.log('Plugin HTTP v2 session partition vectors passed')
