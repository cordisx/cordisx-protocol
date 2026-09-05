import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const schemaNames = ['commerce-descriptor.v1.schema.json', 'publisher-grant.v1.schema.json']
const schemas = await Promise.all(
  schemaNames.map(async name => JSON.parse(await readFile(path.join(root, 'schemas', name), 'utf8'))),
)
const ajv = new Ajv2020({ allErrors: true, strict: true })
addFormats(ajv)
for (const schema of schemas) ajv.addSchema(schema)
const statement = ajv.getSchema(schemas[1].$id)
if (statement === undefined) throw new Error('publisher grant schema was not registered')

export function validatePublisherGrant(value) {
  if (!statement(value)) return statement.errors ?? [{ message: 'schema validation failed' }]
  const errors = []
  const issuedAt = Date.parse(value.issuedAt)
  const payload = value.payload
  if (value.kind === 'grant' || value.kind === 'renew') {
    const notBefore = Date.parse(payload.notBefore)
    const expiresAt = Date.parse(payload.expiresAt)
    const refreshAfter = Date.parse(payload.refreshAfter)
    if (!(issuedAt <= notBefore && notBefore < expiresAt)) errors.push('authorization timing order is invalid')
    if (!(notBefore <= refreshAfter && refreshAfter < expiresAt)) {
      errors.push('refreshAfter must be inside the authorization interval')
    }
  }
  if (value.kind === 'revoke' && Date.parse(payload.effectiveAt) < issuedAt) {
    errors.push('revocation cannot predate issuance')
  }
  if (value.kind === 'transfer') {
    if (!(Date.parse(payload.notBefore) < Date.parse(payload.expiresAt))) {
      errors.push('transfer timing order is invalid')
    }
    if (payload.fromDevicePublicKeyHash === payload.toDevicePublicKeyHash) {
      errors.push('transfer target must differ from source device')
    }
  }
  return errors
}

/** RFC 8785-compatible for JSON values admitted by PublisherGrant v1. */
export function canonicalPublisherGrantSigningInput(value) {
  const unsigned = { ...value }
  delete unsigned.signature
  const canonical = item => {
    if (item === null || typeof item === 'boolean' || typeof item === 'number' || typeof item === 'string') {
      return JSON.stringify(item)
    }
    if (Array.isArray(item)) return `[${item.map(canonical).join(',')}]`
    return `{${Object.keys(item).sort().map(key => `${JSON.stringify(key)}:${canonical(item[key])}`).join(',')}}`
  }
  return canonical(unsigned)
}

async function vectors(directory) {
  return (await readdir(directory, { withFileTypes: true })).filter(entry =>
    entry.isFile() && entry.name.endsWith('.json')
  ).map(entry => path.join(directory, entry.name)).sort()
}

let failures = 0
const canonicalVector = JSON.parse(
  await readFile(path.join(root, 'test-vectors/publisher-grants/canonicalization.json'), 'utf8'),
)
if (canonicalPublisherGrantSigningInput(canonicalVector.input) !== canonicalVector.expected) {
  console.error('PublisherGrant canonical signing-input vector failed')
  failures += 1
}
for (const expected of ['valid', 'invalid']) {
  for (const file of await vectors(path.join(root, 'test-vectors/publisher-grants', expected))) {
    const vector = JSON.parse(await readFile(file, 'utf8'))
    const errors = vector.kind === 'statement' ? validatePublisherGrant(vector.value) : ['unknown vector kind']
    if ((expected === 'valid') === (errors.length > 0)) {
      console.error(`${path.relative(root, file)} expected ${expected}`, errors)
      failures += 1
    }
  }
}
if (failures > 0) throw new Error(`${failures} PublisherGrant conformance case(s) failed`)
console.log('PublisherGrant conformance: all vectors passed')
