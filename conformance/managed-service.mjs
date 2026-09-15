import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const schemaNames = [
  'ui-common.v1.schema.json',
  'managed-service-common.v1.schema.json',
  'managed-service-projection.v1.schema.json',
  'managed-service-login-request.v1.schema.json',
  'managed-service-login-result.v1.schema.json',
  'managed-service-logout-request.v1.schema.json',
  'managed-service-logout-result.v1.schema.json',
  'managed-service-subscription.v1.schema.json',
  'managed-service-subscription-page.v1.schema.json',
  'managed-service-subscription-close.v1.schema.json',
  'managed-service-cli-proxy-catalog.v1.schema.json',
  'managed-service-cli-proxy-accounts.v1.schema.json',
  'managed-service-cli-proxy-account-toggle.v1.schema.json',
  'managed-service-cli-proxy-account-toggle-result.v1.schema.json',
  'managed-service-cli-proxy-oauth-start.v1.schema.json',
  'managed-service-cli-proxy-oauth-result.v1.schema.json',
  'managed-service-cli-proxy-oauth-status.v1.schema.json',
  'managed-service-cli-proxy-oauth-cancel.v1.schema.json',
  'managed-service-cli-proxy-oauth-cancel-result.v1.schema.json',
]
const schemas = new Map()
for (const name of schemaNames) {
  schemas.set(name, JSON.parse(await readFile(path.join(root, 'schemas', name), 'utf8')))
}

const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true })
addFormats(ajv)
for (const schema of schemas.values()) ajv.addSchema(schema)

const validator = name => {
  const v = ajv.getSchema(schemas.get(name).$id)
  if (v === undefined) throw new Error(`${name} was not registered`)
  return v
}
const errors = (v, value) => v(value) ? [] : (v.errors ?? []).map(e => `${e.instancePath || '/'} ${e.message}`)

const now = '2026-01-01T00:00:00Z'
const binding = {
  bindingId: 'bnd-ms-1',
  identity: { pluginId: 'plugin-cli-proxy-api', serviceId: 'cli-proxy' },
  scope: { profileId: 'default', generation: 'g-1' },
}

const validProjection = {
  $schema: schemas.get('managed-service-projection.v1.schema.json').$id,
  contract: 'cordisx.managed-service-projection/v1',
  schemaVersion: 1,
  binding,
  sequence: 7,
  observedAt: now,
  identity: binding.identity,
  displayName: 'CLI Proxy API',
  serviceKind: 'cli-proxy',
  readiness: 'ready',
  revision: 3,
  serviceGeneration: 'svc-1',
  auth: {
    state: 'authenticated',
    authenticatedAt: now,
    expiresAt: '2026-01-02T00:00:00Z',
    accountHint: 'alice@example.com',
    providerLabel: 'TraeX',
  },
  health: { level: 'healthy', since: now },
  diagnostics: [],
  capabilities: {
    explicitLogin: true,
    logout: true,
    readCatalog: true,
  },
  userAction: { available: true, reason: 'already-authenticated' },
}

assert.deepEqual(errors(validator('managed-service-projection.v1.schema.json'), validProjection), [])

// Secrets must not be present.
const secretLeak = { ...validProjection, auth: { ...validProjection.auth, token: 'abc' } }
const secretErrs = errors(validator('managed-service-projection.v1.schema.json'), secretLeak)
assert.ok(secretErrs.length > 0, 'projection must reject secret-bearing fields')

// Login request requires an explicit user gesture.
const validLogin = {
  $schema: schemas.get('managed-service-login-request.v1.schema.json').$id,
  contract: 'cordisx.managed-service-login-request/v1',
  schemaVersion: 1,
  requestId: 'req-1',
  binding,
  action: 'login',
  expectedSequence: 7,
  userGesture: { kind: 'explicit-click', at: now },
}
assert.deepEqual(errors(validator('managed-service-login-request.v1.schema.json'), validLogin), [])

const autoLogin = { ...validLogin, userGesture: undefined }
assert.ok(errors(validator('managed-service-login-request.v1.schema.json'), autoLogin).length > 0)

// Login result accepted must include stateAt/sequence; rejected must include error.
const accepted = {
  $schema: schemas.get('managed-service-login-result.v1.schema.json').$id,
  contract: 'cordisx.managed-service-login-result/v1',
  schemaVersion: 1,
  requestId: 'req-1',
  binding,
  status: 'accepted',
  stateAt: 'authenticated',
  sequence: 8,
}
assert.deepEqual(errors(validator('managed-service-login-result.v1.schema.json'), accepted), [])
const denied = {
  $schema: schemas.get('managed-service-login-result.v1.schema.json').$id,
  contract: 'cordisx.managed-service-login-result/v1',
  schemaVersion: 1,
  requestId: 'req-1',
  binding,
  status: 'denied',
  error: { code: 'permission-denied', message: 'user denied login' },
}
assert.deepEqual(errors(validator('managed-service-login-result.v1.schema.json'), denied), [])

// Logout is a distinct, owner-bound, explicit-click action.
const validLogout = {
  $schema: schemas.get('managed-service-logout-request.v1.schema.json').$id,
  contract: 'cordisx.managed-service-logout-request/v1',
  schemaVersion: 1,
  requestId: 'req-logout-1',
  binding,
  action: 'logout',
  expectedSequence: 8,
  userGesture: { kind: 'explicit-click', at: now },
}
assert.deepEqual(errors(validator('managed-service-logout-request.v1.schema.json'), validLogout), [])
assert.ok(
  errors(validator('managed-service-logout-request.v1.schema.json'), { ...validLogout, action: 'login' }).length > 0,
)
assert.ok(
  errors(validator('managed-service-logout-request.v1.schema.json'), { ...validLogout, userGesture: undefined }).length
    > 0,
)
assert.ok(
  errors(validator('managed-service-logout-request.v1.schema.json'), { ...validLogout, binding: undefined }).length > 0,
)
assert.ok(
  errors(validator('managed-service-logout-request.v1.schema.json'), { ...validLogout, expectedSequence: undefined })
    .length > 0,
)

const logoutAccepted = {
  $schema: schemas.get('managed-service-logout-result.v1.schema.json').$id,
  contract: 'cordisx.managed-service-logout-result/v1',
  schemaVersion: 1,
  requestId: 'req-logout-1',
  binding,
  status: 'accepted',
  stateAt: 'logged-out',
  sequence: 9,
}
assert.deepEqual(errors(validator('managed-service-logout-result.v1.schema.json'), logoutAccepted), [])
assert.ok(
  errors(validator('managed-service-logout-result.v1.schema.json'), {
    ...logoutAccepted,
    stateAt: 'authenticated',
  }).length > 0,
)

// Subscription pages must have phase, sequence-ordered updates.
const page = {
  $schema: schemas.get('managed-service-subscription-page.v1.schema.json').$id,
  contract: 'cordisx.managed-service-subscription-page/v1',
  schemaVersion: 1,
  subscription: { subscriptionId: 'sub-1', binding, afterSequence: 0, snapshotSequence: 7 },
  phase: 'live',
  updates: [{ kind: 'state-changed', sequence: 8, delta: { readiness: 'degraded' } }],
  nextAfterSequence: 8,
  hasMore: false,
}
assert.deepEqual(errors(validator('managed-service-subscription-page.v1.schema.json'), page), [])

const close = {
  $schema: schemas.get('managed-service-subscription-close.v1.schema.json').$id,
  contract: 'cordisx.managed-service-subscription-close/v1',
  schemaVersion: 1,
  subscription: { subscriptionId: 'sub-1', binding, afterSequence: 0, snapshotSequence: 7 },
  closedAt: now,
  reason: 'explicit',
}
assert.deepEqual(errors(validator('managed-service-subscription-close.v1.schema.json'), close), [])

// CLIProxyAPI catalog redacts endpoints to origin and exposes secretConfigured only.
const catalog = {
  $schema: schemas.get('managed-service-cli-proxy-catalog.v1.schema.json').$id,
  contract: 'cordisx.managed-service-cli-proxy-catalog/v1',
  schemaVersion: 1,
  binding,
  sequence: 8,
  observedAt: now,
  revision: 3,
  serviceGeneration: 'svc-1',
  providers: [
    {
      id: 'traex',
      displayName: 'TraeX',
      enabled: true,
      endpoint: { origin: 'https://api.trae.ai', secretConfigured: true },
      health: 'healthy',
      auth: 'authenticated',
      models: {
        mappings: [
          {
            sourceModelId: 'doubao-seed-2.1-pro',
            modelId: 'traex-pro',
            displayName: 'TraeX Pro',
            enabled: true,
            isDefault: true,
          },
        ],
      },
    },
  ],
}
assert.deepEqual(errors(validator('managed-service-cli-proxy-catalog.v1.schema.json'), catalog), [])

const catalogLeak = {
  ...catalog,
  providers: [{
    ...catalog.providers[0],
    endpoint: { origin: 'https://api.trae.ai', baseUrl: 'https://x:y@api.trae.ai/v1', secretConfigured: true },
  }],
}
assert.ok(
  errors(validator('managed-service-cli-proxy-catalog.v1.schema.json'), catalogLeak).length > 0,
  'catalog must redact credentials and full URLs',
)

// CLIProxyAPI accounts: safe projection, no paths/secrets/id_token.
const accounts = {
  $schema: schemas.get('managed-service-cli-proxy-accounts.v1.schema.json').$id,
  contract: 'cordisx.managed-service-cli-proxy-accounts/v1',
  schemaVersion: 1,
  binding,
  sequence: 9,
  observedAt: now,
  revision: 4,
  serviceGeneration: 'svc-1',
  accounts: [
    {
      accountId: 'auth-codex-1',
      authIndex: '0',
      provider: 'codex',
      label: 'codex (alice@example.com)',
      status: 'active',
      disabled: false,
      unavailable: false,
      authKind: 'oauth',
      sourceKind: 'file',
      runtimeOnly: false,
      email: 'alice@example.com',
      success: 10,
      failed: 1,
      updatedAt: now,
      models: [{ id: 'gpt-5.2', displayName: 'GPT 5.2' }],
      quotaSignals: { last_429: '2026-01-01T00:00:00Z' },
    },
    {
      accountId: 'auth-anthropic-1',
      authIndex: '1',
      provider: 'anthropic',
      label: 'anthropic api key',
      status: 'disabled',
      statusMessage: 'disabled by user',
      disabled: true,
      unavailable: false,
      authKind: 'api-key',
      sourceKind: 'file',
      runtimeOnly: false,
      note: 'work',
      priority: 10,
    },
  ],
}
assert.deepEqual(errors(validator('managed-service-cli-proxy-accounts.v1.schema.json'), accounts), [])

const accountsPathLeak = {
  ...accounts,
  accounts: [{ ...accounts.accounts[0], path: '/workspace/private-auth.json' }],
}
assert.ok(
  errors(validator('managed-service-cli-proxy-accounts.v1.schema.json'), accountsPathLeak).length > 0,
  'accounts must not expose filesystem paths',
)
const accountsSecretLeak = {
  ...accounts,
  accounts: [{ ...accounts.accounts[0], api_key: 'sk-abc' }],
}
assert.ok(
  errors(validator('managed-service-cli-proxy-accounts.v1.schema.json'), accountsSecretLeak).length > 0,
  'accounts must not expose api keys',
)
const accountsTokenLeak = {
  ...accounts,
  accounts: [{ ...accounts.accounts[0], id_token: 'eyJ...' }],
}
assert.ok(
  errors(validator('managed-service-cli-proxy-accounts.v1.schema.json'), accountsTokenLeak).length > 0,
  'accounts must not expose id_token claims',
)
const accountsPluginProvider = {
  ...accounts,
  accounts: [{ ...accounts.accounts[0], provider: 'plugin:aiden' }],
}
assert.deepEqual(
  errors(validator('managed-service-cli-proxy-accounts.v1.schema.json'), accountsPluginProvider),
  [],
  'plugin-scoped provider IDs are allowed',
)

// Toggle request requires gesture and revision fence.
const toggle = {
  $schema: schemas.get('managed-service-cli-proxy-account-toggle.v1.schema.json').$id,
  contract: 'cordisx.managed-service-cli-proxy-account-toggle/v1',
  schemaVersion: 1,
  requestId: 'req-toggle-1',
  binding,
  accountId: 'auth-codex-1',
  disabled: true,
  expectedRevision: 4,
  userGesture: { kind: 'explicit-click', at: now },
}
assert.deepEqual(errors(validator('managed-service-cli-proxy-account-toggle.v1.schema.json'), toggle), [])
const toggleNoRev = { ...toggle, expectedRevision: undefined }
assert.ok(errors(validator('managed-service-cli-proxy-account-toggle.v1.schema.json'), toggleNoRev).length > 0)
const toggleNoGesture = { ...toggle, userGesture: undefined }
assert.ok(errors(validator('managed-service-cli-proxy-account-toggle.v1.schema.json'), toggleNoGesture).length > 0)

const toggleAccepted = {
  $schema: schemas.get('managed-service-cli-proxy-account-toggle-result.v1.schema.json').$id,
  contract: 'cordisx.managed-service-cli-proxy-account-toggle-result/v1',
  schemaVersion: 1,
  requestId: 'req-toggle-1',
  binding,
  status: 'accepted',
  accountId: 'auth-codex-1',
  disabled: true,
  sequence: 10,
}
assert.deepEqual(
  errors(validator('managed-service-cli-proxy-account-toggle-result.v1.schema.json'), toggleAccepted),
  [],
)

// OAuth start/result/status/cancel envelopes.
const oauthStart = {
  $schema: schemas.get('managed-service-cli-proxy-oauth-start.v1.schema.json').$id,
  contract: 'cordisx.managed-service-cli-proxy-oauth-start/v1',
  schemaVersion: 1,
  requestId: 'req-oauth-1',
  binding,
  provider: 'codex',
  expectedRevision: 4,
  userGesture: { kind: 'explicit-click', at: now },
}
assert.deepEqual(errors(validator('managed-service-cli-proxy-oauth-start.v1.schema.json'), oauthStart), [])

const oauthResult = {
  $schema: schemas.get('managed-service-cli-proxy-oauth-result.v1.schema.json').$id,
  contract: 'cordisx.managed-service-cli-proxy-oauth-result/v1',
  schemaVersion: 1,
  requestId: 'req-oauth-1',
  binding,
  status: 'accepted',
  sessionId: 'sess-abc',
  authorizationUrl: 'https://example.com/oauth/authorize?state=xyz',
  sequence: 10,
}
assert.deepEqual(errors(validator('managed-service-cli-proxy-oauth-result.v1.schema.json'), oauthResult), [])

const oauthStatus = {
  $schema: schemas.get('managed-service-cli-proxy-oauth-status.v1.schema.json').$id,
  contract: 'cordisx.managed-service-cli-proxy-oauth-status/v1',
  schemaVersion: 1,
  binding,
  sessionId: 'sess-abc',
  state: 'pending',
}
assert.deepEqual(errors(validator('managed-service-cli-proxy-oauth-status.v1.schema.json'), oauthStatus), [])

const oauthCancel = {
  $schema: schemas.get('managed-service-cli-proxy-oauth-cancel.v1.schema.json').$id,
  contract: 'cordisx.managed-service-cli-proxy-oauth-cancel/v1',
  schemaVersion: 1,
  requestId: 'req-cancel-1',
  binding,
  sessionId: 'sess-abc',
  expectedRevision: 4,
  userGesture: { kind: 'explicit-click', at: now },
}
assert.deepEqual(errors(validator('managed-service-cli-proxy-oauth-cancel.v1.schema.json'), oauthCancel), [])

const oauthCancelResult = {
  $schema: schemas.get('managed-service-cli-proxy-oauth-cancel-result.v1.schema.json').$id,
  contract: 'cordisx.managed-service-cli-proxy-oauth-cancel-result/v1',
  schemaVersion: 1,
  requestId: 'req-cancel-1',
  binding,
  status: 'accepted',
  sessionId: 'sess-abc',
  cancelled: true,
  sequence: 10,
}
assert.deepEqual(
  errors(validator('managed-service-cli-proxy-oauth-cancel-result.v1.schema.json'), oauthCancelResult),
  [],
)

// Identity/generation fences are mandatory.
const unbound = { ...validProjection, binding: undefined }
assert.ok(errors(validator('managed-service-projection.v1.schema.json'), unbound).length > 0)
const noGen = { ...validProjection, binding: { ...binding, scope: { ...binding.scope, generation: undefined } } }
assert.ok(errors(validator('managed-service-projection.v1.schema.json'), noGen).length > 0)

// Host must never open a toggle mutation that omits the revision fence.
const toggleRevZero = { ...toggle, expectedRevision: -1 }
assert.ok(errors(validator('managed-service-cli-proxy-account-toggle.v1.schema.json'), toggleRevZero).length > 0)

// --- managed-service-definition operation enhancements ---
const defSchemaName = 'managed-service-definition.v1.schema.json'
schemas.set(defSchemaName, JSON.parse(await readFile(path.join(root, 'schemas', defSchemaName), 'utf8')))
ajv.addSchema(schemas.get(defSchemaName))

const baseDefinition = {
  $schema: schemas.get(defSchemaName).$id,
  contract: 'cordisx.managed-service-definition/v1',
  schemaVersion: 1,
  serviceId: 'test-svc',
  launch: {
    executable: { kind: 'package-relative', path: './bin/server.js' },
    arguments: [],
    startupTimeoutMs: 10000,
  },
  protectedBindings: [],
  authentication: { mode: 'none' },
  httpAuthentication: { mode: 'none' },
  discovery: { kind: 'host-assigned-loopback' },
  operations: [
    {
      operationId: 'health-check',
      method: 'GET',
      path: '/health',
      responseSchema: 'https://example.com/schemas/health.json',
      timeoutMs: 5000,
    },
  ],
  health: {
    path: '/health',
    intervalMs: 10000,
    timeoutMs: 5000,
  },
}
assert.deepEqual(errors(validator(defSchemaName), baseDefinition), [], 'base definition must be valid')

// CLI authentication may declare an optional logout action. Exit success maps
// to authentication-required at the backend runtime and logged-out in the UI.
{
  const d = JSON.parse(JSON.stringify(baseDefinition))
  const action = {
    executable: { kind: 'named-command', command: 'aiden' },
    arguments: ['logout'],
    timeoutMs: 30000,
    outcomes: [
      { exitCode: 0, state: 'authentication-required' },
      { exitCode: 1, state: 'failed' },
    ],
  }
  d.authentication = {
    mode: 'cli',
    status: { ...action, arguments: ['auth', 'status'] },
    login: { ...action, arguments: ['login'] },
    logout: action,
  }
  assert.deepEqual(errors(validator(defSchemaName), d), [], 'CLI logout action must validate')
}

// PUT, PATCH, DELETE all validate as mutation operations.
{
  const d = JSON.parse(JSON.stringify(baseDefinition))
  d.operations.push({
    operationId: 'update-config',
    method: 'PUT',
    path: '/config',
    requestSchema: 'https://example.com/schemas/config.json',
    responseSchema: 'https://example.com/schemas/config.json',
    timeoutMs: 5000,
  })
  d.operations.push({
    operationId: 'patch-config',
    method: 'PATCH',
    path: '/config',
    requestSchema: 'https://example.com/schemas/config-patch.json',
    responseSchema: 'https://example.com/schemas/config.json',
    timeoutMs: 5000,
  })
  d.operations.push({
    operationId: 'delete-item',
    method: 'DELETE',
    path: '/items/:id',
    requestSchema: 'https://example.com/schemas/empty.json',
    responseSchema: 'https://example.com/schemas/empty.json',
    timeoutMs: 5000,
  })
  assert.deepEqual(errors(validator(defSchemaName), d), [], 'PUT/PATCH/DELETE must validate')
}

// requestEncoding: 'query' and 'json-body' both validate.
{
  const d = JSON.parse(JSON.stringify(baseDefinition))
  d.operations.push({
    operationId: 'create-json',
    method: 'POST',
    path: '/items',
    requestSchema: 'https://example.com/schemas/item.json',
    responseSchema: 'https://example.com/schemas/item.json',
    timeoutMs: 5000,
    requestEncoding: 'json-body',
  })
  d.operations.push({
    operationId: 'create-query',
    method: 'POST',
    path: '/items',
    requestSchema: 'https://example.com/schemas/item.json',
    responseSchema: 'https://example.com/schemas/item.json',
    timeoutMs: 5000,
    requestEncoding: 'query',
  })
  assert.deepEqual(errors(validator(defSchemaName), d), [], 'requestEncoding json-body and query must validate')
}

// Operation-level httpAuthentication: both 'none' and 'authorization-header' work.
{
  const d = JSON.parse(JSON.stringify(baseDefinition))
  d.operations.push({
    operationId: 'secure-action',
    method: 'POST',
    path: '/secure',
    requestSchema: 'https://example.com/schemas/req.json',
    responseSchema: 'https://example.com/schemas/res.json',
    timeoutMs: 5000,
    httpAuthentication: { mode: 'authorization-header', scheme: 'Bearer', slot: 'auth-slot-1' },
  })
  d.operations.push({
    operationId: 'no-auth-action',
    method: 'POST',
    path: '/open',
    requestSchema: 'https://example.com/schemas/req.json',
    responseSchema: 'https://example.com/schemas/res.json',
    timeoutMs: 5000,
    httpAuthentication: { mode: 'none' },
  })
  assert.deepEqual(errors(validator(defSchemaName), d), [], 'operation httpAuthentication must validate')
}

// Mutation without requestSchema must fail.
{
  const d = JSON.parse(JSON.stringify(baseDefinition))
  d.operations.push({
    operationId: 'bad-mutation',
    method: 'PUT',
    path: '/bad',
    responseSchema: 'https://example.com/schemas/res.json',
    timeoutMs: 5000,
  })
  assert.ok(errors(validator(defSchemaName), d).length > 0, 'PUT without requestSchema must fail')
}

// Invalid requestEncoding value must fail.
{
  const d = JSON.parse(JSON.stringify(baseDefinition))
  d.operations.push({
    operationId: 'bad-enc',
    method: 'POST',
    path: '/bad',
    requestSchema: 'https://example.com/schemas/req.json',
    responseSchema: 'https://example.com/schemas/res.json',
    timeoutMs: 5000,
    requestEncoding: 'form-data',
  })
  assert.ok(errors(validator(defSchemaName), d).length > 0, 'invalid requestEncoding must fail')
}

// Invalid httpAuthentication mode must fail.
{
  const d = JSON.parse(JSON.stringify(baseDefinition))
  d.operations.push({
    operationId: 'bad-auth',
    method: 'POST',
    path: '/bad',
    requestSchema: 'https://example.com/schemas/req.json',
    responseSchema: 'https://example.com/schemas/res.json',
    timeoutMs: 5000,
    httpAuthentication: { mode: 'basic' },
  })
  assert.ok(errors(validator(defSchemaName), d).length > 0, 'invalid httpAuthentication mode must fail')
}

// authorization-header httpAuthentication without scheme or slot must fail.
{
  const d = JSON.parse(JSON.stringify(baseDefinition))
  d.operations.push({
    operationId: 'bad-auth-2',
    method: 'POST',
    path: '/bad',
    requestSchema: 'https://example.com/schemas/req.json',
    responseSchema: 'https://example.com/schemas/res.json',
    timeoutMs: 5000,
    httpAuthentication: { mode: 'authorization-header' },
  })
  assert.ok(errors(validator(defSchemaName), d).length > 0, 'authorization-header without scheme+slot must fail')
}

console.log('managed-service conformance OK')
