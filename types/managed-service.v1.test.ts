import type {
  ManagedServiceCliProxyAccountsV1,
  ManagedServiceCliProxyAccountToggleRequestV1,
  ManagedServiceCliProxyCatalogV1,
  ManagedServiceCliProxyOAuthCancelRequestV1,
  ManagedServiceCliProxyOAuthStartRequestV1,
  ManagedServiceLoginRequestV1,
  ManagedServiceLogoutRequestV1,
  ManagedServiceProjectionV1,
  ManagedServiceSourceV1,
  ManagedServiceV1,
} from './managed-service.v1.js'

declare const service: ManagedServiceV1

// Snapshot returns a renderer-safe projection without credentials or endpoints.
const snapshot = await service.snapshot()
if (snapshot.status === 'available') {
  const projection: ManagedServiceProjectionV1 = snapshot.projection
  void projection.auth.state
  void projection.health.level
  void projection.userAction.available
  void projection.capabilities.explicitLogin
  // @ts-expect-error credentials are not exposed
  projection.auth.token
  // @ts-expect-error full endpoints are not exposed
  projection.endpoint
  // Service's own auth projection does not carry account-subscription fields.
  // @ts-expect-error account subscriptions live on accountControl, not projection.auth
  projection.auth.accounts
} else {
  // @ts-expect-error unavailable snapshot has no projection
  snapshot.projection
}

// Subscribing returns an AsyncIterable of pages with explicit disposal.
const sub = await service.subscribe(0)
if (sub.status === 'subscribed') {
  for await (const page of sub.subscription.pages) {
    page.updates[0]?.kind
    void page.phase
    if (!page.hasMore) break
  }
  const closed = await sub.subscription.unsubscribe()
  closed.reason
} else {
  // @ts-expect-error unavailable result has no subscription
  sub.subscription
}

// authenticate requires an explicit user action; renderer cannot request without a gesture.
const gestureAt = new Date().toISOString()
const login: ManagedServiceLoginRequestV1 = {
  $schema:
    'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/managed-service-login-request.v1.schema.json',
  contract: 'cordisx.managed-service-login-request/v1',
  schemaVersion: 1,
  requestId: 'req-1',
  binding: service.binding,
  action: 'login',
  expectedSequence: 0,
  userGesture: { kind: 'explicit-click', at: gestureAt },
}
void login
const loginResult = await service.authenticate(login)
if (loginResult.status === 'accepted') {
  loginResult.stateAt
  loginResult.sequence
} else {
  loginResult.error.code
  // @ts-expect-error failure results never return stateAt
  loginResult.stateAt
}

// @ts-expect-error action must be 'login' (no silent refresh)
const badAction: ManagedServiceLoginRequestV1 = { ...login, action: 'refresh' }
void badAction

// logout is a distinct owner-bound action with the same explicit-click fence.
const logout: ManagedServiceLogoutRequestV1 = {
  $schema:
    'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/managed-service-logout-request.v1.schema.json',
  contract: 'cordisx.managed-service-logout-request/v1',
  schemaVersion: 1,
  requestId: 'req-logout-1',
  binding: service.binding,
  action: 'logout',
  expectedSequence: 8,
  userGesture: { kind: 'explicit-click', at: gestureAt },
}
const logoutResult = await service.logout(logout)
declare const source: ManagedServiceSourceV1
void source.logout(logout)
if (logoutResult.status === 'accepted') {
  const stateAt: 'logged-out' = logoutResult.stateAt
  void stateAt
  logoutResult.sequence
} else {
  logoutResult.error.code
  // @ts-expect-error failure results never return stateAt
  logoutResult.stateAt
}

// @ts-expect-error logout cannot be disguised as login or refresh
const badLogoutAction: ManagedServiceLogoutRequestV1 = { ...logout, action: 'login' }
void badLogoutAction

// CLIProxyAPI catalog is renderer-safe and origin-only.
declare const catalog: ManagedServiceCliProxyCatalogV1
catalog.providers[0]?.endpoint.origin
catalog.providers[0]?.endpoint.secretConfigured
// @ts-expect-error full baseUrl stays Host-private
catalog.providers[0]?.endpoint.baseUrl
// @ts-expect-error secrets stay Host-private
catalog.providers[0]?.endpoint.secretRef

// CLIProxyAPI accounts are renderer-safe: no paths, secrets, or raw tokens.
declare const accounts: ManagedServiceCliProxyAccountsV1
accounts.accounts[0]?.accountId
accounts.accounts[0]?.provider
accounts.accounts[0]?.email
accounts.accounts[0]?.models?.[0]?.id
// @ts-expect-error auth file path stays Host-private
accounts.accounts[0]?.path
// @ts-expect-error api keys stay Host-private
accounts.accounts[0]?.apiKey
// @ts-expect-error raw id_token stays Host-private
accounts.accounts[0]?.id_token

// CLIProxyAPI account control (optional) is keyed separately from service.auth.
if (service.accountControl) {
  const ctrl = service.accountControl
  const toggle: ManagedServiceCliProxyAccountToggleRequestV1 = {
    $schema:
      'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/managed-service-cli-proxy-account-toggle.v1.schema.json',
    contract: 'cordisx.managed-service-cli-proxy-account-toggle/v1',
    schemaVersion: 1,
    requestId: 'req-toggle-1',
    binding: service.binding,
    accountId: 'auth-codex-1',
    disabled: true,
    expectedRevision: 3,
    userGesture: { kind: 'explicit-click', at: gestureAt },
  }
  void ctrl.toggleAccount(toggle)
  const oauthStart: ManagedServiceCliProxyOAuthStartRequestV1 = {
    $schema:
      'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/managed-service-cli-proxy-oauth-start.v1.schema.json',
    contract: 'cordisx.managed-service-cli-proxy-oauth-start/v1',
    schemaVersion: 1,
    requestId: 'req-oauth-1',
    binding: service.binding,
    provider: 'codex',
    expectedRevision: 3,
    userGesture: { kind: 'explicit-click', at: gestureAt },
  }
  void ctrl.startOAuth(oauthStart)
  void ctrl.pollOAuth('sess-1')
  const cancel: ManagedServiceCliProxyOAuthCancelRequestV1 = {
    $schema:
      'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/managed-service-cli-proxy-oauth-cancel.v1.schema.json',
    contract: 'cordisx.managed-service-cli-proxy-oauth-cancel/v1',
    schemaVersion: 1,
    requestId: 'req-cancel-1',
    binding: service.binding,
    sessionId: 'sess-1',
    expectedRevision: 3,
    userGesture: { kind: 'explicit-click', at: gestureAt },
  }
  void ctrl.cancelOAuth(cancel)
  // @ts-expect-error toggle requires expectedRevision fence
  void ctrl.toggleAccount({ ...toggle, expectedRevision: undefined })
}

// @ts-expect-error renderer cannot assign to identity (read-only)
service.binding.identity.pluginId = 'other'

// Binding identity and generation fence are mandatory.
service.binding.identity.pluginId
service.binding.scope.generation
