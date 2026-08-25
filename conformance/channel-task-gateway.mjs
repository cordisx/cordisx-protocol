import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const schemaNames = [
  'platform-model.v1.schema.json',
  'platform-session.v1.schema.json',
  'channel-common.v1.schema.json',
  'channel-service-config.v1.schema.json',
  'channel-task-launch-request.v1.schema.json',
  'channel-task-launch-authorization.v1.schema.json',
  'platform-task-dispatch-result.v1.schema.json',
  'platform-task-lifecycle-event.v1.schema.json',
  'platform-task-lifecycle-range.v1.schema.json',
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
  request: schemaValidator('channel-task-launch-request.v1.schema.json'),
  authorization: schemaValidator('channel-task-launch-authorization.v1.schema.json'),
  dispatch: schemaValidator('platform-task-dispatch-result.v1.schema.json'),
  event: schemaValidator('platform-task-lifecycle-event.v1.schema.json'),
  range: schemaValidator('platform-task-lifecycle-range.v1.schema.json'),
}

function validatorErrors(validator) {
  return (validator.errors ?? []).map(error => `${error.instancePath || '/'} ${error.message}`)
}

function canonical(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  return `{${Object.entries(value).sort(([left], [right]) => left.localeCompare(right))
    .map(([key, child]) => `${JSON.stringify(key)}:${canonical(child)}`).join(',')}}`
}

function tenantKey(ref) {
  return canonical([ref.adapterId, ref.accountId, ref.tenantId])
}

function sessionKey(ref) {
  return canonical([ref.providerId, ref.remoteSessionId])
}

function validateSource(source, label) {
  return source.actor === undefined || tenantKey(source.actor) === tenantKey(source)
    ? []
    : [`${label} actor is outside the event account/tenant`]
}

export function validateLaunchRequest(request) {
  if (!validators.request(request)) return validatorErrors(validators.request)
  return validateSource(request.source, 'launch request source')
}

function validateGrantContext(grant, context) {
  const errors = []
  if (context === null || typeof context !== 'object' || Array.isArray(context)) {
    return ['launch authorization requires a Host-private issued-grant context']
  }
  if (typeof context.authorizedAt !== 'string' || Number.isNaN(Date.parse(context.authorizedAt))) {
    errors.push('launch authorization context requires Host-authoritative authorizedAt')
  }
  if (!Array.isArray(context.issuedGrants)) {
    errors.push('launch authorization context requires issuedGrants')
    return errors
  }
  const matching = context.issuedGrants.filter(record => record?.grantToken === grant.grantToken)
  if (matching.length === 0) {
    errors.push('launch authorization token was not issued by the Host')
    return errors
  }
  if (matching.length > 1) errors.push('launch authorization token is duplicated in the Host registry')
  const issued = matching[0]
  if (issued.consumed === true) errors.push('launch authorization token was already consumed')
  const exactFields = [
    'operationId', 'routeId', 'serviceGeneration', 'configurationRevision',
    'source', 'target', 'authorization',
  ]
  for (const field of exactFields) {
    if (canonical(issued[field]) !== canonical(grant[field])) {
      errors.push(`launch authorization ${field} does not match the Host-issued grant`)
    }
  }
  if (!Number.isNaN(Date.parse(context.authorizedAt))
    && Date.parse(grant.authorization.expiresAt) <= Date.parse(context.authorizedAt)) {
    errors.push('launch authorization is expired at Host authorization time')
  }
  return errors
}

export function validateLaunchAuthorization(grant, request, context) {
  const errors = []
  if (!validators.authorization(grant)) return validatorErrors(validators.authorization)
  errors.push(...validateLaunchRequest(request))
  errors.push(...validateSource(grant.source, 'launch authorization source'))
  for (const field of ['operationId', 'routeId', 'serviceGeneration', 'configurationRevision']) {
    if (grant[field] !== request?.[field]) errors.push(`launch authorization ${field} does not match request`)
  }
  if (canonical(grant.source) !== canonical(request?.source)) {
    errors.push('launch authorization source does not match request')
  }
  if (grant.target.workspace.alias !== request?.selectors?.workspaceAlias) {
    errors.push('launch authorization workspace alias does not match request')
  }
  const provider = request?.selectors?.provider
  if (provider !== undefined && 'id' in provider && grant.target.model.providerId !== provider.id) {
    errors.push('launch authorization provider does not match explicit request selector')
  }
  const model = request?.selectors?.model
  if (model !== undefined && 'id' in model && grant.target.model.modelId !== model.id) {
    errors.push('launch authorization model does not match explicit request selector')
  }
  const profile = request?.selectors?.profile
  if (profile !== undefined && 'id' in profile && grant.target.profileId !== profile.id) {
    errors.push('launch authorization profile does not match explicit request selector')
  }
  if (Date.parse(grant.authorization.expiresAt) <= Date.parse(grant.authorization.authorizedAt)) {
    errors.push('launch authorization expiry must follow issuance')
  }
  errors.push(...validateGrantContext(grant, context))
  return errors
}

export function validateDispatchResult(result) {
  const errors = []
  if (!validators.dispatch(result)) return validatorErrors(validators.dispatch)
  if (result.session !== undefined && result.turn !== undefined
    && sessionKey(result.session) !== sessionKey(result.turn.session)) {
    errors.push('dispatch result turn session does not match result session')
  }
  if (result.session !== undefined && result.lifecycle !== undefined
    && sessionKey(result.session) !== sessionKey(result.lifecycle.session)) {
    errors.push('dispatch result lifecycle cursor does not match result session')
  }
  return errors
}

export function validateLifecycleEvent(event) {
  return validators.event(event) ? [] : validatorErrors(validators.event)
}

export function validateLifecycleRange(range) {
  const errors = []
  if (!validators.range(range)) return validatorErrors(validators.range)
  let expected = range.afterSequence + 1
  const eventIds = new Set()
  const terminalTurns = new Set()
  for (const event of range.events) {
    if (sessionKey(event.session) !== sessionKey(range.session)) {
      errors.push(`lifecycle event ${event.eventId} is outside the range session`)
    }
    if (event.sequence !== expected) errors.push(`lifecycle range has a sequence gap at ${expected}`)
    expected = event.sequence + 1
    if (eventIds.has(event.eventId)) errors.push(`lifecycle range duplicates event id: ${event.eventId}`)
    eventIds.add(event.eventId)
    if (event.type === 'turn.completed' || event.type === 'turn.failed') {
      const key = `${sessionKey(event.session)}\0${event.turnId}`
      if (terminalTurns.has(key)) errors.push(`lifecycle range duplicates terminal turn: ${event.turnId}`)
      terminalTurns.add(key)
    }
  }
  const expectedNext = range.events.length === 0 ? range.afterSequence : range.events.at(-1).sequence
  if (range.nextAfterSequence !== expectedNext) {
    errors.push('lifecycle range nextAfterSequence does not match the committed tail')
  }
  return errors
}

const caseValidators = {
  'launch-request': vector => validateLaunchRequest(vector.value),
  'launch-authorization': vector => validateLaunchAuthorization(vector.value, vector.request, vector.context),
  'dispatch-result': vector => validateDispatchResult(vector.value),
  'lifecycle-event': vector => validateLifecycleEvent(vector.value),
  'lifecycle-range': vector => validateLifecycleRange(vector.value),
}

async function jsonFiles(directory) {
  return (await readdir(directory, { withFileTypes: true }))
    .filter(entry => entry.isFile() && entry.name.endsWith('.json'))
    .map(entry => path.join(directory, entry.name))
    .sort()
}

function validateVector(vector) {
  const validate = caseValidators[vector?.case]
  return validate === undefined ? [`unknown vector case: ${String(vector?.case)}`] : validate(vector)
}

let failures = 0
for (const file of await jsonFiles(path.join(root, 'test-vectors/channel-task-gateway/valid'))) {
  const vector = JSON.parse(await readFile(file, 'utf8'))
  const errors = validateVector(vector)
  if (errors.length > 0) {
    console.error(`${path.relative(root, file)} should be valid`, errors)
    failures += 1
  }
}
for (const file of await jsonFiles(path.join(root, 'test-vectors/channel-task-gateway/invalid'))) {
  const vector = JSON.parse(await readFile(file, 'utf8'))
  const errors = validateVector(vector)
  if (errors.length === 0) {
    console.error(`${path.relative(root, file)} should be invalid`)
    failures += 1
  }
  if (Array.isArray(vector.expectedErrors)
    && JSON.stringify([...errors].sort()) !== JSON.stringify([...vector.expectedErrors].sort())) {
    console.error(`${path.relative(root, file)} errors differ from expectedErrors`, {
      expected: vector.expectedErrors,
      actual: errors,
    })
    failures += 1
  }
}

const rendererSafeChannelSchemas = JSON.stringify(await Promise.all([
  'channel-binding.v1.schema.json',
  'channel-runtime-snapshot.v1.schema.json',
  'channel-runtime-snapshot.v2.schema.json',
  'channel-runtime-snapshot.v3.schema.json',
  'channel-service-config-descriptor.v1.schema.json',
  'channel-manager-request.v1.schema.json',
  'channel-manager-request.v2.schema.json',
  'channel-manager-result.v1.schema.json',
  'channel-manager-result.v2.schema.json',
  'channel-manager-log-page.v1.schema.json',
  'channel-manager-log-page.v2.schema.json',
].map(async name => JSON.parse(await readFile(path.join(root, 'schemas', name), 'utf8')))))
const launcherPrivateSchemas = JSON.stringify([
  'channel-task-launch-request.v1.schema.json',
  'channel-task-launch-authorization.v1.schema.json',
  'platform-task-dispatch-result.v1.schema.json',
  'platform-task-lifecycle-event.v1.schema.json',
  'platform-task-lifecycle-range.v1.schema.json',
].map(name => schemas.get(name)))
if (rendererSafeChannelSchemas.includes('grantToken') || rendererSafeChannelSchemas.includes('workspaceAlias')) {
  console.error('Channel renderer-safe schemas must not expose launch authority')
  failures += 1
}
if (!launcherPrivateSchemas.includes('cwd') || !launcherPrivateSchemas.includes('grantToken')) {
  console.error('Launcher-private task schemas must retain resolved cwd and single-use grant authority')
  failures += 1
}
for (const forbidden of ['secretRef', 'secretValue', 'credentialValue', 'rawBody', 'rawEvent', 'rawBridge', 'electronBridge']) {
  if (launcherPrivateSchemas.includes(forbidden)) {
    console.error(`Launcher-private task schemas must not expose ${forbidden}`)
    failures += 1
  }
}

if (failures > 0) throw new Error(`${failures} Channel task gateway conformance case(s) failed`)
console.log('Channel task gateway conformance: all vectors passed')
