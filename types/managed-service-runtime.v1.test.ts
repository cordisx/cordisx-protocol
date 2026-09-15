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
