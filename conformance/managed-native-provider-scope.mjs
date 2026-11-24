import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import Ajv2020 from 'ajv/dist/2020.js'

const schema = JSON.parse(
  await readFile(
    new URL('../schemas/managed-native-provider-credential-scope.v1.schema.json', import.meta.url),
    'utf8',
  ),
)
const validate = new Ajv2020({ strict: true }).compile(schema)
const valid = { revision: `scope_${'A'.repeat(43)}`, requestBinding: 'path-v1' }
assert.equal(validate(valid), true)
for (
  const invalid of [
    {},
    { ...valid, revision: 'scope_short' },
    { ...valid, revision: `scope_${'A'.repeat(42)}/` },
    { ...valid, revision: `scope_${'A'.repeat(42)}B` },
    { ...valid, requestBinding: 'unverified' },
    { ...valid, endpoint: 'https://example.invalid' },
  ]
) assert.equal(validate(invalid), false)

// Reference behavior only; real gateways must enforce this at their atomic boundary.
const old = valid.revision
const next = `scope_${'B'.repeat(42)}A`
let active = old
const owners = new Map()
const retired = new Set()
const admit = (scope, authenticated, reference) =>
  authenticated && scope === active
  && (reference === undefined || owners.get(reference) === scope)
assert.equal(admit(old, false), false)
assert.equal(admit(old, true), true)
owners.set('response-old', old)
retired.add(old)
active = next
assert.equal(admit(old, true), false)
assert.equal(admit(next, true, 'response-old'), false)
assert.equal(admit(next, true, 'unknown-response'), false)
owners.set('late-old-result', old)
assert.equal(admit(next, true, 'late-old-result'), false)
assert.equal(retired.has(old), true)
console.log('Managed native provider credential scope conformance passed')
