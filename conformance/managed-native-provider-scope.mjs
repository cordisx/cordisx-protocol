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
    { ...valid, requestBinding: 'unverified' },
    { ...valid, endpoint: 'https://example.invalid' },
  ]
) assert.equal(validate(invalid), false)
console.log('Managed native provider credential scope conformance passed')
