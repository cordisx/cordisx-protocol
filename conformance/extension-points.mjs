import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const schemaNames = [
  'ui-common.v1.schema.json',
  'extension-point-common.v1.schema.json',
  'host-extension-point-catalog.v1.schema.json',
  'extension-point-policy.v1.schema.json',
  'extension-point-access.v1.schema.json',
]
const schemas = new Map()
for (const name of schemaNames) {
  schemas.set(name, JSON.parse(await readFile(path.join(root, 'schemas', name), 'utf8')))
}

const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true })
addFormats(ajv)
for (const schema of schemas.values()) ajv.addSchema(schema)

const validators = {
  catalog: ajv.getSchema(schemas.get('host-extension-point-catalog.v1.schema.json').$id),
  policy: ajv.getSchema(schemas.get('extension-point-policy.v1.schema.json').$id),
  access: ajv.getSchema(schemas.get('extension-point-access.v1.schema.json').$id),
}
for (const [kind, validator] of Object.entries(validators)) {
  if (validator === undefined) throw new Error(`${kind} schema was not registered`)
}

export function canonicalSource(value) {
  const url = new URL(value)
  if (
    !['file:', 'https:'].includes(url.protocol) || url.username !== '' || url.password !== '' || url.search !== ''
    || url.hash !== ''
  ) {
    throw new Error('source must be a file or HTTPS URL without credentials, query, or fragment')
  }
  if (url.protocol === 'file:' && url.host !== '') throw new Error('file source must be a local absolute file URL')
  if (url.protocol === 'https:' && url.pathname !== '/') url.pathname = url.pathname.replace(/\/+$/, '')
  return url.href
}

export function pointIdentityKey(identity) {
  return `${identity.source}\u0000${identity.pluginId}\u0000${identity.pointId}`
}

export function effectivePointPolicy(policies, identity) {
  const record = policies.find(candidate => pointIdentityKey(candidate.identity) === pointIdentityKey(identity))
  if (record === undefined || record.policy === 'inherit') return 'allow'
  return record.policy
}

function schemaErrors(validator, value) {
  if (validator(value)) return []
  return (validator.errors ?? []).map(error => `${error.instancePath || '/'} ${error.message}`)
}

function validateCanonicalIdentity(errors, label, identity) {
  if (typeof identity?.source !== 'string') return
  try {
    if (canonicalSource(identity.source) !== identity.source) {
      errors.push(`${label} source must use canonical serialization`)
    }
  } catch (error) {
    errors.push(`${label} ${error instanceof Error ? error.message : String(error)}`)
  }
}

function requiredPointKind(operation) {
  if (operation === 'surface.command.invoke') return 'surface'
  if (
    operation === 'outlet.route.navigate'
    || operation === 'outlet.page.mount'
    || operation === 'outlet.page.command.invoke'
  ) return 'outlet'
  return undefined
}

export function validateExtensionPointSuite(suite) {
  const errors = []
  if (suite === null || typeof suite !== 'object' || Array.isArray(suite)) return ['suite must be an object']

  errors.push(...schemaErrors(validators.catalog, suite.catalog).map(error => `catalog schema: ${error}`))

  const points = Array.isArray(suite.catalog?.points) ? suite.catalog.points : []
  const pointsById = new Map()
  for (const point of points) {
    if (typeof point?.id !== 'string') continue
    if (pointsById.has(point.id)) errors.push(`duplicate extension point id across families: ${point.id}`)
    pointsById.set(point.id, point)
  }

  if (!Array.isArray(suite.policies)) {
    errors.push('policies must be an array')
  }
  const policies = Array.isArray(suite.policies) ? suite.policies : []
  const policyKeys = new Set()
  for (const [index, policy] of policies.entries()) {
    errors.push(...schemaErrors(validators.policy, policy).map(error => `policies[${index}] schema: ${error}`))
    validateCanonicalIdentity(errors, `policies[${index}]`, policy?.identity)
    if (policy?.identity !== undefined) {
      const key = pointIdentityKey(policy.identity)
      if (policyKeys.has(key)) errors.push(`duplicate point policy identity: ${key}`)
      policyKeys.add(key)
      if (!pointsById.has(policy.identity.pointId)) {
        errors.push(`policy references unknown point: ${policy.identity.pointId}`)
      }
    }
  }

  if (!Array.isArray(suite.accesses)) {
    errors.push('accesses must be an array')
  }
  const accesses = Array.isArray(suite.accesses) ? suite.accesses : []
  for (const [index, vector] of accesses.entries()) {
    const request = vector?.request
    errors.push(...schemaErrors(validators.access, request).map(error => `accesses[${index}] schema: ${error}`))
    validateCanonicalIdentity(errors, `accesses[${index}]`, request?.identity)

    const point = pointsById.get(request?.identity?.pointId)
    if (point === undefined) {
      errors.push(`access references unknown point: ${request?.identity?.pointId ?? '<missing>'}`)
      continue
    }
    const requiredKind = requiredPointKind(request.operation)
    if (requiredKind !== undefined && point.kind !== requiredKind) {
      errors.push(`access operation ${request.operation} requires ${requiredKind} point, received ${point.kind}`)
    }

    const effective = effectivePointPolicy(policies, request.identity)
    if (vector.expectedEffectivePolicy !== effective) {
      errors.push(
        `accesses[${index}] expected effective policy ${vector.expectedEffectivePolicy}, received ${effective}`,
      )
    }
    const authorized = effective === 'allow'
    if (vector.expectedAuthorized !== authorized) {
      errors.push(`accesses[${index}] expected authorized=${vector.expectedAuthorized}, received ${authorized}`)
    }
  }

  return errors
}

async function jsonFiles(directory) {
  return (await readdir(directory, { withFileTypes: true }))
    .filter(entry => entry.isFile() && entry.name.endsWith('.json'))
    .map(entry => path.join(directory, entry.name))
    .sort()
}

let failures = 0
for (const file of await jsonFiles(path.join(root, 'test-vectors/extension-points/valid'))) {
  const suite = JSON.parse(await readFile(file, 'utf8'))
  const errors = validateExtensionPointSuite(suite)
  if (errors.length > 0) {
    console.error(`${path.relative(root, file)} should be valid`, errors)
    failures += 1
  }
}
for (const file of await jsonFiles(path.join(root, 'test-vectors/extension-points/invalid'))) {
  const suite = JSON.parse(await readFile(file, 'utf8'))
  if (validateExtensionPointSuite(suite).length === 0) {
    console.error(`${path.relative(root, file)} should be invalid`)
    failures += 1
  }
}

const legacyIdentity = {
  source: 'file:///opt/cordisx/plugins/legacy.mjs',
  pluginId: 'legacy',
  pointId: 'app',
}
if (effectivePointPolicy([], legacyIdentity) !== 'allow') {
  console.error('missing point policy must resolve to the compatible v1 allow default')
  failures += 1
}
if (effectivePointPolicy([{ identity: legacyIdentity, policy: 'inherit' }], legacyIdentity) !== 'allow') {
  console.error('inherit point policy must resolve to the compatible v1 allow default')
  failures += 1
}
if (effectivePointPolicy([{ identity: legacyIdentity, policy: 'deny' }], legacyIdentity) !== 'deny') {
  console.error('deny point policy must fail closed for the exact identity tuple')
  failures += 1
}
const otherSource = { ...legacyIdentity, source: 'https://plugins.example/mirror' }
if (effectivePointPolicy([{ identity: legacyIdentity, policy: 'deny' }], otherSource) !== 'allow') {
  console.error('point policy must not cross canonical plugin source identity')
  failures += 1
}

if (failures > 0) throw new Error(`${failures} extension-point conformance case(s) failed`)
console.log('extension-point management conformance: all vectors passed')
