import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readdir, readFile } from 'node:fs/promises'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const schemas = new Map()
for (const name of (await readdir(path.join(root, 'schemas'))).filter(name => name.endsWith('.schema.json')).sort()) {
  const value = JSON.parse(await readFile(path.join(root, 'schemas', name), 'utf8'))
  schemas.set(value.$id, value)
}
const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true })
addFormats(ajv)
for (const schema of schemas.values()) ajv.addSchema(schema)
const schemaId = name => `https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/${name}`
const validator = name => {
  const result = ajv.getSchema(schemaId(name))
  if (result === undefined) throw new Error(`${name} was not registered`)
  return result
}
const schemaErrors = (name, value) => {
  const validate = validator(name)
  return validate(value) ? [] : (validate.errors ?? []).map(error => `${error.instancePath || '/'} ${error.message}`)
}

const frozenFiles = [
  ...[1, 2, 3, 4, 5].flatMap(version => [
    `schemas/plugin-manifest.v${version}.schema.json`,
    `schemas/plugin-package.v${version}.schema.json`,
  ]),
  'types/agents.v1.d.ts',
  'types/sessions.v1.d.ts',
].sort()
const frozenDigest = createHash('sha256')
for (const file of frozenFiles) {
  frozenDigest.update(file)
  frozenDigest.update('\0')
  frozenDigest.update(readFileSync(path.join(root, file)))
  frozenDigest.update('\0')
}
assert.equal(
  frozenDigest.digest('hex'),
  '2401260b6bc11538fc43378834048eb41b330f0de780d58579df35a459efa084',
  'manifest/package v1-v5 and Agent/Session types must remain byte-frozen',
)

const routeScope = Object.freeze({
  kind: 'host-route-param',
  routeId: 'room-session-detail',
  param: 'sessionId',
})
const requestDeclaration = Object.freeze({
  name: 'approvals.request',
  required: false,
  scope: { sessionIds: routeScope },
})
const answerDeclaration = Object.freeze({
  name: 'approvals.answer',
  required: false,
  scope: { sessionIds: routeScope },
})
const agentRuntimeCapabilities = Object.freeze([
  'agents.create',
  'agents.resume',
  'agents.get',
  'agents.message.submit',
  'agents.message.cancel',
  'agents.cancel',
  'agents.live.subscribe',
  'sessions.get',
  'sessions.read',
  'sessions.subscribe',
  'approvals.request',
  'approvals.answer',
])
const manifest = Object.freeze({
  $schema: schemaId('plugin-manifest.v6.schema.json'),
  schemaVersion: 6,
  id: 'chatroom',
  capabilities: [requestDeclaration, answerDeclaration],
  services: [],
})

function resolveRouteScope(declaration, registration, routes, activeRoute) {
  const errors = []
  const binding = declaration?.scope?.sessionIds
  const route = routes.find(candidate =>
    candidate.document.id === binding?.routeId && candidate.owner.source === registration.source
    && candidate.owner.pluginId === registration.pluginId
  )
  if (route === undefined) errors.push('route is absent or belongs to another owner')
  if (route !== undefined) {
    errors.push(...schemaErrors('route.v2.schema.json', route.document).map(error => `route ${error}`))
  }
  if (route?.document.path.includes('*')) errors.push('wildcard routes cannot mint Session authority')
  const pathParameters =
    route?.document.path.split('/').filter(segment => segment.startsWith(':')).map(segment => segment.slice(1)) ?? []
  if (pathParameters.filter(param => param === binding?.param).length !== 1) {
    errors.push('route must declare :sessionId exactly once')
  }
  if (activeRoute?.owner?.source !== registration.source || activeRoute?.owner?.pluginId !== registration.pluginId) {
    errors.push('active route owner mismatch')
  }
  if (activeRoute?.owner?.generation !== registration.generation) errors.push('active route generation is stale')
  if (activeRoute?.routeId !== binding?.routeId) errors.push('the declared route instance is not active')
  const sessionId = activeRoute?.params?.[binding?.param]
  if (typeof sessionId !== 'string' || sessionId.length < 1 || sessionId.length > 512 || sessionId.includes('*')) {
    errors.push('active route has no exact valid SessionId')
  }
  return errors.length === 0
    ? { status: 'resolved', scope: { sessionIds: [sessionId] } }
    : { status: 'unavailable', code: 'exact-route-session-unavailable', errors }
}

function semanticErrors(value) {
  const errors = schemaErrors('plugin-manifest.v6.schema.json', value)
  const names = new Set()
  for (const declaration of value.capabilities ?? []) {
    if (names.has(declaration.name)) errors.push(`duplicate capability ${declaration.name}`)
    names.add(declaration.name)
  }
  return errors
}

assert.deepEqual(semanticErrors(manifest), [])
assert.deepEqual(structuredClone(manifest), manifest, 'manifest and route binding must be structured-clone safe')
assert.notDeepEqual(
  schemaErrors('plugin-manifest.v5.schema.json', {
    ...manifest,
    $schema: schemaId('plugin-manifest.v5.schema.json'),
    schemaVersion: 5,
  }),
  [],
  'manifest v5 must reject approval route capabilities',
)
for (const capability of agentRuntimeCapabilities) {
  const exact = {
    ...manifest,
    capabilities: [{
      name: capability,
      required: capability !== 'approvals.request',
      scope: { sessionIds: ['session-exact-1'] },
    }],
  }
  assert.deepEqual(semanticErrors(exact), [], `${capability} must support exact SessionId scope`)
  const dynamic = {
    ...manifest,
    capabilities: [{ name: capability, required: false, scope: { sessionIds: routeScope } }],
  }
  assert.deepEqual(semanticErrors(dynamic), [], `${capability} must support optional exact Host route scope`)
}
assert.deepEqual(
  semanticErrors({ ...manifest, capabilities: [{ name: 'agents.create', required: true, scope: {} }] }),
  [],
  'non-approval Agent capabilities may retain an unscoped maximum declaration',
)

const registration = Object.freeze({ source: 'file:///plugins/chatroom.mjs', pluginId: 'chatroom', generation: 9 })
const exactSessionRoute = Object.freeze({
  $schema: schemaId('route.v2.schema.json'),
  schemaVersion: 2,
  id: 'room-session-detail',
  path: '/main/chatroom/:roomId/session/:sessionId',
  outlet: 'manager.content',
  page: 'room-session-detail',
  title: { key: 'room.session.title', fallback: 'Room session' },
  description: { key: 'room.session.description', fallback: 'Exact session detail route.' },
})
assert.deepEqual(schemaErrors('route.v2.schema.json', exactSessionRoute), [])
const routes = Object.freeze([{
  owner: { source: registration.source, pluginId: registration.pluginId },
  document: exactSessionRoute,
}])
const activeRoute = Object.freeze({
  owner: registration,
  routeId: 'room-session-detail',
  params: { roomId: 'room-1', sessionId: 'session-exact-1' },
})
const resolved = resolveRouteScope(requestDeclaration, registration, routes, activeRoute)
assert.deepEqual(resolved, { status: 'resolved', scope: { sessionIds: ['session-exact-1'] } })
assert.equal(resolved.scope.sessionIds.length, 1, 'one route instance grants exactly one SessionId')

const invalidDocuments = [
  { ...requestDeclaration, required: true },
  { ...requestDeclaration, scope: {} },
  { ...requestDeclaration, scope: { sessionIds: [] } },
  { ...requestDeclaration, scope: { sessionIds: ['session-exact-1', 'session-exact-1'] } },
  { ...requestDeclaration, scope: { sessionIds: ['*'] } },
  { ...requestDeclaration, scope: { sessionIds: { kind: 'host-route-param', routeId: 'room-session-detail' } } },
  { ...requestDeclaration, scope: { sessionIds: { ...routeScope, kind: 'session-search' } } },
  { ...requestDeclaration, scope: { sessionIds: { ...routeScope, param: 'roomId' } } },
  { ...requestDeclaration, scope: { sessionIds: { ...routeScope, routeId: '*' } } },
  { ...requestDeclaration, scope: { sessionIds: { ...routeScope, wildcard: true } } },
  { ...requestDeclaration, owner: 'chatroom' },
]
for (const declaration of invalidDocuments) {
  const candidate = { ...manifest, capabilities: [declaration] }
  assert.notDeepEqual(semanticErrors(candidate), [], `${JSON.stringify(declaration)} must fail closed`)
}
assert.notDeepEqual(
  semanticErrors({ ...manifest, capabilities: [requestDeclaration, structuredClone(requestDeclaration)] }),
  [],
  'duplicate request declarations must fail closed',
)

const unavailableCases = [
  { routes: [{ owner: { source: registration.source, pluginId: 'other' }, document: exactSessionRoute }], activeRoute },
  {
    routes: [{
      owner: { source: registration.source, pluginId: registration.pluginId },
      document: { ...exactSessionRoute, path: '/main/chatroom/:roomId' },
    }],
    activeRoute,
  },
  { routes, activeRoute: { ...activeRoute, owner: { ...registration, generation: 10 } } },
  { routes, activeRoute: { ...activeRoute, routeId: 'other-route' } },
  { routes, activeRoute: { ...activeRoute, params: {} } },
  { routes, activeRoute: { ...activeRoute, params: { sessionId: '*' } } },
]
for (const candidate of unavailableCases) {
  assert.equal(
    resolveRouteScope(requestDeclaration, registration, candidate.routes, candidate.activeRoute).status,
    'unavailable',
  )
}

const packageManifest = Object.freeze({
  $schema: schemaId('plugin-package.v6.schema.json'),
  schemaVersion: 6,
  id: 'chatroom',
  version: '1.0.0',
  entry: './index.mjs',
  distribution: { mode: 'explicit-local-v1', signature: 'unsupported' },
  compatibility: { runtimeAbi: 1, protocolSchemas: [schemaId('plugin-manifest.v6.schema.json')] },
  dependencies: [],
  runtimeManifest: {
    path: './runtime.json',
    schema: schemaId('plugin-manifest.v6.schema.json'),
    digest: `sha256:${'1'.repeat(64)}`,
  },
})
assert.deepEqual(schemaErrors('plugin-package.v6.schema.json', packageManifest), [])
assert.notDeepEqual(
  schemaErrors('plugin-package.v5.schema.json', {
    ...packageManifest,
    $schema: schemaId('plugin-package.v5.schema.json'),
    schemaVersion: 5,
  }),
  [],
  'package v5 must reject runtime manifest v6',
)
assert.ok(
  packageManifest.compatibility.protocolSchemas.includes(packageManifest.runtimeManifest.schema),
  'package compatibility must name runtime manifest v6 exactly',
)

const publicBytes = JSON.stringify([
  schemas.get(schemaId('plugin-manifest.v6.schema.json')),
  schemas.get(schemaId('plugin-package.v6.schema.json')),
])
for (
  const forbidden of [
    'rawPath',
    'wildcardGrant',
    'ownerOverride',
    'generationOverride',
    'sessionSearch',
    'permissionWriter',
  ]
) assert.equal(publicBytes.includes(forbidden), false)

console.log('Approval request exact Session route manifest conformance passed')
