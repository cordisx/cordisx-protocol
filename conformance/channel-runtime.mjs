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
  'plugin-config-common.v2.schema.json',
  'service-config-common.v1.schema.json',
  'platform-model.v1.schema.json',
  'platform-session.v1.schema.json',
  'channel-common.v1.schema.json',
  'channel-user-input.v1.schema.json',
  'channel-manager-common.v1.schema.json',
  'channel-binding.v1.schema.json',
  'channel-runtime-snapshot.v1.schema.json',
  'channel-runtime-snapshot.v2.schema.json',
  'channel-manager-request.v1.schema.json',
  'channel-manager-result.v1.schema.json',
  'channel-manager-log-page.v1.schema.json',
  'channel-manager-log-export-result.v1.schema.json',
  'channel-inbound-message-intent.v1.schema.json',
  'channel-sourced-gateway-request.v1.schema.json',
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
  snapshotV2: schemaValidator('channel-runtime-snapshot.v2.schema.json'),
  managerRequest: schemaValidator('channel-manager-request.v1.schema.json'),
  managerResult: schemaValidator('channel-manager-result.v1.schema.json'),
  logPage: schemaValidator('channel-manager-log-page.v1.schema.json'),
  logExportResult: schemaValidator('channel-manager-log-export-result.v1.schema.json'),
  inboundIntent: schemaValidator('channel-inbound-message-intent.v1.schema.json'),
  gatewayRequest: schemaValidator('channel-sourced-gateway-request.v1.schema.json'),
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

function validateConfiguredConnections(config) {
  const errors = []
  const connections = new Set()
  for (const connection of config.connections) {
    const key = tenantKey(connection.ref)
    if (connections.has(key)) errors.push(`duplicate configured connection: ${key}`)
    connections.add(key)
  }

  return errors
}

export function validateServiceConfig(config) {
  if (!validators.config(config)) return validatorErrors(validators.config)
  return validateConfiguredConnections(config)
}

export function validateServiceConfigDescriptor(descriptor) {
  if (!validators.configDescriptor(descriptor)) return validatorErrors(validators.configDescriptor)
  const errors = validateConfiguredConnections(descriptor.configuration)
  if (descriptor.schema?.projection?.kind !== 'schemastery') {
    errors.push('Channel connection descriptor must use a Host-owned Schemastery projection')
  }
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

  return errors
}

function targetKindForOperation(operation) {
  if (operation === 'credential.capture') return 'credential-capture'
  if (operation === 'connection.create') return 'connection-draft'
  if (operation.startsWith('connection.')) return 'connection'
  if (operation.startsWith('binding.')) return 'binding'
  if (operation.startsWith('logs.')) return 'log'
  return undefined
}

function validateManagerOperation(value, validator, label) {
  const errors = []
  if (!validator(value)) return validatorErrors(validator)
  const expectedTargetKind = targetKindForOperation(value.operation)
  if (expectedTargetKind !== undefined && value.target.kind !== expectedTargetKind) {
    errors.push(`${label} target does not match operation`)
  }
  return errors
}

export function validateSnapshotV2(snapshot) {
  const errors = []
  if (!validators.snapshotV2(snapshot)) return validatorErrors(validators.snapshotV2)

  const connectionTokens = new Set()
  for (const account of snapshot.accounts) {
    const key = account.connectionToken
    if (connectionTokens.has(key)) errors.push(`duplicate connection token: ${key}`)
    connectionTokens.add(key)
    if (account.availableOperations.includes('connection.enable') && account.connectionState !== 'disabled') {
      errors.push(`connection.enable is unavailable for non-disabled account: ${key}`)
    }
    if (account.availableOperations.includes('connection.disable') && account.connectionState === 'disabled') {
      errors.push(`connection.disable is unavailable for disabled account: ${key}`)
    }
  }

  const bindingTokens = new Set()
  for (const binding of snapshot.bindings) {
    if (bindingTokens.has(binding.bindingToken)) errors.push(`duplicate binding token: ${binding.bindingToken}`)
    bindingTokens.add(binding.bindingToken)
    if (!connectionTokens.has(binding.connectionToken)) {
      errors.push(`binding ${binding.bindingToken} has no account snapshot`)
    }
    if (binding.state === 'active') {
      if (binding.availableOperations.includes('binding.restore')) {
        errors.push(`binding.restore is unavailable for active binding: ${binding.bindingToken}`)
      }
    }
    if (binding.state === 'archived' && binding.availableOperations.includes('binding.archive')) {
      errors.push(`binding.archive is unavailable for archived binding: ${binding.bindingToken}`)
    }
  }
  return errors
}

function validateManagerContext(context) {
  const errors = []
  if (context === null || typeof context !== 'object' || Array.isArray(context)) {
    return { errors: ['Channel Manager request requires a Host-issued token context'], tokens: new Map(), snapshot: undefined }
  }
  const hasSnapshot = context.snapshot !== undefined
  if (!hasSnapshot) errors.push('Channel Manager token context requires the current v2 snapshot for operation authorization')
  if (typeof context.authorizedAt !== 'string' || Number.isNaN(Date.parse(context.authorizedAt))) {
    errors.push('Channel Manager token context requires Host-authoritative authorizedAt')
  }
  const snapshotErrors = hasSnapshot ? validateSnapshotV2(context.snapshot) : []
  errors.push(...snapshotErrors.map(error => `Channel Manager token context snapshot: ${error}`))
  const profileId = hasSnapshot ? context.snapshot?.profileId : context.profileId
  const hostGeneration = hasSnapshot ? context.snapshot?.hostGeneration : context.hostGeneration
  if (typeof profileId !== 'string' || typeof hostGeneration !== 'string') {
    errors.push('Channel Manager token context requires profileId and hostGeneration')
  }
  if (!Array.isArray(context.issuedTokens)) {
    errors.push('Channel Manager token context requires issuedTokens')
    return { errors, tokens: new Map(), snapshot: context.snapshot }
  }
  const tokens = new Map()
  const tokenTarget = {
    connection: ['connection', 'connectionToken'],
    binding: ['binding', 'bindingToken'],
    'credential-capture': ['credential-capture', 'captureToken'],
    'connection-draft': ['connection-draft', 'connectionDraftToken'],
    'credential-draft': ['credential-draft', 'credentialDraftToken'],
  }
  const add = (token, kind, profileId, hostGeneration, bindingRevision, target, expiresAt) => {
    if (typeof token !== 'string' || !/^chm1_[A-Za-z0-9_-]{43}$/.test(token)) {
      errors.push(`Channel Manager token context has an invalid ${kind} token`)
      return
    }
    if (tokens.has(token)) {
      errors.push(`Channel Manager token context duplicates token: ${token}`)
      return
    }
    tokens.set(token, { kind, profileId, hostGeneration, bindingRevision, target, expiresAt })
  }
  for (const issued of context.issuedTokens) {
    if (issued === null || typeof issued !== 'object' || Array.isArray(issued)
      || !['connection', 'binding', 'credential-capture', 'connection-draft', 'credential-draft'].includes(issued.kind)
      || typeof issued.token !== 'string'
      || typeof issued.profileId !== 'string'
      || typeof issued.hostGeneration !== 'string'
      || issued.target === null || typeof issued.target !== 'object' || Array.isArray(issued.target)
      || typeof issued.expiresAt !== 'string' || Number.isNaN(Date.parse(issued.expiresAt))) {
      errors.push('Channel Manager token context has an invalid issued token record')
      continue
    }
    const [targetKind, targetField] = tokenTarget[issued.kind]
    if (Object.keys(issued.target).some(key => !['kind', targetField, ...(issued.kind === 'binding' ? ['bindingRevision'] : [])].includes(key))
      || issued.target.kind !== targetKind || issued.target[targetField] !== issued.token
      || (issued.kind === 'binding' && (!Number.isInteger(issued.bindingRevision) || issued.bindingRevision < 1 || issued.target.bindingRevision !== issued.bindingRevision))) {
      errors.push('Channel Manager token context target identity does not match issued token')
      continue
    }
    if (!Number.isNaN(Date.parse(context.authorizedAt)) && Date.parse(issued.expiresAt) <= Date.parse(context.authorizedAt)) {
      errors.push('Channel Manager token context issued token is expired at Host authorization time')
      continue
    }
    add(issued.token, issued.kind, issued.profileId, issued.hostGeneration, issued.bindingRevision, issued.target, issued.expiresAt)
  }
  return { errors, tokens, snapshot: hasSnapshot ? context.snapshot : { profileId, hostGeneration } }
}

function validateKnownManagerToken(token, kind, request, context, errors, label) {
  const known = context.tokens.get(token)
  if (known === undefined) {
    errors.push(`${label} was not issued by the Host`)
    return
  }
  if (known.kind !== kind) errors.push(`${label} has the wrong target kind`)
  if (known.profileId !== request.profileId || known.hostGeneration !== request.hostGeneration) {
    errors.push(`${label} is outside the request profile or Host generation`)
  }
  const targetField = {
    connection: 'connectionToken',
    binding: 'bindingToken',
    'credential-capture': 'captureToken',
    'connection-draft': 'connectionDraftToken',
    'credential-draft': 'credentialDraftToken',
  }[kind]
  if (known.target?.[targetField] !== token) errors.push(`${label} target identity does not match the Host-issued token`)
}

function validateSnapshotOperation(request, context, errors) {
  const snapshot = context.snapshot
  if (snapshot === undefined || !Array.isArray(snapshot.accounts) || !Array.isArray(snapshot.bindings)) return
  let operations
  if (['credential.capture', 'connection.create'].includes(request.operation)) {
    operations = snapshot.availableOperations
  } else if (request.operation.startsWith('connection.') || request.operation.startsWith('logs.')) {
    operations = snapshot.accounts.find(account => account.connectionToken === request.target.connectionToken)?.availableOperations
  } else if (request.operation.startsWith('binding.')) {
    operations = snapshot.bindings.find(binding => binding.bindingToken === request.target.bindingToken)?.availableOperations
  }
  if (!Array.isArray(operations) || !operations.includes(request.operation)) {
    errors.push(`Channel Manager operation is not authorized by the current snapshot: ${request.operation}`)
  }
}

export function validateManagerRequest(request, context) {
  const errors = validateManagerOperation(request, validators.managerRequest, 'Channel Manager request')
  if (errors.length > 0 || request === null || typeof request !== 'object') return errors
  const validatedContext = validateManagerContext(context)
  errors.push(...validatedContext.errors)
  if (validatedContext.snapshot.profileId !== request.profileId || validatedContext.snapshot.hostGeneration !== request.hostGeneration) {
    errors.push('Channel Manager request does not match the token context profile or Host generation')
  }
  if (validatedContext.snapshot.revision !== undefined && validatedContext.snapshot.revision !== request.expectedRevision) {
    errors.push('Channel Manager request expectedRevision does not match the token context snapshot')
  }
  const tokenByTarget = {
    connection: ['connectionToken', 'connection'],
    'connection-draft': ['connectionDraftToken', 'connection-draft'],
    'credential-capture': ['captureToken', 'credential-capture'],
    binding: ['bindingToken', 'binding'],
    log: ['connectionToken', 'connection'],
  }
  const targetToken = tokenByTarget[request.target.kind]
  if (targetToken !== undefined) {
    validateKnownManagerToken(request.target[targetToken[0]], targetToken[1], request, validatedContext, errors, `Channel Manager ${request.target.kind} token`)
  }
  if (['connection.create', 'connection.rotate-credential'].includes(request?.operation)) {
    validateKnownManagerToken(request.draft?.credentialDraftToken, 'credential-draft', request, validatedContext, errors, 'Channel Manager credential draft token')
  }
  if (request.operation.startsWith('binding.')) {
    const known = validatedContext.tokens.get(request.target.bindingToken)
    if (known?.bindingRevision !== request.target.bindingRevision) errors.push('Channel Manager binding revision is stale')
  }
  validateSnapshotOperation(request, validatedContext, errors)
  return errors
}

export function validateManagerResult(result) {
  return validateManagerOperation(result, validators.managerResult, 'Channel Manager result')
}

export function validateLogPage(page, request, context) {
  const errors = []
  if (!validators.logPage(page)) return validatorErrors(validators.logPage)
  errors.push(...validateManagerRequest(request, context))
  const validatedContext = validateManagerContext(context)
  if (request?.operation !== 'logs.query') errors.push('safe log page must be associated with a logs.query request')
  for (const field of ['requestId', 'expectedRevision', 'profileId', 'hostGeneration']) {
    if (page[field] !== request?.[field]) errors.push(`safe log page ${field} does not match query request`)
  }
  if (page.target?.kind !== request?.target?.kind || page.target?.connectionToken !== request?.target?.connectionToken) {
    errors.push('safe log page target does not match query request')
  }
  if (page.snapshotRevision !== request?.expectedRevision) {
    errors.push('safe log page snapshotRevision does not match query request')
  }
  if (validatedContext.snapshot?.revision !== undefined && page.snapshotRevision !== validatedContext.snapshot.revision) {
    errors.push('safe log page snapshotRevision does not match the token context snapshot')
  }
  const entries = new Set()
  for (const entry of page.entries) {
    if (entries.has(entry.entryId)) errors.push(`duplicate log entry id: ${entry.entryId}`)
    entries.add(entry.entryId)
    if (entry.connectionToken !== page.target.connectionToken) {
      errors.push(`log entry ${entry.entryId} is outside the page target`)
    }
  }
  return errors
}

export function validateLogExportResult(result) {
  const errors = []
  if (!validators.logExportResult(result)) return validatorErrors(validators.logExportResult)
  if (result.status === 'created' && Date.parse(result.expiresAt) < Date.parse(result.observedAt)) {
    errors.push('log export expiresAt precedes observedAt')
  }
  return errors
}

export function validateInboundIntent(intent) {
  const errors = []
  if (!validators.inboundIntent(intent)) return validatorErrors(validators.inboundIntent)
  if (tenantKey(intent.target.account) !== tenantKey(intent.event)) {
    errors.push('inbound intent target is outside the event account/tenant')
  }
  errors.push(...validateEventActor(intent.event, 'inbound intent event'))
  return errors
}

export function validateGatewayRequest(request) {
  const errors = []
  if (!validators.gatewayRequest(request)) return validatorErrors(validators.gatewayRequest)
  errors.push(...validateInboundIntent(request.intent))
  for (const field of ['requestId', 'expectedRevision', 'profileId', 'hostGeneration']) {
    if (request[field] !== request.intent[field]) errors.push(`gateway request ${field} does not match intent`)
  }
  if (tenantKey(request.target.account) !== tenantKey(request.intent.target.account)) {
    errors.push('gateway request target does not match intent target')
  }
  return errors
}

const caseValidators = {
  manifest: validateManifest,
  input: validateInput,
  binding: validateBinding,
  snapshot: validateSnapshot,
  'snapshot-v2': validateSnapshotV2,
  'manager-request': validateManagerRequest,
  'manager-result': validateManagerResult,
  'log-page': validateLogPage,
  'log-export-result': validateLogExportResult,
  'inbound-intent': validateInboundIntent,
  'gateway-request': validateGatewayRequest,
  config: validateServiceConfig,
  configDescriptor: validateServiceConfigDescriptor,
}

function validateVector(vector) {
  const validate = caseValidators[vector?.case]
  if (validate === undefined) return [`unknown vector case: ${String(vector?.case)}`]
  if (vector.case === 'manager-request') return validate(vector.value, vector.context)
  if (vector.case === 'log-page') return validate(vector.value, vector.request, vector.context)
  return validate(vector.value)
}

async function jsonFiles(directory) {
  return (await readdir(directory, { withFileTypes: true }))
    .filter(entry => entry.isFile() && entry.name.endsWith('.json'))
    .map(entry => path.join(directory, entry.name))
    .sort()
}

let failures = 0
const expectedManagerInvalidErrors = {
  'manager-binding-stale-cas.json': 'binding revision is stale',
  'manager-binding-unknown-cas.json': 'binding token was not issued',
  'manager-create-never-captured.json': 'credential draft token was not issued',
  'manager-export-raw-token.json': 'must match pattern',
  'manager-issued-token-expired-at-authorization.json': 'expired at Host authorization time',
  'manager-issued-token-expired.json': 'requires Host-authoritative authorizedAt',
  'manager-log-local-path.json': 'additional properties',
  'manager-log-raw-payload.json': 'additional properties',
  'manager-log-raw-token.json': 'must match pattern',
  'manager-log-request-id-mismatch.json': 'safe log page requestId does not match query request',
  'manager-log-revision-mismatch.json': 'safe log page expectedRevision does not match query request',
  'manager-log-snapshot-revision-mismatch.json': 'safe log page snapshotRevision does not match query request',
  'manager-log-target-mismatch.json': 'safe log page target does not match query request',
  'manager-operation-unavailable-binding.json': 'operation is not authorized by the current snapshot',
  'manager-operation-unavailable-connection.json': 'operation is not authorized by the current snapshot',
  'manager-operation-unavailable-log.json': 'operation is not authorized by the current snapshot',
  'manager-operation-unavailable-root.json': 'operation is not authorized by the current snapshot',
  'manager-request-credential-value.json': 'additional properties',
  'manager-request-forged-issued-shape.json': 'connection token was not issued',
  'manager-request-local-path.json': 'additional properties',
  'manager-request-raw-token.json': 'must match pattern',
  'manager-request-secret-ref.json': 'additional properties',
  'manager-request-stale-snapshot-revision.json': 'expectedRevision does not match the token context snapshot',
  'manager-request-wrong-target.json': 'must be equal to constant',
  'manager-result-raw-id.json': 'additional properties',
  'manager-result-raw-token.json': 'must match pattern',
  'manager-snapshot-token-unregistered.json': 'connection token was not issued',
  'manager-snapshot-v2-raw-id.json': 'additional properties',
  'manager-snapshot-v2-stale-operation.json': 'connection.enable is unavailable for non-disabled account',
  'manager-token-raw-value.json': 'must match pattern',
}
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
  const errors = validateVector(vector)
  if (errors.length === 0) {
    console.error(`${path.relative(root, file)} should be invalid`)
    failures += 1
  }
  if (path.basename(file).startsWith('manager-')) {
    if (!Array.isArray(vector.expectedErrors)) {
      console.error(`${path.relative(root, file)} requires an exact expectedErrors array`)
      failures += 1
    } else if (JSON.stringify([...errors].sort()) !== JSON.stringify([...vector.expectedErrors].sort())) {
      console.error(`${path.relative(root, file)} errors differ from expectedErrors`, { expected: vector.expectedErrors, actual: errors })
      failures += 1
    }
  }
}

const hostConfigSchema = JSON.stringify(schemas.get('channel-service-config.v1.schema.json'))
const rendererSafeSchemas = JSON.stringify(schemaNames
  .filter(name => ![
    'channel-service-config.v1.schema.json',
    'channel-inbound-message-intent.v1.schema.json',
    'channel-sourced-gateway-request.v1.schema.json',
  ].includes(name))
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

const managerSafeSchemas = JSON.stringify([
  'channel-manager-common.v1.schema.json',
  'channel-runtime-snapshot.v2.schema.json',
  'channel-manager-request.v1.schema.json',
  'channel-manager-result.v1.schema.json',
  'channel-manager-log-page.v1.schema.json',
  'channel-manager-log-export-result.v1.schema.json',
].map(name => schemas.get(name)))
for (const forbidden of ['secretRef', 'secretValue', 'credentialValue', 'rawPayload', 'rawBody', 'localPath', 'callbackBody', 'appId', 'tenantId', 'accountId', 'adapterId', 'eventId', 'routeId', 'providerId', 'remoteSessionId', 'conversationId', 'sessionId', 'userId', 'threadId']) {
  if (managerSafeSchemas.includes(forbidden)) {
    console.error(`Channel Manager schemas must not expose ${forbidden}`)
    failures += 1
  }
}

if (failures > 0) throw new Error(`${failures} Channel runtime conformance case(s) failed`)
console.log('Channel runtime conformance: all vectors passed')
