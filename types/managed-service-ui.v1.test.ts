import type { Context } from '@deepseek-ai/cordis'
import type {
  ManagedServiceLogoutRequestV1,
  ManagedServiceLogoutResultV1,
  ManagedServiceUIRegistryV1,
} from './managed-service-ui.v1.js'

// The Cordis inject name is stabilized as a string literal type
// ('cordisx.managed-service-ui-registry/v1').

// Renderer acquires an owner-bound handle from the Host-injected Context.
declare const ctx: Context
const reg: ManagedServiceUIRegistryV1 = ctx.managedServices
const got = await reg.get({ serviceId: 'cli-proxy' })
if (got.status === 'available') {
  got.service.binding.identity.serviceId
  got.service.snapshot
  const logout: ManagedServiceLogoutRequestV1 = {
    $schema:
      'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/managed-service-logout-request.v1.schema.json',
    contract: 'cordisx.managed-service-logout-request/v1',
    schemaVersion: 1,
    requestId: 'req-logout-ui-1',
    binding: got.service.binding,
    action: 'logout',
    expectedSequence: 1,
    userGesture: { kind: 'explicit-click', at: new Date().toISOString() },
  }
  const result: ManagedServiceLogoutResultV1 = await got.service.logout(logout)
  void result.status
  // @ts-expect-error renderer cannot supply pluginId via get (serviceId is plugin-local only)
  reg.get({ serviceId: 'x', pluginId: 'other' })
  // @ts-expect-error registry does not expose node-side sources
  reg.sources
  // @ts-expect-error bound binding fields are read-only
  got.service.binding.scope.generation = 'g-forged'
} else {
  got.code
  got.message
  // @ts-expect-error unavailable result has no service
  got.service
}
