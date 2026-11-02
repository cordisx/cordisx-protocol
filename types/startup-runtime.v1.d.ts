import type { Inject } from '@deepseek-ai/cordis'
import type { ManagedServiceNodeModuleV1 } from './managed-service-context.v1.js'
import type { ManagedServiceApplyInputV1, ManagedServiceServiceContextV1 } from './managed-service-runtime.v1.js'
import type { StartupReporterV1 } from './startup.v1.js'

export interface StartupManagedServiceApplyInputV1 extends ManagedServiceApplyInputV1 {
  /** Owner and service generation bound by the Host, never accepted from renderer input. */
  readonly startup: StartupReporterV1
}

export type StartupManagedServiceApplyV1 = (
  context: ManagedServiceServiceContextV1,
  input: StartupManagedServiceApplyInputV1,
) => void | Promise<void>

/** Opted-in v15 managed-backend entry; definition and registration wire stay v1. */
export interface StartupManagedServiceNodeModuleV1 extends Omit<ManagedServiceNodeModuleV1, 'apply'> {
  readonly apply: StartupManagedServiceApplyV1 & { readonly inject?: Inject }
}
