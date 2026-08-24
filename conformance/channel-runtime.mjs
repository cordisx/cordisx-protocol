import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const schemaNames = [
  'ui-common.v1.schema.json',
  'extension-point-common.v1.schema.json',
  'platform-model.v1.schema.json',
  'platform-session.v1.schema.json',
  'channel-common.v1.schema.json',
  'channel-user-input.v1.schema.json',
  'channel-binding.v1.schema.json',
  'channel-runtime-snapshot.v1.schema.json',
  'channel-service-config.v1.schema.json',
  'channel-service-config-descriptor.v1.schema.json',
  'plugin-manifest.v2.schema.json',
  'plugin-manifest.v3.schema.json',
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
  manifestV2: schemaValidator('plugin-manifest.v2.schema.json'),
  manifestV3: schemaValidator('plugin-manifest.v3.schema.json'),
  input: schemaValidator('channel-user-input.v1.schema.json'),
  binding: schemaValidator('channel-binding.v1.schema.json'),
  snapshot: schemaValidator('channel-runtime-snapshot.v1.schema.json'),
  config: schemaValidator('channel-service-config.v1.schema.json'),
  configDescriptor: schemaValidator('channel-service-config-descriptor.v1.schema.json'),
}

function validatorErrors(validator) {
  return (validator.errors ?? []).map(error => `${error.instancePath || '/'} ${error.message}`)
}

function tenantKey(ref) {
  return JSON.stringify([ref.adapterId, ref.accountId, ref.tenantId])
}

function threadKey(ref) {
  return JSON.stringify([
    ref.adapterId,
    ref.accountId,
    ref.tenantId,
    ref.conversationId,
    ref.kind,
    ref.threadId,
    ref.semantics,
  ])
}

function userKey(ref) {
  return JSON.stringify([ref.adapterId, ref.accountId, ref.tenantId, ref.userId])
}

function sessionKey(ref) {
  return JSON.stringify([ref.providerId, ref.remoteSessionId])
}

function endpointRouteKey(binding) {
  return JSON.stringify([threadKey(binding.channel), binding.routeId])
}

function validateEventActor(event, label) {
  if (event.actor === undefined || tenantKey(event.actor) === tenantKey(event)) return []
  return [`${label} actor is outside the event account/tenant`]
}

export function validateManifest(manifest) {
  const errors = []
  const validator = manifest?.schemaVersion === 3 ? validators.manifestV3 : validators.manifestV2
  if (!validator(manifest)) errors.push(...validatorErrors(validator))

  const capabilities = new Set()
  for (const declaration of manifest?.capabilities ?? []) {
    if (capabilities.has(declaration.name)) {
      errors.push(`duplicate capability declaration: ${declaration.name}`)
    }
    capabilities.add(declaration.name)

    const scope = declaration.scope ?? {}
    const platformFields = ['providers', 'cwdRoots', 'sessions']
    if (declaration.name?.startsWith('channel.')) {
      for (const field of [...platformFields, 'sessionIds']) {
        if (scope[field] !== undefined) {
          errors.push(`${declaration.name} cannot use ${field} scope`)
        }
      }
    } else if (declaration.name?.startsWith('agent.')) {
      for (const field of platformFields) {
        if (scope[field] !== undefined) {
          errors.push(`${declaration.name} cannot use Platform ${field} scope`)
        }
      }
    } else if (scope.sessionIds !== undefined) {
      errors.push(`${declaration.name} cannot use provider-neutral Agent session scope`)
    }
  }

  const services = new Set()
  for (const service of manifest?.services ?? []) {
    if (services.has(service.id)) errors.push(`duplicate service declaration: ${service.id}`)
    services.add(service.id)
  }
  return errors
}

function validateConfiguredTopology(config) {
  const errors = []
  const connections = new Set()
  for (const connection of config.connections) {
    const key = tenantKey(connection.ref)
    if (connections.has(key)) errors.push(`duplicate configured connection: ${key}`)
    connections.add(key)
  }

  const routes = new Set()
  for (const route of config.routes) {
    if (routes.has(route.id)) errors.push(`duplicate configured route: ${route.id}`)
    routes.add(route.id)
    if (!connections.has(tenantKey(route.connection))) {
      errors.push(`configured route ${route.id} references a missing connection`)
    }
  }
  if (config.reliability.retry.baseDelayMs > config.reliability.retry.maxDelayMs) {
    errors.push('retry baseDelayMs exceeds maxDelayMs')
  }
  if (config.reliability.retry.maxDelayMs > config.reliability.retry.maxAgeMs) {
    errors.push('retry maxDelayMs exceeds maxAgeMs')
  }
  return errors
}

export function validateServiceConfig(config) {
  if (!validators.config(config)) return validatorErrors(validators.config)
  return validateConfiguredTopology(config)
}

export function validateServiceConfigDescriptor(descriptor) {
  if (!validators.configDescriptor(descriptor)) return validatorErrors(validators.configDescriptor)
  const errors = validateConfiguredTopology(descriptor.configuration)
  if (descriptor.lastGoodRevision > descriptor.revision) {
    errors.push('Channel service config lastGoodRevision exceeds revision')
  }
  return errors
}

export function validateInput(input) {
  const errors = []
  if (!validators.input(input)) return validatorErrors(validators.input)
  errors.push(...validateEventActor(input.source.event, 'source event'))
  return errors
}

export function validateBinding(binding) {
  const errors = []
  if (!validators.binding(binding)) return validatorErrors(validators.binding)
  if (tenantKey(binding.createdBy) !== tenantKey(binding.channel)) {
    errors.push('createdBy is outside the bound Channel account/tenant')
  }
  if (threadKey(binding.createdFrom) !== threadKey(binding.channel)) {
    errors.push('createdFrom does not identify the bound Channel thread')
  }
  errors.push(...validateEventActor(binding.createdFrom, 'createdFrom event'))
  if (binding.createdFrom.actor !== undefined && userKey(binding.createdFrom.actor) !== userKey(binding.createdBy)) {
    errors.push('createdFrom actor does not equal createdBy')
  }
  if (Date.parse(binding.updatedAt) < Date.parse(binding.createdAt)) {
    errors.push('binding updatedAt precedes createdAt')
  }
  return errors
}

export function validateSnapshot(snapshot) {
  const errors = []
  if (!validators.snapshot(snapshot)) return validatorErrors(validators.snapshot)

  const accountRefs = new Set()
  for (const account of snapshot.accounts) {
    const key = tenantKey(account.ref)
    if (accountRefs.has(key)) errors.push(`duplicate account snapshot: ${key}`)
    accountRefs.add(key)
  }

  const bindingIds = new Set()
  const activeEndpoints = new Set()
  const sessionRefs = new Set()
  for (const binding of snapshot.bindings) {
    if (bindingIds.has(binding.bindingId)) {
      errors.push(`duplicate binding id: ${binding.bindingId}`)
    }
    bindingIds.add(binding.bindingId)
    sessionRefs.add(sessionKey(binding.session))
    if (!accountRefs.has(tenantKey(binding.channel))) {
      errors.push(`binding ${binding.bindingId} has no account snapshot`)
    }
    if (binding.state === 'active') {
      const key = endpointRouteKey(binding)
      if (activeEndpoints.has(key)) errors.push(`duplicate active endpoint/route: ${key}`)
      activeEndpoints.add(key)
    }
  }
  return errors
}

const caseValidators = {
  manifest: validateManifest,
  input: validateInput,
  binding: validateBinding,
  snapshot: validateSnapshot,
  config: validateServiceConfig,
  configDescriptor: validateServiceConfigDescriptor,
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
for (const file of await jsonFiles(path.join(root, 'test-vectors/channel-runtime/valid'))) {
  const vector = JSON.parse(await readFile(file, 'utf8'))
  const errors = validateVector(vector)
  if (errors.length > 0) {
    console.error(`${path.relative(root, file)} should be valid`, errors)
    failures += 1
  }
}
for (const file of await jsonFiles(path.join(root, 'test-vectors/channel-runtime/invalid'))) {
  const vector = JSON.parse(await readFile(file, 'utf8'))
  if (validateVector(vector).length === 0) {
    console.error(`${path.relative(root, file)} should be invalid`)
    failures += 1
  }
}

const hostConfigSchema = JSON.stringify(schemas.get('channel-service-config.v1.schema.json'))
const rendererSafeSchemas = JSON.stringify(schemaNames
  .filter(name => name !== 'channel-service-config.v1.schema.json')
  .map(name => schemas.get(name)))
for (const forbidden of [
  'additionalContext',
  'secretValue',
  'rawBody',
  'rawEvent',
  'messageText',
  'localPath',
  'externalUrl',
  'electronBridge',
  'rawBridge',
]) {
  if (hostConfigSchema.includes(forbidden) || rendererSafeSchemas.includes(forbidden)) {
    console.error(`Channel schemas must not expose ${forbidden}`)
    failures += 1
  }
}
if (!hostConfigSchema.includes('secretRef')) {
  console.error('Launcher-owned Channel config schema must retain an opaque secretRef')
  failures += 1
}
if (rendererSafeSchemas.includes('secretRef')) {
  console.error('Channel renderer-safe schemas must not expose secretRef')
  failures += 1
}

if (failures > 0) throw new Error(`${failures} Channel runtime conformance case(s) failed`)
console.log('Channel runtime conformance: all vectors passed')
