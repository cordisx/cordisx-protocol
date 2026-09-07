import type { Context } from '@deepseek-ai/cordis'
import type {
  PlatformProviderAdapterV1,
  PlatformProviderBrokerDeclarationV1,
  PlatformProviderBrokerV1,
  PlatformProviderDefinitionV1,
  PlatformProviderDescriptorV1,
  PlatformProviderMappingV1,
  PlatformProviderOwnerV1,
} from './platform-provider.v1.js'

export * from './platform-provider.v1.js'

/** Successor factory projection: adds the safe, closed model mapping owned by the service configuration. */
export interface PlatformProviderFactoryConfigurationV2 {
  readonly $schema:
    'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/platform-provider-factory-configuration.v2.schema.json'
  readonly contract: 'cordisx.platform-provider-factory-configuration/v2'
  readonly schemaVersion: 2
  readonly configurationRevision: number
  readonly providerId: string
  readonly displayName: string
  readonly enabled: boolean
  readonly requestTimeoutMs: number
  readonly mapping: PlatformProviderMappingV1
}

export interface PlatformProviderRegistrationProjectionV2 {
  readonly $schema:
    'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/platform-provider-registration.v2.schema.json'
  readonly contract: 'cordisx.platform-provider-registration/v2'
  readonly schemaVersion: 2
  readonly registrationId: `ppr_${string}`
  readonly owner: PlatformProviderOwnerV1
  readonly descriptor: PlatformProviderDescriptorV1
  readonly mapping: PlatformProviderMappingV1
  readonly providerGeneration: string
  readonly brokerPolicy: PlatformProviderBrokerV1['policy']
  readonly configuration: PlatformProviderFactoryConfigurationV2
  readonly state: 'staged' | 'ready' | 'active' | 'draining' | 'failed' | 'disposed'
}

export interface PlatformProviderAdapterFactoryInputV2 {
  readonly owner: PlatformProviderOwnerV1
  readonly providerId: string
  readonly providerGeneration: string
  readonly configuration: PlatformProviderFactoryConfigurationV2
  readonly broker: PlatformProviderBrokerV1
  readonly signal: AbortSignal
}

export type PlatformProviderAdapterFactoryV2 = (
  input: PlatformProviderAdapterFactoryInputV2,
) => Promise<PlatformProviderAdapterV1>

export interface PlatformProviderDefinitionV2 extends Omit<PlatformProviderDefinitionV1, 'createAdapter'> {
  readonly descriptor: PlatformProviderDescriptorV1
  readonly mapping: PlatformProviderMappingV1
  readonly brokerRequest: PlatformProviderBrokerDeclarationV1
  readonly createAdapter: PlatformProviderAdapterFactoryV2
}

export interface PlatformProviderRegistrationHandleV2 {
  readonly registration: PlatformProviderRegistrationProjectionV2
  dispose(): Promise<void>
}

export interface PlatformProvidersV2 {
  readonly owner: PlatformProviderOwnerV1
  register(definition: PlatformProviderDefinitionV2): Promise<PlatformProviderRegistrationHandleV2>
}

export interface PlatformProviderServiceInputV2 {
  readonly owner: PlatformProviderOwnerV1
  readonly configurations: readonly PlatformProviderFactoryConfigurationV2[]
  readonly signal: AbortSignal
}

export type PlatformProviderContextV2 = Omit<Context, 'platformProviders'> & {
  readonly platformProviders: PlatformProvidersV2
}

export type PlatformProviderServiceApplyV2 = (
  ctx: PlatformProviderContextV2,
  input: PlatformProviderServiceInputV2,
) => void | Promise<void>
