import type { ManagedServiceNodeModuleV1 } from './managed-service-context.v1.js'
import type { ManagedServiceApplyInputV1, ManagedServiceRegistrationHandleV1, ManagedServiceServiceContextV1 } from './managed-service-runtime.v1.js'
import type { StartupCapabilityDeclarationV1, StartupReporterV1 } from './startup.v1.js'

export interface StartupManagedServicePrepareInputV1 extends ManagedServiceApplyInputV1 {
  /** Exact admitted declaration selected by the Host, not by the renderer or module. */
  readonly capability: StartupCapabilityDeclarationV1
  readonly generation: { readonly host: string; readonly plugin: string; readonly service: string }
  readonly registration: ManagedServiceRegistrationHandleV1
  /** Owner/service/capability and generation bound for this preparation. */
  readonly startup: StartupReporterV1
}

export type StartupManagedServicePrepareV1 = (
  context: ManagedServiceServiceContextV1,
  input: StartupManagedServicePrepareInputV1,
) => void | Promise<void>

/** V15 opt-in: await base apply/adoption, then schedule each capability's prepare. */
export interface StartupManagedServiceNodeModuleV1 extends ManagedServiceNodeModuleV1 {
  readonly prepare: StartupManagedServicePrepareV1
}
