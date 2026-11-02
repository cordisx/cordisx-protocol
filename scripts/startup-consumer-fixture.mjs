export const startupConsumerFixture =
  `import type { StartupObserverV1, StartupCatalogReportV1 } from '@cordisx/protocol/startup/v1'
import type { StartupManagedServiceNodeModuleV1 } from '@cordisx/protocol/startup-runtime/v1'
import type { PluginRuntimeManifestV15 } from '@cordisx/protocol/plugin-manifest/v15'
import type { PluginRuntimePackageV15 } from '@cordisx/protocol/plugin-package/v15'
declare const startupObserver: StartupObserverV1
declare const startupModule: StartupManagedServiceNodeModuleV1
declare const startupManifest: PluginRuntimeManifestV15
declare const startupPackage: PluginRuntimePackageV15
declare const startupCatalogReport: StartupCatalogReportV1
startupObserver.subscribe(event => {
  if (event.kind === 'snapshot') event.snapshot.cursor.sequence satisfies number
  if (event.kind === 'connection') event.connection.state satisfies 'connected' | 'disconnected' | 'reconnecting'
})
startupModule.prepare satisfies Function
startupManifest.startup.contract satisfies 'cordisx.startup-declaration/v1'
startupPackage.schemaVersion satisfies 15
startupCatalogReport.catalog.state satisfies 'known' | 'pending' | 'failed'
// @ts-expect-error observer does not confer Node catalog reporting authority
startupObserver.reportCatalog(startupCatalogReport)
// @ts-expect-error observer does not expose an execution binding
startupObserver.binding
`
