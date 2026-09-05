import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const schemaNames = [
  'ui-common.v1.schema.json',
  'extension-point-common.v1.schema.json',
  'platform-model.v1.schema.json',
  'platform-model-page.v1.schema.json',
  'platform-session.v1.schema.json',
  'platform-session-page.v1.schema.json',
  'plugin-manifest.v1.schema.json',
  'permission-common.v1.schema.json',
  'permission-policy.v1.schema.json',
  'permission-authorization-plan.v1.schema.json',
  'permission-authorization-decision.v1.schema.json',
]
const schemas = new Map()
for (const name of schemaNames) {
  schemas.set(name, JSON.parse(await readFile(path.join(root, 'schemas', name), 'utf8')))
}

const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true })
addFormats(ajv)
for (const schema of schemas.values()) ajv.addSchema(schema)
const validator = ajv.getSchema(schemas.get('plugin-manifest.v1.schema.json').$id)
if (validator === undefined) throw new Error('plugin manifest schema was not registered')
const modelPageValidator = ajv.getSchema(schemas.get('platform-model-page.v1.schema.json').$id)
if (modelPageValidator === undefined) throw new Error('Platform model page schema was not registered')
const sessionPageValidator = ajv.getSchema(schemas.get('platform-session-page.v1.schema.json').$id)
if (sessionPageValidator === undefined) throw new Error('Platform session page schema was not registered')
const permissionValidators = new Map([
  'permission-policy.v1.schema.json',
  'permission-authorization-plan.v1.schema.json',
  'permission-authorization-decision.v1.schema.json',
].map((name) => {
  const schema = schemas.get(name)
  const activeValidator = ajv.getSchema(schema.$id)
  if (activeValidator === undefined) throw new Error(`${name} was not registered`)
  return [schema.$id, activeValidator]
}))

function sessionKey(ref) {
  return JSON.stringify([ref.providerId, ref.remoteSessionId])
}

function modelKey(ref) {
  return JSON.stringify([ref.providerId, ref.modelId])
}

function normalizedSessionRefs(refs) {
  return [...refs]
    .map(ref => ({ providerId: ref.providerId, remoteSessionId: ref.remoteSessionId }))
    .sort((left, right) => sessionKey(left).localeCompare(sessionKey(right)))
}

function normalizedScope(scope) {
  const normalized = {}
  for (const key of ['providers', 'cwdRoots', 'sessionIds']) {
    if (scope[key] !== undefined) normalized[key] = [...scope[key]].sort()
  }
  if (scope.sessions !== undefined) normalized.sessions = normalizedSessionRefs(scope.sessions)
  return normalized
}

function normalizedReason(reason) {
  return {
    ...(reason.namespace === undefined ? {} : { namespace: reason.namespace }),
    key: reason.key,
    ...(reason.params === undefined ? {} : {
      params: Object.fromEntries(Object.entries(reason.params).sort(([left], [right]) => left.localeCompare(right))),
    }),
    ...(reason.fallback === undefined ? {} : { fallback: reason.fallback }),
  }
}

export function declarationFingerprint(declaration) {
  return JSON.stringify({
    name: declaration.name,
    scope: normalizedScope(declaration.scope),
  })
}

export function validatePermissionDocument(document) {
  const activeValidator = permissionValidators.get(document?.$schema)
  if (activeValidator === undefined) return ['unknown permission document schema']
  const errors = activeValidator(document)
    ? []
    : validatorErrors(activeValidator)
  const entries = document?.declarations ?? document?.decisions ?? []
  const seen = new Set()
  for (const entry of entries) {
    if (seen.has(entry.capability)) errors.push(`duplicate permission capability: ${entry.capability}`)
    seen.add(entry.capability)
  }
  return errors
}

export function validateManifest(manifest) {
  const errors = []
  if (!validator(manifest)) {
    errors.push(...(validator.errors ?? []).map(error => `${error.instancePath || '/'} ${error.message}`))
  }
  const seen = new Set()
  for (const declaration of manifest?.capabilities ?? []) {
    if (seen.has(declaration.name)) errors.push(`duplicate capability declaration: ${declaration.name}`)
    seen.add(declaration.name)
    const isAgent = declaration.name?.startsWith('agent.')
    if (isAgent && declaration.scope?.sessions !== undefined) {
      errors.push(`${declaration.name} cannot use provider-aware Platform session scope`)
    }
    if (!isAgent && declaration.scope?.sessionIds !== undefined) {
      errors.push(`${declaration.name} cannot use provider-neutral Agent session scope`)
    }
  }
  return errors
}

function normalizedQuery(query) {
  return {
    ...(query.providerIds === undefined ? {} : { providerIds: [...query.providerIds].sort() }),
    ...(query.cwd === undefined ? {} : { cwd: query.cwd }),
    ...(query.searchTerm === undefined ? {} : { searchTerm: query.searchTerm }),
    ...(query.limit === undefined ? {} : { limit: query.limit }),
  }
}

function sameQuery(left, right) {
  return JSON.stringify(normalizedQuery(left)) === JSON.stringify(normalizedQuery(right))
}

function validatorErrors(activeValidator) {
  return (activeValidator.errors ?? []).map(error => `${error.instancePath || '/'} ${error.message}`)
}

export function validateModelPage(page) {
  const errors = []
  if (!modelPageValidator(page)) return validatorErrors(modelPageValidator)
  const providers = new Set(page.providerIds)
  const refs = new Set()
  for (const [index, model] of page.models.entries()) {
    const key = modelKey(model.ref)
    if (refs.has(key)) errors.push(`model[${index}] duplicates composite model identity ${key}`)
    refs.add(key)
    if (providers.size > 0 && !providers.has(model.ref.providerId)) {
      errors.push(`model[${index}] provider is outside the model page query`)
    }
  }
  return errors
}

export function validateSessionPageVector(vector) {
  const errors = []
  if (!sessionPageValidator(vector?.page)) return validatorErrors(sessionPageValidator)
  if (!sameQuery(vector.request ?? {}, vector.page.query)) {
    errors.push('session page query does not match the bound request')
  }
  if (vector.request?.cursor !== undefined) {
    if (vector.cursorBinding === undefined) {
      errors.push('cursor continuation is missing its bound query')
    } else if (!sameQuery(vector.request, vector.cursorBinding)) {
      errors.push('cursor was reused with a different normalized query')
    }
  }
  const providers = new Set(vector.page.query.providerIds ?? [])
  const refs = new Set()
  for (const [index, session] of vector.page.sessions.entries()) {
    const key = sessionKey(session.ref)
    if (refs.has(key)) errors.push(`session[${index}] duplicates composite session identity ${key}`)
    refs.add(key)
    if (session.ref.providerId !== session.model.providerId) {
      errors.push(`session[${index}] model provider differs from session provider`)
    }
    if (providers.size > 0 && !providers.has(session.ref.providerId)) {
      errors.push(`session[${index}] provider is outside the session page query`)
    }
  }
  return errors
}

async function jsonFiles(directory) {
  return (await readdir(directory, { withFileTypes: true }))
    .filter(entry => entry.isFile() && entry.name.endsWith('.json'))
    .map(entry => path.join(directory, entry.name))
    .sort()
}

let failures = 0
for (const file of await jsonFiles(path.join(root, 'test-vectors/platform/valid'))) {
  const manifest = JSON.parse(await readFile(file, 'utf8'))
  const errors = validateManifest(manifest)
  if (errors.length > 0) {
    console.error(`${path.relative(root, file)} should be valid`, errors)
    failures += 1
  }
}
for (const file of await jsonFiles(path.join(root, 'test-vectors/platform/invalid'))) {
  const manifest = JSON.parse(await readFile(file, 'utf8'))
  if (validateManifest(manifest).length === 0) {
    console.error(`${path.relative(root, file)} should be invalid`)
    failures += 1
  }
}
for (const file of await jsonFiles(path.join(root, 'test-vectors/platform/model-pages/valid'))) {
  const page = JSON.parse(await readFile(file, 'utf8'))
  const errors = validateModelPage(page)
  if (errors.length > 0) {
    console.error(`${path.relative(root, file)} should be valid`, errors)
    failures += 1
  }
}
for (const file of await jsonFiles(path.join(root, 'test-vectors/platform/model-pages/invalid'))) {
  const page = JSON.parse(await readFile(file, 'utf8'))
  if (validateModelPage(page).length === 0) {
    console.error(`${path.relative(root, file)} should be invalid`)
    failures += 1
  }
}
for (const file of await jsonFiles(path.join(root, 'test-vectors/platform/session-pages/valid'))) {
  const vector = JSON.parse(await readFile(file, 'utf8'))
  const errors = validateSessionPageVector(vector)
  if (errors.length > 0) {
    console.error(`${path.relative(root, file)} should be valid`, errors)
    failures += 1
  }
}
for (const file of await jsonFiles(path.join(root, 'test-vectors/platform/session-pages/invalid'))) {
  const vector = JSON.parse(await readFile(file, 'utf8'))
  if (validateSessionPageVector(vector).length === 0) {
    console.error(`${path.relative(root, file)} should be invalid`)
    failures += 1
  }
}
for (const file of await jsonFiles(path.join(root, 'test-vectors/platform/permissions/valid'))) {
  const document = JSON.parse(await readFile(file, 'utf8'))
  const errors = validatePermissionDocument(document)
  if (errors.length > 0) {
    console.error(`${path.relative(root, file)} should be valid`, errors)
    failures += 1
  }
}
for (const file of await jsonFiles(path.join(root, 'test-vectors/platform/permissions/invalid'))) {
  const document = JSON.parse(await readFile(file, 'utf8'))
  if (validatePermissionDocument(document).length === 0) {
    console.error(`${path.relative(root, file)} should be invalid`)
    failures += 1
  }
}

const base = {
  name: 'tasks.create',
  required: false,
  reason: { key: 'permission.create', fallback: 'Create tasks' },
  scope: { providers: ['zcode', 'codex'], cwdRoots: ['/workspace'] },
}
const reordered = { ...base, scope: { providers: ['codex', 'zcode'], cwdRoots: ['/workspace'] } }
const expanded = { ...base, scope: { providers: ['codex', 'zcode'], cwdRoots: ['/workspace', '/other'] } }
if (declarationFingerprint(base) !== declarationFingerprint(reordered)) {
  console.error('scope list order must not change declaration fingerprint')
  failures += 1
}
if (declarationFingerprint(base) === declarationFingerprint(expanded)) {
  console.error('scope expansion must change declaration fingerprint')
  failures += 1
}
const reorderedReason = {
  ...base,
  reason: { fallback: 'Create tasks', params: { z: 1, a: true }, key: 'permission.create' },
}
const canonicalReason = {
  ...base,
  reason: { key: 'permission.create', params: { a: true, z: 1 }, fallback: 'Create tasks' },
}
if (declarationFingerprint(reorderedReason) !== declarationFingerprint(canonicalReason)) {
  console.error('reason property and param order must not change declaration fingerprint')
  failures += 1
}
const changedMetadata = {
  ...base,
  required: true,
  reason: { key: 'permission.create.updated', fallback: 'Updated explanation' },
}
if (declarationFingerprint(base) !== declarationFingerprint(changedMetadata)) {
  console.error('required/reason metadata must not change the authorization fingerprint')
  failures += 1
}

const scopedSessions = {
  ...base,
  scope: {
    sessions: [
      { providerId: 'zcode', remoteSessionId: 'thread-1' },
      { providerId: 'codex', remoteSessionId: 'thread-1' },
    ],
  },
}
const reorderedSessions = {
  ...base,
  scope: { sessions: [...scopedSessions.scope.sessions].reverse() },
}
const expandedSessions = {
  ...base,
  scope: {
    sessions: [
      ...scopedSessions.scope.sessions,
      { providerId: 'codex', remoteSessionId: 'thread-2' },
    ],
  },
}
if (declarationFingerprint(scopedSessions) !== declarationFingerprint(reorderedSessions)) {
  console.error('composite session scope order must not change declaration fingerprint')
  failures += 1
}
if (declarationFingerprint(scopedSessions) === declarationFingerprint(expandedSessions)) {
  console.error('composite session scope expansion must change declaration fingerprint')
  failures += 1
}

const publicSchemas = JSON.stringify(schemaNames.map(name => schemas.get(name)))
for (const forbidden of ['additionalContext', 'taskIds', 'appserver.raw', 'rawBridge']) {
  if (publicSchemas.includes(forbidden)) {
    console.error(`Platform public schemas must not expose ${forbidden}`)
    failures += 1
  }
}

if (failures > 0) throw new Error(`${failures} Platform conformance case(s) failed`)
console.log('Platform capability conformance: all vectors passed')
