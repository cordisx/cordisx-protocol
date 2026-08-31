import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const schemaDirectory = path.join(root, 'schemas')
const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true })
addFormats(ajv)
for (const file of (await readdir(schemaDirectory)).filter(file => file.endsWith('.schema.json')).sort()) {
  ajv.addSchema(JSON.parse(await readFile(path.join(schemaDirectory, file), 'utf8')))
}

const vectorRoot = path.join(root, 'test-vectors/platform/permissions-v5')
let failures = 0
function expect(condition, message) {
  if (condition) return
  console.error(message)
  failures += 1
}
function validate(value) {
  const validator = ajv.getSchema(value.$schema)
  if (validator === undefined || !validator(value)) return false
  for (const declaration of value.declarations ?? []) {
    if (declaration.authorizationMode !== 'certified-implicit') continue
    const projection = declaration.certification
    if (projection?.source !== value.identity?.source || projection?.pluginId !== value.identity?.pluginId) return false
    if (!(Date.parse(projection?.reviewedAt) < Date.parse(projection?.expiresAt))) return false
  }
  return true
}
for (const file of (await readdir(path.join(vectorRoot, 'valid'))).filter(file => file.endsWith('.json')).sort()) {
  const value = JSON.parse(await readFile(path.join(vectorRoot, 'valid', file), 'utf8'))
  expect(validate(value), `valid permission v5 vector ${file} must pass`)
  const item = value.declarations[0]
  expect(item.resourceClass === 'non-dom' && item.certifiedImplicitApproval === false,
    `${file} must prove v5 does not depend on the legacy DOM eligibility flag`)
  expect(item.authorizationMode === 'certified-implicit' && item.decisionRequired === false,
    `${file} must auto-authorize an exact Certified non-DOM declaration`)
  expect(value.official === undefined, `${file} must not carry Official into permission authority`)
  expect(!validate({ ...value, identity: { ...value.identity, pluginId: 'other-plugin' } }),
    `${file} must bind certification to the exact plugin identity`)
  expect(!validate({ ...value, official: true }), `${file} must reject Official as permission input`)
}
for (const file of (await readdir(path.join(vectorRoot, 'invalid'))).filter(file => file.endsWith('.json')).sort()) {
  const value = JSON.parse(await readFile(path.join(vectorRoot, 'invalid', file), 'utf8'))
  expect(!validate(value), `invalid permission v5 vector ${file} must fail closed`)
}

if (failures > 0) process.exitCode = 1
else console.log('permission v5 conformance passed')
