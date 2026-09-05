import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const schemaNames = [
  'connector-common.v1.schema.json',
  'connector-service-descriptor.v1.schema.json',
  'connector-registration.v1.schema.json',
  'connector-command.v1.schema.json',
  'connector-event.v1.schema.json',
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
  descriptor: schemaValidator('connector-service-descriptor.v1.schema.json'),
  registration: schemaValidator('connector-registration.v1.schema.json'),
  command: schemaValidator('connector-command.v1.schema.json'),
  event: schemaValidator('connector-event.v1.schema.json'),
}

function validatorErrors(validator) {
  return (validator.errors ?? []).map(error => `${error.instancePath || '/'} ${error.message}`)
}

function sameRegistration(left, right) {
  return left?.registrationId === right?.registrationId
    && left?.connectorId === right?.connectorId
    && left?.generation === right?.generation
}

function validateDescriptor(descriptor) {
  return validators.descriptor(descriptor) ? [] : validatorErrors(validators.descriptor)
}

function validateRegistration(registration, descriptor) {
  const errors = []
  if (!validators.registration(registration)) errors.push(...validatorErrors(validators.registration))
  errors.push(...validateDescriptor(descriptor))
  if (errors.length === 0 && registration.registration.connectorId !== descriptor.connectorId) {
    errors.push('registration connectorId does not match descriptor')
  }
  return errors
}

const commandCapability = {
  'conversation.open': command => command.open.mode === 'create' ? 'conversation.open' : 'conversation.continue',
  'message.send': () => 'message.send',
  'run.stop': () => 'run.stop',
  'conversation.close': () => 'conversation.close',
}

function validateCommand(command, descriptor, registration, context) {
  const errors = []
  if (!validators.command(command)) errors.push(...validatorErrors(validators.command))
  errors.push(...validateRegistration(registration, descriptor))
  if (errors.length > 0) return errors
  if (!sameRegistration(command.registration, registration.registration)) {
    errors.push('command registration does not match active registration')
  }
  if (context?.state !== 'active') errors.push('command targets a disposed registration')
  const capability = commandCapability[command.type](command)
  if (!descriptor.capabilities.includes(capability)) errors.push(`descriptor lacks capability: ${capability}`)
  return errors
}

function eventCapability(event) {
  if (event.type === 'connector.disposed') return 'lifecycle.dispose'
  if (event.type === 'message.sent') return 'message.send'
  return 'events.receive'
}

function validateEvents(events, descriptor, registration) {
  const errors = []
  errors.push(...validateRegistration(registration, descriptor))
  const eventIds = new Set()
  let disposed = false
  for (let index = 0; index < (events?.length ?? 0); index += 1) {
    const event = events[index]
    if (!validators.event(event)) {
      errors.push(...validatorErrors(validators.event).map(error => `event[${index}] ${error}`))
      continue
    }
    if (!sameRegistration(event.registration, registration.registration)) {
      errors.push(`event[${index}] registration does not match active registration`)
    }
    if (event.sequence !== index) errors.push(`event[${index}] sequence is not contiguous from zero`)
    if (eventIds.has(event.eventId)) errors.push(`duplicate event id ${event.eventId}`)
    eventIds.add(event.eventId)
    if (disposed) errors.push(`event[${index}] follows connector disposal`)
    if (!descriptor.capabilities.includes(eventCapability(event))) {
      errors.push(`event[${index}] descriptor lacks capability: ${eventCapability(event)}`)
    }
    if (event.type === 'connector.disposed') disposed = true
  }
  return errors
}

const caseValidators = {
  descriptor: vector => validateDescriptor(vector.value),
  registration: vector => validateRegistration(vector.value, vector.descriptor),
  command: vector => validateCommand(vector.value, vector.descriptor, vector.registration, vector.context),
  events: vector => validateEvents(vector.events, vector.descriptor, vector.registration),
}

function validateVector(vector) {
  const validate = caseValidators[vector?.case]
  return validate === undefined ? [`unknown vector case: ${String(vector?.case)}`] : validate(vector)
}

async function jsonFiles(directory) {
  return (await readdir(directory, { withFileTypes: true }))
    .filter(entry => entry.isFile() && entry.name.endsWith('.json'))
    .map(entry => path.join(directory, entry.name))
    .sort()
}

let failures = 0
for (const outcome of ['valid', 'invalid']) {
  for (const file of await jsonFiles(path.join(root, 'test-vectors', 'connector-service', outcome))) {
    const vector = JSON.parse(await readFile(file, 'utf8'))
    const errors = validateVector(vector)
    const expectedValid = outcome === 'valid'
    if ((errors.length === 0) !== expectedValid) {
      console.error(`${path.relative(root, file)} should be ${outcome}`, errors)
      failures += 1
    }
  }
}

const publicSchemas = JSON.stringify([...schemas.values()])
for (
  const forbidden of [
    'room',
    'agentRoom',
    'provider',
    'workspace',
    'secret',
    'credential',
    'electronBridge',
    'rawBridge',
    'callback',
    'document',
    'selector',
    'path',
  ]
) {
  if (publicSchemas.toLowerCase().includes(forbidden.toLowerCase())) {
    console.error(`Connector schemas must not expose ${forbidden}`)
    failures += 1
  }
}

if (failures > 0) throw new Error(`${failures} Connector service conformance case(s) failed`)
console.log('Connector service conformance: all vectors passed')
