import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const schemaNames = [
  'ui-common.v1.schema.json',
  'extension-point-common.v1.schema.json',
  'plugin-config-common.v1.schema.json',
  'plugin-config-descriptor.v1.schema.json',
  'plugin-config-mutation.v1.schema.json',
  'plugin-config-result.v1.schema.json',
  'plugin-config-renderer.v1.schema.json',
]
const schemas = new Map()
for (const name of schemaNames) {
  schemas.set(name, JSON.parse(await readFile(path.join(root, 'schemas', name), 'utf8')))
}

const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true })
addFormats(ajv)
for (const schema of schemas.values()) ajv.addSchema(schema)

function schemaValidator(name) {
  const validator = ajv.getSchema(schemas.get(name).$id)
  if (validator === undefined) throw new Error(`${name} was not registered`)
  return validator
}

const validators = {
  descriptor: schemaValidator('plugin-config-descriptor.v1.schema.json'),
  mutation: schemaValidator('plugin-config-mutation.v1.schema.json'),
  result: schemaValidator('plugin-config-result.v1.schema.json'),
  renderer: schemaValidator('plugin-config-renderer.v1.schema.json'),
}

function validatorErrors(validator) {
  return (validator.errors ?? []).map(error => `${error.instancePath || '/'} ${error.message}`)
}

function ownsNamespace(identity, namespace) {
  return namespace === identity.pluginId || namespace.startsWith(`${identity.pluginId}.`)
}

function hasPath(value, segments) {
  let current = value
  for (const segment of segments) {
    if (current === null || typeof current !== 'object' || !Object.hasOwn(current, segment)) return false
    current = current[segment]
  }
  return true
}

function validateOwnedDocument(kind, value) {
  const validate = validators[kind]
  if (!validate(value)) return validatorErrors(validate)
  if (value.namespace !== undefined && !ownsNamespace(value.identity, value.namespace)) {
    return [`namespace ${value.namespace} is outside owner ${value.identity.pluginId}`]
  }
  return []
}

export function validateDescriptor(value) {
  const errors = validateOwnedDocument('descriptor', value)
  if (errors.length > 0) return errors
  if (value.lastGoodRevision > value.revision) {
    errors.push('lastGoodRevision exceeds revision')
  }
  for (const secret of value.secrets) {
    if (hasPath(value.value, secret.path) || hasPath(value.user, secret.path)) {
      errors.push(`secret path is exposed: ${secret.path.join('.')}`)
    }
  }
  return errors
}

export function validateMutation(value) {
  return validateOwnedDocument('mutation', value)
}

export function validateResult(value) {
  return validateOwnedDocument('result', value)
}

const reservedRoles = new Set([
  'secret',
  'credential',
  'credential-ref',
  'permission',
  'capability',
])

export function validateRenderer(value) {
  const errors = validateOwnedDocument('renderer', value)
  if (errors.length > 0) return errors
  if ('role' in value.selector && reservedRoles.has(value.selector.role)) {
    errors.push(`renderer cannot select Host-reserved role: ${value.selector.role}`)
  }
  if ('namespace' in value.selector && !ownsNamespace(value.identity, value.selector.namespace)) {
    errors.push(`renderer namespace ${value.selector.namespace} is outside its owner`)
  }
  return errors
}

const caseValidators = {
  descriptor: validateDescriptor,
  mutation: validateMutation,
  result: validateResult,
  renderer: validateRenderer,
}

function validateVector(vector) {
  const validate = caseValidators[vector?.case]
  if (validate === undefined) return [`unknown vector case: ${String(vector?.case)}`]
  return validate(vector.value)
}

async function jsonFiles(directory) {
  return (await readdir(directory, { withFileTypes: true }))
    .filter(entry => entry.isFile() && entry.name.endsWith('.json'))
    .map(entry => path.join(directory, entry.name))
    .sort()
}

let failures = 0
for (const file of await jsonFiles(path.join(root, 'test-vectors/plugin-configuration/valid'))) {
  const vector = JSON.parse(await readFile(file, 'utf8'))
  const errors = validateVector(vector)
  if (errors.length > 0) {
    console.error(`${path.relative(root, file)} should be valid`, errors)
    failures += 1
  }
}
for (const file of await jsonFiles(path.join(root, 'test-vectors/plugin-configuration/invalid'))) {
  const vector = JSON.parse(await readFile(file, 'utf8'))
  if (validateVector(vector).length === 0) {
    console.error(`${path.relative(root, file)} should be invalid`)
    failures += 1
  }
}

const publicSchemas = JSON.stringify(schemaNames.map(name => schemas.get(name)))
for (const forbidden of [
  'homeConfigPath',
  'localPath',
  'secretValue',
  'rendererCallback',
  'container',
  'electronBridge',
]) {
  if (publicSchemas.includes(forbidden)) {
    console.error(`Plugin configuration public schemas must not expose ${forbidden}`)
    failures += 1
  }
}

if (failures > 0) throw new Error(`${failures} plugin configuration conformance case(s) failed`)
console.log('Plugin configuration conformance: all vectors passed')
