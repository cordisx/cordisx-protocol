import type { ManagedServiceWebEntryUIContextV1, ManagedServiceWebEntryReadRequestV1 } from './managed-service-web-entry.v1.js'
import type { ManagedServiceWebEntryNodeModuleV1 } from './managed-service-web-entry-runtime.v1.js'
import type { ManagedServiceNodeModuleV1 } from './managed-service-context.v1.js'
import type { StartupManagedServiceNodeModuleV1 } from './startup-runtime.v1.js'

declare const context: ManagedServiceWebEntryUIContextV1
const got = await context.managedServices.get({ serviceId: 'gateway' })
if (got.status === 'available' && got.service.webEntry?.contract === 'cordisx.managed-service-web-entry/v1') {
  const entry = got.service.webEntry
  const result = await entry.read({ signal: new AbortController().signal })
  result.serviceGeneration satisfies string
  if (result.status === 'available') result.origin satisfies string
  else {
    result.code satisfies string
    // @ts-expect-error unavailable never contains a previous origin
    result.origin
  }
  const request: ManagedServiceWebEntryReadRequestV1 = { contract: 'cordisx.managed-service-web-entry-read/v1', binding: entry.binding, serviceGeneration: entry.serviceGeneration }
  void request
  // @ts-expect-error renderer cannot supply arbitrary URL
  entry.read({ origin: 'http://127.0.0.1:9999' })
  // @ts-expect-error generation is captured, never writable by renderer
  entry.serviceGeneration = 'new'
  // @ts-expect-error no renderer-facing proof value
  result.proof
}
const module: ManagedServiceWebEntryNodeModuleV1 = {
  apply: () => {},
  managedServiceWebEntry: {
    contract: 'cordisx.managed-service-web-entry-source/v1', serviceId: 'gateway', operationId: 'console.info',
    verification: { kind: 'shared-instance-hmac-sha256', path: '/api/proof' },
  },
}
const progressive: StartupManagedServiceNodeModuleV1 & ManagedServiceWebEntryNodeModuleV1 = { ...module, prepare: () => {} }
const legacy: ManagedServiceNodeModuleV1 = module
void [progressive, legacy]
