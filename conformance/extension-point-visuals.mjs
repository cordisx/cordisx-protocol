import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'

const root = new URL('../', import.meta.url)
const ajv = new Ajv2020({ strict: true, allErrors: true, allowUnionTypes: true })
addFormats(ajv)
for (const file of await readdir(new URL('schemas/', root))) {
  if (file.endsWith('.schema.json')) ajv.addSchema(JSON.parse(await readFile(new URL(`schemas/${file}`, root), 'utf8')))
}
const base = 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/'
for (
  const name of [
    'surface-contribution.v10',
    'host-extension-point-catalog.v10',
    'plugin-manifest.v10',
    'permission-policy.v5',
    'permission-authorization-plan.v5',
    'permission-authorization-decision.v5',
    'permission-capability-catalog.v4',
    'extension-point-visual.v1',
  ]
) {
  assert.ok(ajv.getSchema(`${base}${name}.schema.json`), name)
}
const cases = JSON.parse(await readFile(new URL('test-vectors/extension-point-visuals/cases.json', root), 'utf8'))
for (const test of cases) {
  const validate = ajv.getSchema(`${base}${test.schema}.schema.json${test.fragment ?? ''}`)
  assert.ok(validate, test.name)
  assert.equal(validate(test.value), test.valid, `${test.name}: ${JSON.stringify(validate.errors)}`)
}
console.log(`Extension point visuals: ${cases.length} vectors passed`)
