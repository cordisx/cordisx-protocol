import './startup-node-config.v1.test.js'
import type { ManagedServiceApplyInputV1, ManagedServiceApplyV1 } from './managed-service-runtime.v1.js'
import type {
  StartupManagedServiceApplyInputV1,
  StartupManagedServiceConfigurationV1,
  StartupManagedServiceNodeModuleV1,
  StartupManagedServicePrepareInputV1,
} from './startup-runtime.v1.js'

const configuration = {
  contract: 'cordisx.managed-service-instance-configuration/v1',
  value: { root: './account-data', site: 'example', layout: 'existing', storage: { mode: 'service-home' } },
} satisfies StartupManagedServiceConfigurationV1

declare const legacyInput: ManagedServiceApplyInputV1
const noOverride: StartupManagedServiceApplyInputV1 = legacyInput
const configured: StartupManagedServiceApplyInputV1 = { ...legacyInput, configuration }
declare const legacyApply: ManagedServiceApplyV1
const module: StartupManagedServiceNodeModuleV1 = {
  apply: Object.assign(legacyApply, { inject: ['managedServices'] }),
  prepare: (_context, input) => {
    const root = input.configuration?.value.root
    if (typeof root === 'string') root satisfies string
    const storage = input.configuration?.value.storage
    if (storage && typeof storage === 'object' && !Array.isArray(storage) && 'mode' in storage) {
      // @ts-expect-error nested JSON object is also readonly
      storage.mode = 'global'
    }
    const modes = input.configuration?.value.modes
    if (modes && typeof modes === 'object' && 'length' in modes) {
      // @ts-expect-error nested JSON arrays cannot be appended to
      modes.push('global')
    }
    // @ts-expect-error readonly configuration never allows mutation
    input.configuration!.value.root = './replacement'
    // @ts-expect-error no configuration writer or private Context authority
    input.configuration!.set({ root: './replacement' })
  },
}
declare const prepareInput: StartupManagedServicePrepareInputV1
const sameContract: StartupManagedServiceConfigurationV1 | undefined = prepareInput.configuration
// @ts-expect-error frozen old apply input does not gain configuration
legacyInput.configuration
// @ts-expect-error callbacks are not configuration values
const executable: StartupManagedServiceConfigurationV1 = { ...configuration, value: { readAccount: () => 'secret' } }
// @ts-expect-error config carries no caller-selected profile authority
const forgedProfile: StartupManagedServiceConfigurationV1 = { ...configuration, profileId: 'another-profile' }
void [noOverride, configured, module, sameContract, executable, forgedProfile]
