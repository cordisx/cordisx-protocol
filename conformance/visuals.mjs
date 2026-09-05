import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { isDeepStrictEqual } from 'node:util'
import Ajv2020 from 'ajv/dist/2020.js'
import { cloneVisualData, parseVisualProviderId } from '../runtime/visuals.v1.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const common = JSON.parse(await readFile(path.join(root, 'schemas/visuals-common.v1.schema.json'), 'utf8'))
const projectionSchema = JSON.parse(await readFile(path.join(root, 'schemas/visual-projection.v1.schema.json'), 'utf8'))
const ajv = new Ajv2020({ allErrors: true, strict: true })
ajv.addSchema(common)
ajv.addSchema(projectionSchema)
const validateProviderId = ajv.getSchema(`${common.$id}#/$defs/providerId`)
const validateProjection = ajv.getSchema(projectionSchema.$id)
if (validateProviderId === undefined || validateProjection === undefined) throw new Error('visuals schemas were not registered')

function errorsOf(validator) {
  return (validator.errors ?? []).map(error => `${error.instancePath || '/'} ${error.message}`)
}

function frozenErrors(value, label, errors, seen = new WeakSet()) {
  if (value === null || typeof value !== 'object' || seen.has(value)) return
  seen.add(value)
  if (!Object.isFrozen(value)) errors.push(`${label} is not frozen`)
  for (const [key, child] of Object.entries(value)) frozenErrors(child, `${label}.${key}`, errors, seen)
}

function validateProjectionCase(vector) {
  const errors = []
  if (!validateProjection(vector.value)) errors.push(...errorsOf(validateProjection))
  if (!validateProviderId(vector.providerId)) errors.push(...errorsOf(validateProviderId))
  try {
    parseVisualProviderId(vector.providerId)
  } catch (error) {
    errors.push(error.message)
  }
  if (errors.length > 0) return errors

  const source = structuredClone(vector.value.data)
  const cloned = cloneVisualData(source)
  if (source !== null && typeof source === 'object' && cloned === source) errors.push('visual data was not detached')
  if (!isDeepStrictEqual(cloned, source)) errors.push('visual data changed during detachment')
  frozenErrors(cloned, 'data', errors)
  const before = structuredClone(cloned)
  if (Array.isArray(source)) source.push(null)
  else if (source !== null && typeof source === 'object') source.changed = true
  if (!isDeepStrictEqual(cloned, before)) errors.push('visual data aliases mutable input')
  return errors
}

function validateProviderIdCase(vector) {
  const schemaErrors = validateProviderId(vector.value) ? [] : errorsOf(validateProviderId)
  try {
    parseVisualProviderId(vector.value)
    return schemaErrors
  } catch (error) {
    return [...schemaErrors, error.message]
  }
}

function validateOwnerIsolationCase(vector) {
  const errors = []
  const ownerKeys = new Set()
  const ownersById = new Map()
  for (const owner of vector.owners ?? []) {
    if (typeof owner.key !== 'string' || owner.key.length === 0 || ownerKeys.has(owner.key)) {
      errors.push('owner keys must be non-empty and unique')
      continue
    }
    ownerKeys.add(owner.key)
    const ids = new Set()
    for (const value of owner.providerIds ?? []) {
      try {
        const id = parseVisualProviderId(value)
        if (!validateProviderId(id)) errors.push(...errorsOf(validateProviderId))
        if (ids.has(id)) errors.push(`owner ${owner.key} repeats provider id ${id}`)
        ids.add(id)
        const keys = ownersById.get(id) ?? new Set()
        keys.add(owner.key)
        ownersById.set(id, keys)
      } catch (error) {
        errors.push(error.message)
      }
    }
  }
  if (![...ownersById.values()].some(keys => keys.size > 1)) errors.push('isolation case must share one local id across owners')
  return errors
}

const caseValidators = {
  projection: validateProjectionCase,
  'provider-id': validateProviderIdCase,
  'owner-isolation': validateOwnerIsolationCase,
}

async function jsonFiles(directory) {
  return (await readdir(directory, { withFileTypes: true }))
    .filter(entry => entry.isFile() && entry.name.endsWith('.json'))
    .map(entry => path.join(directory, entry.name))
    .sort()
}

let failures = 0
for (const outcome of ['valid', 'invalid']) {
  for (const file of await jsonFiles(path.join(root, 'test-vectors/visuals', outcome))) {
    const vector = JSON.parse(await readFile(file, 'utf8'))
    const validate = caseValidators[vector.case]
    const errors = validate === undefined ? [`unknown vector case: ${String(vector.case)}`] : validate(vector)
    if ((errors.length === 0) !== (outcome === 'valid')) {
      console.error(`${path.relative(root, file)} should be ${outcome}`, errors)
      failures += 1
    }
  }
}

const detachedSource = { status: { state: 'ready' }, points: [1, 2, 3] }
const detached = cloneVisualData(detachedSource)
detachedSource.status.state = 'changed'
detachedSource.points.push(5)
if (detached.status.state !== 'ready' || detached.points.length !== 3) throw new Error('detached data changed with its source')
const detachedFreezeErrors = []
frozenErrors(detached, 'detached', detachedFreezeErrors)
if (detachedFreezeErrors.length > 0) throw new Error(detachedFreezeErrors.join('; '))

const invalidValues = [
  undefined,
  () => undefined,
  Symbol('value'),
  1n,
  Number.NaN,
  Number.POSITIVE_INFINITY,
  new Date(0),
  new Map(),
  Array(1),
]
const cyclic = {}
cyclic.self = cyclic
invalidValues.push(cyclic)
for (const value of invalidValues) {
  try {
    cloneVisualData(value)
    throw new Error('invalid visual data was accepted')
  } catch (error) {
    if (error.message === 'invalid visual data was accepted') throw error
  }
}

const accessor = {}
Object.defineProperty(accessor, 'value', { enumerable: true, get: () => 1 })
try {
  cloneVisualData(accessor)
  throw new Error('accessor visual data was accepted')
} catch (error) {
  if (error.message === 'accessor visual data was accepted') throw error
}

if (failures > 0) throw new Error(`${failures} visuals conformance case(s) failed`)
console.log('Visuals conformance: all vectors passed')
