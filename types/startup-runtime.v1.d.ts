import type { SchemaFormSourceV1, SchemaFormValidationV1 } from './schema-form.v1.js'
import type { ManagedServiceNodeModuleV1 } from './managed-service-context.v1.js'
import type { ManagedServiceApplyInputV1, ManagedServiceRegistrationHandleV1, ManagedServiceSafeValueV1, ManagedServiceServiceContextV1 } from './managed-service-runtime.v1.js'
import type { StartupCapabilityDeclarationV1, StartupReporterV1 } from './startup.v1.js'

/** Exact admitted Node module's synchronous validator plus complete Schemastery projection. */
export interface StartupManagedServiceConfigV1 extends SchemaFormSourceV1 {
  readonly '~standard': Omit<SchemaFormSourceV1['~standard'], 'validate'> & {
    readonly validate: (value: unknown) => SchemaFormValidationV1
  }
  /** Same complete envelope as plugin-config-common/v1 schemaProjection's Schemastery branch. */
  toJSON(): Readonly<Record<string, ManagedServiceSafeValueV1>>
}

/** Host-selected, nonsecret instance configuration; no filesystem or account authority. */
export interface StartupManagedServiceConfigurationV1 {
  readonly contract: 'cordisx.managed-service-instance-configuration/v1'
  readonly value: Readonly<Record<string, ManagedServiceSafeValueV1>>
}

export interface StartupManagedServiceApplyInputV1 extends ManagedServiceApplyInputV1 {
  /** Optional immutable snapshot from the selected profile's owning plugin instance. */
  readonly configuration?: StartupManagedServiceConfigurationV1
}

export type StartupManagedServiceApplyV1 = (
  context: ManagedServiceServiceContextV1,
  input: StartupManagedServiceApplyInputV1,
) => void | Promise<void>

export interface StartupManagedServicePrepareInputV1 extends StartupManagedServiceApplyInputV1 {
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
  /** Optional for defaults; required to prove the schema of a nonempty instance override. */
  readonly Config?: StartupManagedServiceConfigV1
  readonly apply: StartupManagedServiceApplyV1 & Pick<ManagedServiceNodeModuleV1['apply'], 'inject'>
  readonly prepare: StartupManagedServicePrepareV1
}
