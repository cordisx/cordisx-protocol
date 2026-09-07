import type {
  PlatformProviderDefinitionV2,
  PlatformProviderFactoryConfigurationV2,
  PlatformProviderServiceApplyV2,
} from './platform-provider.v2.js'

const configuration = null as unknown as PlatformProviderFactoryConfigurationV2
configuration.mapping.models satisfies readonly {
  readonly sourceModelId: string
  readonly modelId: string
  readonly enabled: boolean
  readonly isDefault: boolean
}[]

const apply = null as unknown as PlatformProviderServiceApplyV2
void apply

const definition = null as unknown as PlatformProviderDefinitionV2
definition.createAdapter satisfies Function
