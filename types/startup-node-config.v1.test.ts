import type { SchemaFormSourceV1 } from './schema-form.v1.js'
import type {
  StartupManagedServiceApplyV1,
  StartupManagedServiceConfigV1,
  StartupManagedServiceNodeModuleV1,
} from './startup-runtime.v1.js'

const Config = {
  type: 'object',
  '~standard': {
    version: 1,
    vendor: 'schemastery',
    validate: (value: unknown) => ({ value }),
  },
  toJSON: () => ({ type: 'object', dict: { account: { type: 'object', dict: { root: { type: 'string' } } } } }),
} satisfies StartupManagedServiceConfigV1
const reused: SchemaFormSourceV1 = Config
const apply: StartupManagedServiceApplyV1 = (_context, input) => {
  void input.configuration?.value.account
}
const module: StartupManagedServiceNodeModuleV1 = {
  Config,
  apply: Object.assign(apply, { inject: ['managedServices'] }),
  prepare: (_context, input) => {
    void input.configuration
  },
}
const legacy: StartupManagedServiceNodeModuleV1 = { apply: () => {}, prepare: () => {} }
// @ts-expect-error bare Standard Schema is not complete Node config evidence
const missingProjection: StartupManagedServiceConfigV1 = { type: 'object', '~standard': Config['~standard'] }
const asyncConfig: StartupManagedServiceConfigV1 = {
  ...Config,
  // @ts-expect-error Node configuration validators must be synchronous
  '~standard': { ...Config['~standard'], validate: async (value: unknown) => ({ value }) },
}
const executableProjection: StartupManagedServiceConfigV1 = {
  ...Config,
  // @ts-expect-error projection must be serializable JSON without executable fields
  toJSON: () => ({ type: 'object', readSecret: () => 'forbidden' }),
}
void [reused, module, legacy, missingProjection, asyncConfig, executableProjection]

const wrappedProjection: StartupManagedServiceConfigV1 = {
  ...Config,
  // @ts-expect-error toJSON returns the raw root tree, not a descriptor wrapper
  toJSON: () => ({ kind: 'schemastery', envelope: Config.toJSON() }),
}
void wrappedProjection
