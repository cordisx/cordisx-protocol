/**
 * Host compatibility fixture.
 *
 * This file imports every symbol that the current CordisX Host
 * (enterprise-source-assembly/packages/cli/src/launcher/managed-service-*.ts)
 * consumes from `@cordisx/protocol/managed-service/v1` and exercises the
 * property accesses and structural shapes Host code relies on. If this file
 * type-checks, Host code compiles against the successor Protocol.
 */
import type { Context } from '@deepseek-ai/cordis'
import type { PluginManifestManagedBackendServiceV14 } from './plugin-manifest.v14.js'
import type {
  ManagedNativeProviderCatalogV1,
  ManagedNativeProviderPublicationDiagnosticV1,
  ManagedNativeProviderPublicationInputV1,
  ManagedNativeProviderPublicationProjectionV1,
  ManagedNativeProviderPublicationResultV1,
  ManagedServiceAcquireResultV1,
  ManagedServiceApplyInputV1,
  ManagedServiceBoundClientV1,
  ManagedServiceControlResultV1,
  ManagedServiceDefinitionV1,
  ManagedServiceDiagnosticV1,
  ManagedServiceIdentityV1,
  ManagedServiceInvokeResultV1,
  ManagedServiceLeaseV1,
  ManagedServiceMaterializationRequestV1,
  ManagedServiceMaterializationResultV1,
  ManagedServiceOwnerV1,
  ManagedServiceProjectionV1,
  ManagedServiceRegistrationHandleV1,
  ManagedServiceRegistryV1,
  ManagedServiceRuntimeBindingV1,
  ManagedServiceSafeValueV1,
  ManagedServiceServiceContextV1,
} from './managed-service.v1.js'

// Identity.source/pluginId/serviceId (Host-managed key uses source).
const identity: ManagedServiceIdentityV1 = {
  source: 'https://plugins.cordisx.local/example',
  pluginId: 'plugin-cli-proxy-api',
  serviceId: 'cli-proxy',
}
void identity.source
void identity.pluginId
void identity.serviceId

// Host-internal runtime binding (registrationHandle/serviceHandle/hostGeneration/serviceGeneration).
const binding: ManagedServiceRuntimeBindingV1 = {
  registrationHandle: 'msr_abc',
  serviceHandle: 'mss_def',
  identity,
  hostGeneration: 'hg1',
  serviceGeneration: 'sg1',
}
void binding.registrationHandle
void binding.serviceHandle
void binding.hostGeneration
void binding.serviceGeneration

// Diagnostic message is optional (runtime-support constructs code-only diagnostics).
const diag: ManagedServiceDiagnosticV1 = { code: 'authentication-failed', retryable: false }
void diag.code
void diag.retryable

// ControlResultV1 uses status: ready/accepted/rejected/failed/unavailable/cancelled/stale/disposed with diagnostic.
const readyResult: ManagedServiceControlResultV1 = { status: 'ready', sequence: 1, value: null }
void readyResult.status
const rejectedResult: ManagedServiceControlResultV1 = { status: 'rejected', diagnostic: diag }
void rejectedResult.diagnostic.code

// Owner matches PlatformProviderOwner shape.
const owner: ManagedServiceOwnerV1 = {
  ownerHandle: 'mso_abc',
  pluginId: 'plugin-cli-proxy-api',
  serviceId: 'cli-proxy',
  sourceDigest: 'sha256:0000000000000000000000000000000000000000000000000000000000000000',
  hostGeneration: 'hg1',
  pluginGeneration: 'pg1',
}
void owner.ownerHandle
void owner.sourceDigest

// Definition includes authentication/httpAuthentication/launch/discovery/operations/protectedBindings.
const def: ManagedServiceDefinitionV1 = {
  serviceId: 'cli-proxy',
  kind: 'managed-backend',
  displayName: 'CLI Proxy API',
  serviceKind: 'cli-proxy',
  authentication: { mode: 'none' },
  httpAuthentication: { mode: 'authorization-header', slot: 'secret', scheme: 'Bearer' },
  configuration: { schema: 'http://example/schema' },
  launch: {
    command: 'node',
    arguments: [{ kind: 'host-assigned-loopback', slot: 'port' }],
  },
  discovery: { kind: 'host-assigned-loopback' },
  protectedBindings: [],
  operations: [],
}
void def.launch.arguments[0]?.kind
void def.discovery.kind
void def.httpAuthentication.slot

// Registry.register returns a Promise<RegistrationHandle>.
declare const registry: ManagedServiceRegistryV1
const handle: Promise<ManagedServiceRegistrationHandleV1> = registry.register(def, {
  revision: 'sha256:0000000000000000000000000000000000000000000000000000000000000000',
})
void handle

// Bound client exposes acquire/invoke/materialize/release/dispose.
declare const client: ManagedServiceBoundClientV1
const acquire: Promise<ManagedServiceAcquireResultV1> = client.acquire(identity)
void acquire
declare const lease: ManagedServiceLeaseV1
void lease.leaseHandle
void lease.binding.registrationHandle
void lease.brokerHandle
void lease.operations
const invoke: Promise<ManagedServiceInvokeResultV1> = client.invoke(lease, 'op', null)
void invoke
declare const matReq: ManagedServiceMaterializationRequestV1
const mat: Promise<ManagedServiceMaterializationResultV1> = client.materialize(matReq)
void mat
client.release(lease)
client.dispose()

// Materialization request has target:ManagedServiceRuntimeBindingV1 + sources + bindings.
matReq.target.registrationHandle
matReq.sources[0]?.lease.binding.registrationHandle

// Invoke result has invocationHandle/operationId/value.
const ir: ManagedServiceInvokeResultV1 = {
  status: 'accepted',
  invocationHandle: 'msi_x',
  operationId: 'op',
  value: null,
}
void ir.invocationHandle
void ir.value

// ServiceContext is a Context with owner/client/signal.
declare const svcCtx: ManagedServiceServiceContextV1
const c: Context = svcCtx
void c
void svcCtx.owner.pluginId
void svcCtx.signal.aborted

// Projection state/health/processOwnership/configuration/authentication/httpAuthorization/diagnostic/connection.
const proj: ManagedServiceProjectionV1 = {
  $schema:
    'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/managed-service-projection.v1.schema.json',
  contract: 'cordisx.managed-service-projection/v1',
  schemaVersion: 1,
  binding,
  state: 'ready',
  health: 'healthy',
  processOwnership: 'host-owned',
  configuration: { state: 'not-required' },
  authentication: { state: 'not-required' },
  httpAuthorization: { state: 'not-required' },
}
void proj.state
void proj.health
void proj.processOwnership
// Old projection supports diagnostic/connection.
void proj.diagnostic?.code
void proj.connection?.brokerHandle

// Projection states enumerated used by Host runtime.
const states: ManagedServiceProjectionV1['state'][] = ['registered', 'starting', 'ready', 'failed', 'stopped']
void states
const healths: ManagedServiceProjectionV1['health'][] = [
  'stopped',
  'starting',
  'ready',
  'degraded',
  'healthy',
  'critical',
]
void healths

// Native provider publication shapes.
const catalog: ManagedNativeProviderCatalogV1 = {
  generation: 'g1',
  digest: 'sha256:0000000000000000000000000000000000000000000000000000000000000000',
  defaultAlias: 'default',
  routes: [{ alias: 'default', gatewayModelId: 'gpt-4' }],
}
void catalog
const pubInput: ManagedNativeProviderPublicationInputV1 = {
  providerId: 'aiden',
  compositionOrigin: 'default',
  catalog,
}
void pubInput
const pubDiag: ManagedNativeProviderPublicationDiagnosticV1 = { code: 'cancelled', retryable: true }
void pubDiag
declare const pubProj: ManagedNativeProviderPublicationProjectionV1
void pubProj.providerId
void pubProj.owner.hostGeneration
void pubProj.state
const pubResult: ManagedNativeProviderPublicationResultV1 = {
  status: 'accepted',
  publication: { publication: pubProj, dispose: async () => ({ status: 'disposed', projection: pubProj }) },
}
void pubResult

// ManagedServiceSafeValueV1 permits primitives/arrays/objects.
const sv: ManagedServiceSafeValueV1 = { a: 1, b: 'x', c: [true, null] }
void sv

// Backend service declaration from manifest v14.
const decl: PluginManifestManagedBackendServiceV14 = {
  id: 'cli-proxy',
  kind: 'managed-backend',
  owner: 'host',
  entry: './dist/cli-proxy.mjs',
  definitionSchema:
    'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/managed-service-definition.v1.schema.json',
  runtimeResources: [],
  consumerGrants: [],
}
void decl.kind
void decl.definitionSchema
