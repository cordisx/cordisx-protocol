import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const schemaNames = [
  'connector-common.v1.schema.json', 'connector-service-descriptor.v1.schema.json', 'connector-registration.v1.schema.json',
  'connector-command.v1.schema.json', 'connector-event.v1.schema.json', 'connector-client-common.v1.schema.json',
  'connector-client-snapshot.v1.schema.json', 'connector-event-subscription.v1.schema.json', 'connector-event-page.v1.schema.json',
  'connector-client-result.v1.schema.json', 'connector-client-binding.v1.schema.json', 'connector-bound-client.v1.schema.json',
  'connector-bound-client-call.v1.schema.json', 'connector-bound-client-result.v1.schema.json', 'connector-bound-client-lifecycle.v1.schema.json',
]
const schemas = new Map()
for (const name of schemaNames) schemas.set(name, JSON.parse(await readFile(path.join(root, 'schemas', name), 'utf8')))
const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true })
addFormats(ajv)
for (const schema of schemas.values()) ajv.addSchema(schema)

function schemaValidator(name) {
  const validator = ajv.getSchema(schemas.get(name).$id)
  if (validator === undefined) throw new Error(`${name} was not registered`)
  return validator
}
const validators = {
  surface: schemaValidator('connector-bound-client.v1.schema.json'),
  binding: schemaValidator('connector-client-binding.v1.schema.json'),
  call: schemaValidator('connector-bound-client-call.v1.schema.json'),
  result: schemaValidator('connector-bound-client-result.v1.schema.json'),
  page: schemaValidator('connector-event-page.v1.schema.json'),
  lifecycle: schemaValidator('connector-bound-client-lifecycle.v1.schema.json'),
}
const errorsOf = validator => (validator.errors ?? []).map(error => `${error.instancePath || '/'} ${error.message}`)
const sameRegistration = (left, right) => left?.registrationId === right?.registrationId && left?.connectorId === right?.connectorId && left?.generation === right?.generation
const capabilityByCall = { discover: 'connector.discovery', execute: 'connector.command.execute', subscribe: 'connector.events.subscribe' }

function registrationState(registration, context) {
  return context?.registrations?.find(record => sameRegistration(record.registration, registration))
}

function validateSurface(value) {
  const errors = validators.surface(value) ? [] : errorsOf(validators.surface)
  if (errors.length === 0 && JSON.stringify([...value.operations].sort()) !== JSON.stringify(['discover', 'dispose', 'execute', 'subscribe'])) {
    errors.push('bound client must expose exactly discover/execute/subscribe/dispose')
  }
  return errors
}

function validateCall(call, binding, context) {
  const errors = []
  if (!validators.binding(binding)) errors.push(...errorsOf(validators.binding))
  if (!validators.call(call)) errors.push(...errorsOf(validators.call))
  if (errors.length > 0) return errors
  const capability = capabilityByCall[call.type]
  const grant = binding.authorizations.find(record => record.capability === capability
    && (call.type === 'discover' ? record.target.kind === 'catalog' : record.target.kind === 'registration' && sameRegistration(record.target.registration, call.registration)))
  if (grant === undefined) errors.push('bound client lacks Host-issued authorization for call')
  if (call.type !== 'discover') {
    const record = registrationState(call.registration, context)
    if (record === undefined) errors.push('call registration is stale or unknown')
    else if (record.state === 'replaced') errors.push('call registration was replaced')
    else if (record.state === 'disposed') errors.push('call registration was disposed')
  }
  if (call.type === 'execute' && !sameRegistration(call.command.registration, call.registration)) {
    errors.push('command registration does not match bound client call registration')
  }
  return errors
}

function validateExecution(call, execution, context, errors) {
  if (call.command.type !== 'run.stop') return
  if (execution?.kind !== 'run.stopped' || !sameRegistration(execution.binding?.registration, call.registration)
    || execution.binding?.conversation !== call.command.conversation || execution.binding?.run !== call.command.run) {
    errors.push('stop result does not preserve exact registration/run/conversation binding')
  }
  const issued = context?.runBindings?.find(binding => binding.run === call.command.run)
  if (issued === undefined || !sameRegistration(issued.registration, call.registration) || issued.conversation !== call.command.conversation) {
    errors.push('run binding is outside the exact registration/conversation')
  }
}

function validateExchange(vector) {
  const errors = validateCall(vector.call, vector.binding, vector.context)
  if (!validators.result(vector.result)) errors.push(...errorsOf(validators.result))
  if (errors.length > 0) return errors
  if (vector.result.callId !== vector.call.callId || vector.result.type !== vector.call.type) errors.push('bound result does not match call')
  const decision = vector.context?.decision ?? 'allowed'
  const expectedStatus = { allowed: 'accepted', denied: 'denied', unavailable: 'unavailable' }[decision]
  if (vector.result.status !== expectedStatus || vector.result.authorization.state !== decision
    || vector.result.authorization.capability !== capabilityByCall[vector.call.type]) {
    errors.push('bound result does not reflect Host authorization decision')
  }
  if (vector.result.status === 'accepted' && vector.call.type === 'execute') validateExecution(vector.call, vector.result.execution, vector.context, errors)
  if (vector.result.status === 'accepted' && vector.call.type === 'subscribe') {
    if (!sameRegistration(vector.result.subscription?.registration, vector.call.registration)
      || vector.result.subscription?.afterSequence !== vector.call.afterSequence) errors.push('subscription does not match bound call')
    if (vector.result.subscription?.snapshotSequence < vector.call.afterSequence) errors.push('subscription snapshot precedes requested cursor')
  }
  return errors
}

function validatePages(vector, errors) {
  const subscription = vector.result.subscription
  if (subscription.afterSequence < subscription.snapshotSequence && (!Array.isArray(vector.pages) || vector.pages.length === 0)) {
    errors.push('accepted subscription requiring replay cannot omit pages')
    return
  }
  let after = subscription.afterSequence
  let disposed = false
  const ids = new Set()
  for (let index = 0; index < (vector.pages?.length ?? 0); index += 1) {
    const page = vector.pages[index]
    if (!validators.page(page)) { errors.push(...errorsOf(validators.page).map(error => `page[${index}] ${error}`)); continue }
    if (page.subscription?.subscriptionId !== subscription.subscriptionId || !sameRegistration(page.subscription?.registration, subscription.registration)
      || page.subscription?.snapshotSequence !== subscription.snapshotSequence) errors.push(`page[${index}] subscription mismatch`)
    if (page.afterSequence !== after) errors.push(`page[${index}] replay cursor is not serialized`)
    const phase = after < subscription.snapshotSequence ? 'replay' : 'live'
    if (page.phase !== phase) errors.push(`page[${index}] replay/live phase is out of order`)
    let expected = page.afterSequence + 1
    for (const event of page.events) {
      if (!sameRegistration(event.registration, subscription.registration)) errors.push(`page[${index}] event registration drift`)
      if (event.sequence !== expected) errors.push(`page[${index}] event sequence is not ordered`)
      expected += 1
      if (ids.has(event.eventId)) errors.push(`page[${index}] duplicate event`)
      ids.add(event.eventId)
      if (disposed) errors.push(`page[${index}] late event follows disposal`)
      if (page.phase === 'replay' && event.sequence > subscription.snapshotSequence) errors.push(`page[${index}] replay event exceeds snapshot`)
      if (event.type === 'connector.disposed') disposed = true
    }
    const next = page.events.length === 0 ? page.afterSequence : page.events.at(-1).sequence
    if (page.nextAfterSequence !== next) errors.push(`page[${index}] next cursor does not match page`)
    if (page.phase === 'replay' && !page.hasMore && page.nextAfterSequence !== subscription.snapshotSequence) errors.push(`page[${index}] replay completes before snapshot`)
    if (page.phase === 'live' && page.hasMore) errors.push(`page[${index}] reentrant live page is not permitted`)
    after = page.nextAfterSequence
  }
}

function validateSubscription(vector) {
  const errors = validateExchange(vector)
  if (vector.result?.status === 'accepted' && vector.result?.type === 'subscribe' && vector.result.subscription !== undefined) validatePages(vector, errors)
  return errors
}
export { validateSubscription }

function validateLifecycle(vector) {
  const errors = validators.lifecycle(vector.value) ? [] : errorsOf(validators.lifecycle)
  if (errors.length > 0) return errors
  const active = vector.attempt?.kind === 'call'
    ? vector.value.clientState === 'active'
    : vector.value.clientState === 'active' && vector.value.subscriptions.find(subscription => subscription.subscriptionId === vector.attempt.subscriptionId)?.state === 'active'
  if (vector.attempt?.allowed !== active) errors.push('lifecycle attempt does not match terminal client/subscription state')
  return errors
}

const validatorsByCase = { surface: vector => validateSurface(vector.value), result: vector => validators.result(vector.value) ? [] : errorsOf(validators.result), exchange: validateExchange, subscription: validateSubscription, lifecycle: validateLifecycle }
async function jsonFiles(directory) { return (await readdir(directory, { withFileTypes: true })).filter(entry => entry.isFile() && entry.name.endsWith('.json')).map(entry => path.join(directory, entry.name)).sort() }
let failures = 0
for (const outcome of ['valid', 'invalid']) {
  for (const file of await jsonFiles(path.join(root, 'test-vectors', 'connector-bound-client', outcome))) {
    const vector = JSON.parse(await readFile(file, 'utf8'))
    const validate = validatorsByCase[vector?.case]
    const errors = validate === undefined ? [`unknown vector case: ${String(vector?.case)}`] : validate(vector)
    if ((errors.length === 0) !== (outcome === 'valid')) { console.error(`${path.relative(root, file)} should be ${outcome}`, errors); failures += 1 }
  }
}
const publicSchemas = JSON.stringify([...schemas.values()])
for (const forbidden of ['room', 'provider', 'workspace', 'secret', 'credential', 'rawBridge', 'callback', 'document', 'selector', 'path', 'connection']) {
  if (publicSchemas.toLowerCase().includes(forbidden.toLowerCase())) { console.error(`Bound Connector client schemas must not expose ${forbidden}`); failures += 1 }
}
const boundCallSchema = JSON.stringify(schemas.get('connector-bound-client-call.v1.schema.json'))
if (boundCallSchema.includes('principal') || boundCallSchema.includes('userHandle') || boundCallSchema.includes('authorization')) {
  console.error('Bound Connector client calls must not accept caller identity or authorization input')
  failures += 1
}
if (failures > 0) throw new Error(`${failures} bound Connector client conformance case(s) failed`)
console.log('Bound Connector client conformance: all vectors passed')
