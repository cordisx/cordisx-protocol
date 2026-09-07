import { createHash } from 'node:crypto'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const schemaNames = (await readdir(path.join(root, 'schemas')))
  .filter(name => name.endsWith('.schema.json'))
  .sort()
const schemas = new Map()
for (const name of schemaNames) {
  schemas.set(name, JSON.parse(await readFile(path.join(root, 'schemas', name), 'utf8')))
}

const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true })
addFormats(ajv)
for (const schema of schemas.values()) ajv.addSchema(schema)

function validator(name) {
  const validate = ajv.getSchema(schemas.get(name).$id)
  if (validate === undefined) throw new Error(`${name} was not registered`)
  return validate
}

const validators = {
  manifest: validator('plugin-manifest.v9.schema.json'),
  package: validator('plugin-package.v9.schema.json'),
  registration: validator('platform-provider-registration.v1.schema.json'),
  registrationV2: validator('platform-provider-registration.v2.schema.json'),
  factoryConfiguration: validator('platform-provider-factory-configuration.v1.schema.json'),
  factoryConfigurationV2: validator('platform-provider-factory-configuration.v2.schema.json'),
  safeValue: validator('platform-provider-broker-value.v1.schema.json'),
  brokerPolicy: validator('platform-provider-broker-policy.v1.schema.json'),
  brokerRequest: validator('platform-provider-broker-request.v1.schema.json'),
  brokerResult: validator('platform-provider-broker-result.v1.schema.json'),
  brokerEvent: validator('platform-provider-broker-event.v1.schema.json'),
  brokerResponse: validator('platform-provider-broker-response.v1.schema.json'),
  lifecycleEvent: validator('platform-provider-lifecycle-event.v1.schema.json'),
}

const frozenFiles = [
  ...Array.from({ length: 8 }, (_, index) => `schemas/plugin-manifest.v${index + 1}.schema.json`),
  ...Array.from({ length: 8 }, (_, index) => `schemas/plugin-package.v${index + 1}.schema.json`),
  'types/plugin-manifest.v6.d.ts',
  'types/plugin-manifest.v7.d.ts',
  'types/plugin-manifest.v8.d.ts',
  'types/plugin-package.v8.d.ts',
  ...schemaNames.filter(name => /^platform-provider-.*\.v1\.schema\.json$/.test(name)).map(name => `schemas/${name}`),
  'types/platform-provider.v1.d.ts',
].sort()
const frozenDigest = '22460708cea1a327a96a81e0376a7e2fd701db5e88cb639d7d7164fcd602de44'

async function digest(files) {
  const hash = createHash('sha256')
  for (const file of files) {
    hash.update(file).update('\0').update(await readFile(path.join(root, file))).update('\0')
  }
  return hash.digest('hex')
}

function schemaErrors(validate) {
  return (validate.errors ?? []).map(error => `${error.instancePath || '/'} ${error.message}`)
}

function duplicates(values) {
  const seen = new Set()
  return values.filter(value => seen.has(value) || !seen.add(value))
}

function validateManifest(value) {
  if (!validators.manifest(value)) return schemaErrors(validators.manifest)
  return duplicates(value.services.map(service => service.id)).map(id => `duplicate service id: ${id}`)
}

function validatePackage(value) {
  if (!validators.package(value)) return schemaErrors(validators.package)
  const errors = []
  if (!value.compatibility.protocolSchemas.includes(value.runtimeManifest.schema)) {
    errors.push('runtime manifest schema is absent from compatibility requirements')
  }
  const dependencies = value.dependencies.map(item => item.id)
  for (const id of duplicates(dependencies)) errors.push(`duplicate dependency: ${id}`)
  if (dependencies.includes(value.id)) errors.push('package depends on itself')
  return errors
}

const forbiddenConfigurationField =
  /secret|password|token|credential|path|directory|datadir|cwd|executable|process|env|transport|client|fleet|endpoint|url|host|header|auth|cookie/i

function inspectSafeValue(value, errors, location = 'value') {
  if (Array.isArray(value)) {
    value.forEach((item, index) => inspectSafeValue(item, errors, `${location}[${index}]`))
    return
  }
  if (value === null || typeof value !== 'object') return
  for (const [key, item] of Object.entries(value)) {
    if (forbiddenConfigurationField.test(key)) errors.push(`${location}.${key} is launcher-private`)
    inspectSafeValue(item, errors, `${location}.${key}`)
  }
}

function validateRegistrationWith(value, validate) {
  if (!validate(value)) return schemaErrors(validate)
  const errors = []
  const mappings = value.mapping.models
  for (const id of duplicates(mappings.map(item => item.sourceModelId))) {
    errors.push(`duplicate source model id: ${id}`)
  }
  for (const id of duplicates(mappings.map(item => item.modelId))) {
    errors.push(`duplicate public model id: ${id}`)
  }
  if (mappings.filter(item => item.enabled && item.isDefault).length > 1) {
    errors.push('multiple enabled default model mappings')
  }
  if (JSON.stringify(value.brokerPolicy.owner) !== JSON.stringify(value.owner)) {
    errors.push('broker policy owner differs from registration owner')
  }
  if (value.brokerPolicy.providerId !== value.descriptor.providerId) {
    errors.push('broker policy provider differs from descriptor')
  }
  if (value.brokerPolicy.providerGeneration !== value.providerGeneration) {
    errors.push('broker policy generation differs from registration')
  }
  if (value.configuration.providerId !== value.descriptor.providerId) {
    errors.push('factory configuration provider differs from descriptor')
  }
  if (value.configuration.displayName !== value.descriptor.displayName) {
    errors.push('factory configuration display name differs from descriptor')
  }
  errors.push(...validateBrokerPolicy(value.brokerPolicy, value.descriptor.operations))
  return errors
}

function validateRegistration(value) {
  return validateRegistrationWith(value, validators.registration)
}

function validateRegistrationV2(value) {
  const errors = validateRegistrationWith(value, validators.registrationV2)
  const mappingFingerprint = mapping =>
    JSON.stringify(mapping.models.map(item => [
      item.sourceModelId,
      item.modelId,
      item.displayName ?? null,
      item.enabled,
      item.isDefault,
    ]))
  if (errors.length === 0 && mappingFingerprint(value.mapping) !== mappingFingerprint(value.configuration.mapping)) {
    errors.push('factory configuration mapping differs from registration mapping')
  }
  return errors
}

function validateFactoryConfiguration(value) {
  return validators.factoryConfiguration(value) ? [] : schemaErrors(validators.factoryConfiguration)
}

function validateFactoryConfigurationV2(value) {
  if (!validators.factoryConfigurationV2(value)) return schemaErrors(validators.factoryConfigurationV2)
  const errors = []
  const mappings = value.mapping.models
  for (const id of duplicates(mappings.map(item => item.sourceModelId))) {
    errors.push(`duplicate source model id: ${id}`)
  }
  for (const id of duplicates(mappings.map(item => item.modelId))) {
    errors.push(`duplicate public model id: ${id}`)
  }
  if (mappings.filter(item => item.enabled && item.isDefault).length > 1) {
    errors.push('multiple enabled default model mappings')
  }
  return errors
}

function validateSafeValue(value) {
  if (!validators.safeValue(value)) return schemaErrors(validators.safeValue)
  const errors = []
  inspectSafeValue(value, errors)
  return errors
}

function validateBrokerPolicy(policy, descriptorOperations) {
  if (!validators.brokerPolicy(policy)) return schemaErrors(validators.brokerPolicy)
  const errors = []
  const operations = new Set(descriptorOperations)
  const keys = policy.bindings.map(binding => `${binding.direction}\0${binding.operation}\0${binding.method}`)
  for (const key of duplicates(keys)) errors.push(`duplicate broker binding: ${key}`)
  const tuples = policy.bindings.map(binding =>
    binding.direction === 'request'
      ? [binding.direction, binding.operation, binding.method, binding.requestSchema, binding.resultSchema]
      : [binding.direction, binding.operation, binding.method, binding.eventSchema, binding.responseSchema]
  ).sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)))
  const expectedDigest = `sha256:${createHash('sha256').update(JSON.stringify(tuples)).digest('hex')}`
  if (policy.policyDigest !== expectedDigest) errors.push('broker policy digest differs from normalized bindings')
  for (const binding of policy.bindings) {
    if (!operations.has(binding.operation)) {
      errors.push(`broker binding operation is not declared: ${binding.operation}`)
    }
  }
  return errors
}

function validateBrokerExchange(value) {
  const errors = validateBrokerPolicy(value.policy, value.descriptorOperations)
  if (!validators.brokerRequest(value.request)) errors.push(...schemaErrors(validators.brokerRequest))
  if (!validators.brokerResult(value.result)) errors.push(...schemaErrors(validators.brokerResult))
  if (errors.length > 0) return errors
  const request = value.request
  const result = value.result
  const binding = value.policy.bindings.find(item =>
    item.direction === 'request' && item.operation === request.operation && item.method === request.method
  )
  if (binding === undefined) return ['request method/operation is absent from the frozen broker policy']
  if (!value.descriptorOperations.includes(request.operation)) errors.push('request operation is not declared')
  if (binding.requestSchema !== request.requestSchema) errors.push('request schema differs from broker policy')
  if (
    result.requestId !== request.requestId || result.operation !== request.operation || result.method !== request.method
  ) {
    errors.push('broker result does not correlate to its request')
  }
  if (result.status === 'accepted' && binding.resultSchema !== result.resultSchema) {
    errors.push('result schema differs from broker policy')
  }
  return errors
}

function validateBrokerEvent(value) {
  const errors = validateBrokerPolicy(value.policy, value.descriptorOperations)
  if (!validators.brokerEvent(value.event)) errors.push(...schemaErrors(validators.brokerEvent))
  if (value.response !== undefined && !validators.brokerResponse(value.response)) {
    errors.push(...schemaErrors(validators.brokerResponse))
  }
  if (errors.length > 0) return errors
  const event = value.event
  const binding = value.policy.bindings.find(item =>
    item.direction === 'event' && item.operation === event.operation && item.method === event.method
  )
  if (binding === undefined) return ['event method/operation is absent from the frozen broker policy']
  if (!value.descriptorOperations.includes(event.operation)) errors.push('event operation is not declared')
  if (binding.eventSchema !== event.eventSchema) errors.push('event schema differs from broker policy')
  if (event.responseRequired !== (value.response !== undefined)) {
    errors.push('broker event response presence differs from responseRequired')
  }
  if (value.response !== undefined) {
    const response = value.response
    if (
      response.eventId !== event.eventId || response.operation !== event.operation || response.method !== event.method
    ) {
      errors.push('broker response does not correlate to its event')
    }
    if (binding.responseSchema !== response.responseSchema) errors.push('response schema differs from broker policy')
  }
  return errors
}

function validateLifecycleState(value) {
  const errors = []
  const accepted = new Map()
  const terminal = new Set()
  const eventIds = new Set()
  let subscribed = true
  let unsubscribed = false
  let drained = false
  let disposed = false
  let sequence = 0
  for (const action of value.actions ?? []) {
    if (action.action === 'accept') {
      if (disposed || accepted.has(action.operationId)) errors.push(`invalid accept: ${action.operationId}`)
      accepted.set(action.operationId, action.turnId)
      drained = false
      continue
    }
    if (action.action === 'event') {
      const event = action.event
      if (!validators.lifecycleEvent(event)) errors.push(...schemaErrors(validators.lifecycleEvent))
      if (!subscribed) errors.push(`event delivered after unsubscribe: ${event.eventId}`)
      if (disposed) errors.push(`event delivered after dispose: ${event.eventId}`)
      if (accepted.get(action.operationId) !== event.turnId) errors.push(`event has no matching accepted operation`)
      if (event.sequence !== sequence + 1) errors.push(`non-contiguous event sequence: ${event.sequence}`)
      sequence = event.sequence
      if (eventIds.has(event.eventId)) errors.push(`duplicate event id: ${event.eventId}`)
      eventIds.add(event.eventId)
      if (event.providerId !== value.providerId || event.session?.providerId !== value.providerId) {
        errors.push(`event provider id drift: ${event.eventId}`)
      }
      if (event.providerGeneration !== value.providerGeneration) {
        errors.push(`event provider generation drift: ${event.eventId}`)
      }
      if (terminal.has(action.operationId)) errors.push(`event follows terminal operation: ${action.operationId}`)
      if (event.terminal) terminal.add(action.operationId)
      continue
    }
    if (action.action === 'unsubscribe') {
      if (unsubscribed) errors.push('lifecycle subscription unsubscribed more than once')
      subscribed = false
      unsubscribed = true
      continue
    }
    if (action.action === 'drain') {
      if (subscribed) errors.push('drain occurred before lifecycle unsubscribe')
      if ([...accepted.keys()].some(id => !terminal.has(id))) {
        errors.push('drain completed before accepted work terminated')
      }
      drained = true
      continue
    }
    if (action.action === 'dispose') {
      if (subscribed) errors.push('dispose occurred before lifecycle unsubscribe')
      if (!drained) errors.push('dispose occurred before drain')
      if (disposed) errors.push('adapter disposed more than once')
      disposed = true
      continue
    }
    if (action.action === 'late-completion') {
      errors.push(`late completion attempted after generation fence: ${action.operationId}`)
      continue
    }
    errors.push(`unknown lifecycle action: ${String(action.action)}`)
  }
  if (!disposed) errors.push('lifecycle did not dispose')
  return errors
}

function validateLifecycleEvent(value) {
  return validators.lifecycleEvent(value) ? [] : schemaErrors(validators.lifecycleEvent)
}

const caseValidators = {
  'manifest-v9': validateManifest,
  'package-v9': validatePackage,
  registration: validateRegistration,
  'registration-v2': validateRegistrationV2,
  'factory-configuration': validateFactoryConfiguration,
  'factory-configuration-v2': validateFactoryConfigurationV2,
  'safe-value': validateSafeValue,
  'broker-exchange': validateBrokerExchange,
  'broker-event': validateBrokerEvent,
  'lifecycle-event': validateLifecycleEvent,
  'lifecycle-state': validateLifecycleState,
}

async function vectorFiles(expected) {
  const directory = path.join(root, 'test-vectors', 'platform-provider', expected)
  return (await readdir(directory))
    .filter(name => name.endsWith('.json'))
    .map(name => path.join(directory, name))
    .sort()
}

let failures = 0
if (await digest(frozenFiles) !== frozenDigest) {
  console.error('frozen manifest/package and Platform provider v1 bytes drifted')
  failures += 1
}

for (const expected of ['valid', 'invalid']) {
  for (const file of await vectorFiles(expected)) {
    const vector = JSON.parse(await readFile(file, 'utf8'))
    const validate = caseValidators[vector.case]
    const errors = validate === undefined ? [`unknown case: ${String(vector.case)}`] : validate(vector.value)
    const failed = expected === 'valid' ? errors.length > 0 : errors.length === 0
    if (failed) {
      console.error(`${path.relative(root, file)} should be ${expected}`, errors)
      failures += 1
    }
  }
}

const validManifest = JSON.parse(
  await readFile(path.join(root, 'test-vectors/platform-provider/valid/manifest.json'), 'utf8'),
).value
if (validator('plugin-manifest.v8.schema.json')(validManifest)) {
  console.error('manifest v8 accepted the additive platform-provider service')
  failures += 1
}

if (failures > 0) process.exitCode = 1
else console.log('platform provider conformance passed')
