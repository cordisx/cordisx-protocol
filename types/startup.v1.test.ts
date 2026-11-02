import './startup-instance-configuration.v1.test.js'
import type {
  StartupCatalogReportV1,
  StartupDeclarationV1,
  StartupObserverV1,
  StartupReporterV1,
} from './startup.v1.js'
import type { StartupManagedServiceNodeModuleV1 } from './startup-runtime.v1.js'
import type { PluginRuntimeManifestV15 } from './plugin-manifest.v15.js'
import type { PluginRuntimePackageV15 } from './plugin-package.v15.js'

const startup = {
  contract: 'cordisx.startup-declaration/v1',
  capabilities: [{
    id: 'primary',
    serviceId: 'backend',
    kind: 'provider',
    providerId: 'example',
    compositionOrigin: 'api',
    dependsOn: [],
    wait: { interactive: 'background', command: 'when-selected' },
    milestones: ['validated'],
    success: {
      allOf: [{ kind: 'service-ready' }, { kind: 'catalog-known' }, { kind: 'provider-published' }, {
        kind: 'milestone',
        milestoneId: 'validated',
      }],
    },
  }],
  pages: [{
    pageId: 'status',
    observes: [{ pluginId: 'example', capabilityId: 'primary' }],
    actions: [{ actionId: 'login', requires: [] }],
  }],
} satisfies StartupDeclarationV1
const manifest = {
  $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/plugin-manifest.v15.schema.json',
  schemaVersion: 15,
  id: 'example',
  capabilities: [],
  services: [],
  startup,
} satisfies PluginRuntimeManifestV15
void manifest

declare const packageManifest: PluginRuntimePackageV15
packageManifest.runtimeManifest.schema satisfies string

declare const observer: StartupObserverV1
const snapshot = await observer.read()
const subscription = await observer.subscribe(event => {
  if (event.kind === 'snapshot') {
    event.snapshot.entries.forEach(entry => {
      if (entry.catalog.state === 'known') entry.catalog.modelIds satisfies readonly string[]
      if (!entry.actions.execute.available) entry.actions.execute.reason satisfies string
      // @ts-expect-error observation exposes no execution handle
      entry.binding.acquire()
      // @ts-expect-error observation exposes no local port
      entry.port
    })
  }
}, { after: snapshot.cursor })
subscription.close()
// @ts-expect-error observer has no lifecycle control
observer.prepare()
// @ts-expect-error no renderer milestone authority
observer.report({ ready: true })
// @ts-expect-error caller cannot select observation scope
observer.read({ scopeId: 'other-owner' })

declare const reporter: StartupReporterV1
const report = {
  contract: 'cordisx.startup-catalog-report/v1',
  target: { pluginId: 'example', capabilityId: 'primary' },
  generation: { host: 'host-1', plugin: 'plugin-1', service: 'service-1' },
  sequence: 1,
  catalog: { state: 'known', generation: 'catalog-1', modelIds: [], digest: 'sha256:0123' },
} satisfies StartupCatalogReportV1
await reporter.reportCatalog(report)
// @ts-expect-error generic milestone reports cannot set catalog state
reporter.report({ ...report, catalog: report.catalog })
const module: StartupManagedServiceNodeModuleV1 = {
  apply: async (context, input) => {
    void context.managedServices
    void input.owner
    // @ts-expect-error base apply still has no prepare reporter
    input.startup
  },
  prepare: async (_context, input) => {
    input.capability.success.allOf satisfies readonly unknown[]
    await input.registration.ensureReady({ signal: input.signal })
    await input.startup.reportCatalog({
      ...report,
      target: { pluginId: input.owner.pluginId, capabilityId: input.capability.id },
      generation: input.generation,
    })
  },
}
void module
