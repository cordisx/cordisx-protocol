import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const schemaNames = [
  'ui-common.v1.schema.json',
  'extension-point-common.v1.schema.json',
  'plugin-config-common.v1.schema.json',
  'plugin-config-common.v2.schema.json',
  'service-config-common.v1.schema.json',
  'service-config-descriptor.v1.schema.json',
  'service-config-mutation.v1.schema.json',
  'service-config-result.v1.schema.json',
  'cli-proxy-provider-runtime-config.v1.schema.json',
  'cli-proxy-provider-startup-config.v1.schema.json',
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
  descriptor: schemaValidator('service-config-descriptor.v1.schema.json'),
  mutation: schemaValidator('service-config-mutation.v1.schema.json'),
  result: schemaValidator('service-config-result.v1.schema.json'),
  runtime: schemaValidator('cli-proxy-provider-runtime-config.v1.schema.json'),
  startup: schemaValidator('cli-proxy-provider-startup-config.v1.schema.json'),
}

function validatorErrors(validator) {
  return (validator.errors ?? []).map(error => `${error.instancePath || '/'} ${error.message}`)
}

function validateSchema(kind, value) {
  const validator = validators[kind]
  if (!validator(value)) return validatorErrors(validator)
  return []
}

function duplicate(values, key) {
  const seen = new Set()
  for (const value of values) {
    const current = key(value)
    if (seen.has(current)) return current
    seen.add(current)
  }
}

function validateRuntime(value) {
  const errors = validateSchema('runtime', value)
  if (errors.length > 0) return errors
  const duplicateProvider = duplicate(value.providers, provider => provider.id)
  if (duplicateProvider !== undefined) errors.push(`duplicate provider id: ${duplicateProvider}`)
  for (const provider of value.providers) {
    let endpoint
    try {
      endpoint = new URL(provider.endpoint.baseUrl)
    } catch {
      errors.push(`provider ${provider.id} endpoint is invalid`)
      continue
    }
    const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(endpoint.hostname)
    if (endpoint.protocol !== 'https:' && !(endpoint.protocol === 'http:' && loopback)) {
      errors.push(`provider ${provider.id} endpoint must use HTTPS or loopback HTTP`)
    }
    if (endpoint.username !== '' || endpoint.password !== '' || endpoint.search !== '' || endpoint.hash !== '') {
      errors.push(`provider ${provider.id} endpoint contains credentials, query, or fragment`)
    }
    const duplicateSource = duplicate(provider.models.mappings, mapping => mapping.sourceModelId)
    if (duplicateSource !== undefined) errors.push(`provider ${provider.id} duplicates source model ${duplicateSource}`)
    const duplicateModel = duplicate(provider.models.mappings, mapping => mapping.modelId)
    if (duplicateModel !== undefined) errors.push(`provider ${provider.id} duplicates public model ${duplicateModel}`)
    if (provider.models.mappings.filter(mapping => mapping.enabled && mapping.isDefault).length > 1) {
      errors.push(`provider ${provider.id} has multiple enabled default models`)
    }
  }
  return errors
}

function validateStartup(value) {
  const errors = validateSchema('startup', value)
  if (errors.length > 0) return errors
  const duplicateProvider = duplicate(value.providers, provider => provider.id)
  if (duplicateProvider !== undefined) errors.push(`duplicate provider startup id: ${duplicateProvider}`)
  const duplicateDataDir = duplicate(value.providers, provider => path.normalize(provider.dataDir))
  if (duplicateDataDir !== undefined) errors.push(`duplicate provider data directory: ${duplicateDataDir}`)
  return errors
}

function validateDescriptor(value) {
  const errors = validateSchema('descriptor', value)
  if (errors.length > 0) return errors
  if (value.lastGoodRevision > value.revision) errors.push('lastGoodRevision exceeds revision')
  if (value.restartRequired && value.lastGoodRevision >= value.revision) {
    errors.push('restartRequired descriptor must have a newer desired revision')
  }
  if (!value.restartRequired && value.lastGoodRevision !== value.revision) {
    errors.push('active descriptor revisions must match')
  }
  for (const secret of value.secrets) {
    let current = value.configuration
    for (const segment of secret.path) {
      if (current === null || typeof current !== 'object' || !Object.hasOwn(current, segment)) {
        current = undefined
        break
      }
      current = current[segment]
    }
    if (current !== undefined) errors.push(`descriptor exposes secret path ${secret.path.join('.')}`)
  }
  return errors
}

const caseValidators = {
  descriptor: validateDescriptor,
  mutation: value => validateSchema('mutation', value),
  result: value => validateSchema('result', value),
  runtime: validateRuntime,
  startup: validateStartup,
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
for (const file of await jsonFiles(path.join(root, 'test-vectors/service-configuration/valid'))) {
  const vector = JSON.parse(await readFile(file, 'utf8'))
  const errors = validateVector(vector)
  if (errors.length > 0) {
    console.error(`${path.relative(root, file)} should be valid`, errors)
    failures += 1
  }
}
for (const file of await jsonFiles(path.join(root, 'test-vectors/service-configuration/invalid'))) {
  const vector = JSON.parse(await readFile(file, 'utf8'))
  if (validateVector(vector).length === 0) {
    console.error(`${path.relative(root, file)} should be invalid`)
    failures += 1
  }
}

const storedSchemas = JSON.stringify([
  schemas.get('cli-proxy-provider-runtime-config.v1.schema.json'),
  schemas.get('cli-proxy-provider-startup-config.v1.schema.json'),
])
const rendererSafeSchemas = JSON.stringify([
  schemas.get('service-config-descriptor.v1.schema.json'),
  schemas.get('service-config-result.v1.schema.json'),
])
if (!storedSchemas.includes('secretRef')) {
  console.error('CLIProxy launcher schema must retain an opaque secretRef')
  failures += 1
}
for (
  const forbidden of [
    'secretRef',
    'secretValue',
    'apiKey',
    'homeConfigPath',
    'processHandle',
    'electronBridge',
    'rawBridge',
  ]
) {
  if (rendererSafeSchemas.includes(forbidden)) {
    console.error(`Service configuration renderer-safe schemas must not expose ${forbidden}`)
    failures += 1
  }
}

if (failures > 0) throw new Error(`${failures} service configuration conformance case(s) failed`)
console.log('Service configuration conformance: all vectors passed')
