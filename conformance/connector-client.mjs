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
  'connector-client-common.v1.schema.json',
  'connector-client-request.v1.schema.json',
  'connector-client-snapshot.v1.schema.json',
  'connector-event-subscription.v1.schema.json',
  'connector-event-page.v1.schema.json',
  'connector-client-result.v1.schema.json',
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
  request: schemaValidator('connector-client-request.v1.schema.json'),
  result: schemaValidator('connector-client-result.v1.schema.json'),
  snapshot: schemaValidator('connector-client-snapshot.v1.schema.json'),
  subscription: schemaValidator('connector-event-subscription.v1.schema.json'),
  page: schemaValidator('connector-event-page.v1.schema.json'),
}

function validatorErrors(validator) {
  return (validator.errors ?? []).map(error => `${error.instancePath || '/'} ${error.message}`)
}

function sameRegistration(left, right) {
  return left?.registrationId === right?.registrationId
    && left?.connectorId === right?.connectorId
    && left?.generation === right?.generation
}

function samePrincipal(left, right) {
  return left?.principalHandle === right?.principalHandle
    && left?.pluginId === right?.pluginId
    && left?.generation === right?.generation
}

const capabilityByRequest = {
  'connector.discover': 'connector.discovery',
  'connector.command.execute': 'connector.command.execute',
  'connector.events.subscribe': 'connector.events.subscribe',
}

function registrationState(registration, context) {
  return context?.registrations?.find(record => sameRegistration(record.registration, registration))
}

function validateCaller(request, context, errors) {
  const expectedCapability = capabilityByRequest[request.type]
  if (request.caller.authorization.capability !== expectedCapability) {
    errors.push(`caller authorization capability does not match ${request.type}`)
  }
  const expectedTarget = request.type === 'connector.discover' ? 'catalog' : 'registration'
  if (request.caller.authorization.target.kind !== expectedTarget) {
    errors.push(`caller authorization target does not match ${request.type}`)
  }
  if (
    expectedTarget === 'registration'
    && !sameRegistration(request.caller.authorization.target.registration, request.registration)
  ) {
    errors.push('caller authorization registration does not match request registration')
  }
  const issued = context?.callers?.find(record =>
    samePrincipal(record.principal, request.caller.principal)
    && record.userHandle === request.caller.userHandle
  )
  if (issued === undefined) errors.push('caller principal/user pair was not issued by the Host')
  return issued
}

function validateRequest(request, context) {
  const errors = []
  if (!validators.request(request)) return validatorErrors(validators.request)
  validateCaller(request, context, errors)
  if (request.type !== 'connector.discover') {
    const record = registrationState(request.registration, context)
    if (record === undefined) errors.push('request registration is stale or unknown')
    else if (record.state === 'replaced') errors.push('request registration was replaced')
    else if (record.state === 'disposed') errors.push('request registration was disposed')
  }
  if (
    request.type === 'connector.command.execute'
    && !sameRegistration(request.command.registration, request.registration)
  ) {
    errors.push('command registration does not match client request registration')
  }
  return errors
}

function expectedAuthorization(request, context) {
  return context?.authorizations?.find(record =>
    samePrincipal(record.principal, request.caller.principal)
    && record.userHandle === request.caller.userHandle
    && record.capability === request.caller.authorization.capability
    && record.targetKind === request.caller.authorization.target.kind
    && (record.targetKind === 'catalog' || sameRegistration(record.registration, request.registration))
  )
}

function validateExecution(command, execution, context, errors) {
  if (command.type === 'conversation.open' && execution?.kind !== 'conversation.opened') {
    errors.push('open command result must be conversation.opened')
  }
  if (
    command.type === 'message.send' && (execution?.kind !== 'message.sent'
      || execution.conversation !== command.conversation || execution.messageId !== command.message.messageId)
  ) {
    errors.push('send command result does not match command conversation/message')
  }
  if (command.type === 'run.stop') {
    if (
      execution?.kind !== 'run.stopped'
      || execution.binding?.conversation !== command.conversation || execution.binding?.run !== command.run
    ) {
      errors.push('stop command result does not match command run binding')
    }
    const binding = context?.runBindings?.find(record => record.run === command.run)
    if (binding === undefined || binding.conversation !== command.conversation) {
      errors.push('run is not bound to command conversation')
    }
  }
  if (
    command.type === 'conversation.close' && (execution?.kind !== 'conversation.closed'
      || execution.conversation !== command.conversation)
  ) {
    errors.push('close command result does not match command conversation')
  }
}

function validateExchange(vector) {
  const { request, result, context } = vector
  const errors = validateRequest(request, context)
  if (!validators.result(result)) errors.push(...validatorErrors(validators.result))
  if (errors.length > 0) return errors
  if (result.requestId !== request.requestId || result.type !== request.type) {
    errors.push('client result does not match request identity')
  }
  if (result.authorization.capability !== request.caller.authorization.capability) {
    errors.push('client result authorization capability does not match request')
  }
  const authorization = expectedAuthorization(request, context)
  if (authorization === undefined) errors.push('authorization was not issued by the Host')
  else {
    const expected = { allowed: 'accepted', denied: 'denied', unavailable: 'unavailable' }[authorization.state]
    if (result.status !== expected || result.authorization.state !== authorization.state) {
      errors.push('client result does not reflect Host authorization outcome')
    }
  }
  if (result.status !== 'accepted') return errors
  if (request.type === 'connector.discover') {
    if (!validators.snapshot(result.snapshot)) errors.push(...validatorErrors(validators.snapshot))
    const registrations = new Set()
    for (const entry of result.snapshot?.registrations ?? []) {
      const key = JSON.stringify(entry.registration)
      if (registrations.has(key)) errors.push('snapshot duplicates registration')
      registrations.add(key)
    }
  }
  if (request.type === 'connector.command.execute') {
    validateExecution(request.command, result.execution, context, errors)
  }
  if (request.type === 'connector.events.subscribe') {
    if (!validators.subscription(result.subscription)) errors.push(...validatorErrors(validators.subscription))
    if (
      !sameRegistration(result.subscription?.registration, request.registration)
      || result.subscription?.afterSequence !== request.afterSequence
    ) {
      errors.push('subscription does not match request registration/cursor')
    }
    if (result.subscription?.snapshotSequence < request.afterSequence) {
      errors.push('subscription snapshot precedes requested replay cursor')
    }
  }
  return errors
}

function validatePages(vector, errors) {
  const subscription = vector.result?.subscription
  let afterSequence = subscription?.afterSequence
  let disposed = false
  const eventIds = new Set()
  for (let index = 0; index < (vector.pages?.length ?? 0); index += 1) {
    const page = vector.pages[index]
    if (!validators.page(page)) {
      errors.push(...validatorErrors(validators.page).map(error => `page[${index}] ${error}`))
      continue
    }
    if (
      page.subscription?.subscriptionId !== subscription?.subscriptionId
      || !sameRegistration(page.subscription?.registration, subscription?.registration)
      || page.subscription?.snapshotSequence !== subscription?.snapshotSequence
    ) {
      errors.push(`page[${index}] does not match subscription`)
    }
    if (page.afterSequence !== afterSequence) errors.push(`page[${index}] replay cursor is not serialized`)
    const expectedPhase = afterSequence < subscription.snapshotSequence ? 'replay' : 'live'
    if (page.phase !== expectedPhase) errors.push(`page[${index}] phase does not match replay cursor`)
    let expectedSequence = page.afterSequence + 1
    for (const event of page.events) {
      if (!sameRegistration(event.registration, subscription.registration)) {
        errors.push(`page[${index}] event registration drifts`)
      }
      if (event.sequence !== expectedSequence) errors.push(`page[${index}] events are not contiguous`)
      expectedSequence += 1
      if (eventIds.has(event.eventId)) errors.push(`page[${index}] duplicates event id ${event.eventId}`)
      eventIds.add(event.eventId)
      if (disposed) errors.push(`page[${index}] contains late event after disposal`)
      if (page.phase === 'replay' && event.sequence > subscription.snapshotSequence) {
        errors.push(`page[${index}] replay includes event after snapshot`)
      }
      if (event.type === 'connector.disposed') disposed = true
    }
    const expectedNext = page.events.length === 0 ? page.afterSequence : page.events.at(-1).sequence
    if (page.nextAfterSequence !== expectedNext) errors.push(`page[${index}] next cursor does not match events`)
    if (page.phase === 'replay' && !page.hasMore && page.nextAfterSequence !== subscription.snapshotSequence) {
      errors.push(`page[${index}] final replay does not reach snapshot`)
    }
    if (page.phase === 'live' && page.hasMore) errors.push(`page[${index}] live page cannot reorder with hasMore`)
    afterSequence = page.nextAfterSequence
  }
}

function validateSubscription(vector) {
  const errors = validateExchange(vector)
  if (vector.result?.subscription !== undefined) validatePages(vector, errors)
  return errors
}

const caseValidators = { exchange: validateExchange, subscription: validateSubscription }

async function jsonFiles(directory) {
  return (await readdir(directory, { withFileTypes: true }))
    .filter(entry => entry.isFile() && entry.name.endsWith('.json'))
    .map(entry => path.join(directory, entry.name))
    .sort()
}

let failures = 0
for (const outcome of ['valid', 'invalid']) {
  for (const file of await jsonFiles(path.join(root, 'test-vectors', 'connector-client', outcome))) {
    const vector = JSON.parse(await readFile(file, 'utf8'))
    const validate = caseValidators[vector?.case]
    const errors = validate === undefined ? [`unknown vector case: ${String(vector?.case)}`] : validate(vector)
    if ((errors.length === 0) !== (outcome === 'valid')) {
      console.error(`${path.relative(root, file)} should be ${outcome}`, errors)
      failures += 1
    }
  }
}

const publicSchemas = JSON.stringify([...schemas.values()])
for (
  const forbidden of [
    'room',
    'provider',
    'workspace',
    'secret',
    'credential',
    'rawBridge',
    'callback',
    'document',
    'selector',
    'path',
    'connection',
  ]
) {
  if (publicSchemas.toLowerCase().includes(forbidden.toLowerCase())) {
    console.error(`Connector client schemas must not expose ${forbidden}`)
    failures += 1
  }
}

if (failures > 0) throw new Error(`${failures} Connector client conformance case(s) failed`)
console.log('Connector client conformance: all vectors passed')
