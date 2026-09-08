import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import Ajv from 'ajv/dist/2020.js'

const schema = JSON.parse(readFileSync(new URL('../schemas/http-connection.v1.schema.json', import.meta.url)))
const validate = new Ajv().compile(schema)
const connection = {
  contract: 'cordisx.http-connection/v1',
  id: 'c'.repeat(43),
  origin: 'https://games.example:8443',
  credential: 'bearer',
}
assert.equal(validate(connection), true)
for (
  const patch of [{ secret: 'never-public' }, { origin: 'https://user@games.example' }, {
    origin: 'https://games.example/path',
  }, { id: 'short' }]
) {
  assert.equal(validate({ ...connection, ...patch }), false)
}
// A copied descriptor is only correlation data, never a cross-owner grant.
const records = new Map([[connection.id, { owner: 'a', origin: connection.origin, generation: 1 }]])
const authorized = (owner, generation, input) => {
  const grant = records.get(input.id)
  return grant?.owner === owner && grant.generation === generation && grant.origin === input.origin
}
assert.equal(authorized('a', 1, connection), true)
assert.equal(authorized('b', 1, connection), false)
assert.equal(authorized('a', 2, connection), false)
assert.equal(authorized('a', 1, { ...connection, origin: 'https://other.example' }), false)
console.log('Plugin HTTP v1 connection and authority vectors passed')
