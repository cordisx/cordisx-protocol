import type {
  ManagedServiceAuthenticationActionV1,
  ManagedServiceDefinitionV1,
  ManagedServiceRegistrationHandleV1,
} from './managed-service-runtime.v1.js'

const logoutAction: ManagedServiceAuthenticationActionV1 = {
  executable: { kind: 'named-command', command: 'aiden' },
  arguments: ['logout'],
  timeoutMs: 30_000,
  outcomes: [
    { exitCode: 0, state: 'authentication-required' },
    { exitCode: 1, state: 'failed' },
  ],
}

declare const definition: ManagedServiceDefinitionV1
if (definition.authentication.mode === 'cli') {
  const logout: ManagedServiceAuthenticationActionV1 | undefined = definition.authentication.logout
  void logout
}

declare const registration: ManagedServiceRegistrationHandleV1
void registration.authenticate('logout')

// @ts-expect-error runtime authentication controls do not accept arbitrary actions
void registration.authenticate('sign-out')

void logoutAction

const reasoningRoute: import('./managed-service-runtime.v1.js').ManagedNativeProviderRouteV1 = {
  alias: 'model',
  gatewayModelId: 'model-id',
  reasoningCapabilities: { efforts: ['low', 'high'], defaultEffort: 'high' },
  contextWindow: 65_536,
}
void reasoningRoute
if (registration.nativeProviderCapabilities?.contextWindow === true) {
  registration.nativeProviderCapabilities.contextWindow satisfies true
}
if (registration.nativeProviderCapabilities?.credentialScopeLease === true) {
  registration.nativeProviderCapabilities.credentialScopeLease satisfies true
  void registration.publishNativeProvider({
    providerId: 'example',
    compositionOrigin: 'api',
    catalog: { generation: 'one', digest: `sha256:${'0'.repeat(64)}`, defaultAlias: 'model', routes: [reasoningRoute] },
    credentialScope: { revision: `scope_${'a'.repeat(43)}`, requestBinding: 'path-v1' },
  })
}
// @ts-expect-error undeclared reasoning levels are not a capability
const unknownEffort: import('./managed-service-runtime.v1.js').ModelReasoningEffortV1 = 'extreme'
void unknownEffort
