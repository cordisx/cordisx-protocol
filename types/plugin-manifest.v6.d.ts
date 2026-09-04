import type { LocalizedText } from './manager-content-navigation.v1.js'
import type { AgentRuntimeCapability } from './agents.v1.js'
import type { ExactSessionScope } from './sessions.v1.js'

export type PluginManifestCapabilityNameV5 =
  | 'models.read'
  | 'tasks.catalog.read'
  | 'tasks.content.read'
  | 'tasks.create'
  | 'tasks.control'
  | 'turns.submit'
  | 'turns.control'
  | 'agent.events.read'
  | 'agent.history.read'
  | 'agent.messages.append'
  | 'agent.steps.reject'
  | 'agent.messages.transform'
  | 'agent.prompt.section'
  | 'agent.prompt.context'
  | 'channel.accounts.read'
  | 'channel.accounts.connect'
  | 'channel.events.receive'
  | 'channel.events.subscribe'
  | 'channel.messages.send'
  | 'channel.bindings.read'
  | 'channel.bindings.write'
  | 'channel.attachments.read'
  | 'ui.host-dom.read'
  | 'ui.host-dom.modify'

export type PluginApprovalCapabilityV6 = 'approvals.request' | 'approvals.answer'
export type PluginManifestAgentRuntimeCapabilityV6 = AgentRuntimeCapability

export interface PluginManifestHostRouteSessionScopeBindingV6 {
  readonly kind: 'host-route-param'
  /** Owner-local route id; Host resolves it only inside this manifest owner. */
  readonly routeId: string
  /** V6 dynamic Agent authority binds only the exact `:sessionId` route parameter. */
  readonly param: 'sessionId'
}

export type PluginManifestSessionScopeDeclarationV6 =
  | ExactSessionScope['sessionIds']
  | PluginManifestHostRouteSessionScopeBindingV6

interface PluginManifestAgentRuntimeCapabilityDeclarationBaseV6 {
  readonly rationale?: {
    readonly title: LocalizedText
    readonly description: LocalizedText
    readonly feature: LocalizedText
    readonly deniedBehavior: LocalizedText
  }
  readonly security?: {
    readonly dataUse: 'ephemeral' | 'profile-persistent' | 'external-service'
    readonly retention: 'none' | 'runtime' | 'profile'
    readonly externalTransfer: boolean
  }
}

export type PluginApprovalCapabilityDeclarationV6 =
  | (PluginManifestAgentRuntimeCapabilityDeclarationBaseV6 & {
      readonly name: PluginApprovalCapabilityV6
      readonly required: false
      readonly scope: { readonly sessionIds: PluginManifestHostRouteSessionScopeBindingV6 }
    })
  | (PluginManifestAgentRuntimeCapabilityDeclarationBaseV6 & {
      readonly name: PluginApprovalCapabilityV6
      readonly required: boolean
      readonly scope: ExactSessionScope
    })

export type PluginManifestAgentRuntimeCapabilityDeclarationV6 =
  | PluginApprovalCapabilityDeclarationV6
  | (PluginManifestAgentRuntimeCapabilityDeclarationBaseV6 & {
      readonly name: Exclude<PluginManifestAgentRuntimeCapabilityV6, PluginApprovalCapabilityV6>
      readonly required: false
      readonly scope: { readonly sessionIds: PluginManifestHostRouteSessionScopeBindingV6 }
    })
  | (PluginManifestAgentRuntimeCapabilityDeclarationBaseV6 & {
      readonly name: Exclude<PluginManifestAgentRuntimeCapabilityV6, PluginApprovalCapabilityV6>
      readonly required: boolean
      readonly scope: ExactSessionScope
    })
  | (PluginManifestAgentRuntimeCapabilityDeclarationBaseV6 & {
      readonly name: Exclude<PluginManifestAgentRuntimeCapabilityV6, PluginApprovalCapabilityV6>
      readonly required: boolean
      readonly scope: { readonly sessionIds?: never }
    })

export interface PluginManifestLegacyCapabilityDeclarationV5 {
  readonly name: PluginManifestCapabilityNameV5
  readonly required: boolean
  readonly rationale?: PluginManifestAgentRuntimeCapabilityDeclarationBaseV6['rationale']
  readonly security?: PluginManifestAgentRuntimeCapabilityDeclarationBaseV6['security']
  readonly scope: {
    readonly providers?: readonly string[]
    readonly cwdRoots?: readonly string[]
    readonly sessions?: readonly { readonly providerId: string; readonly remoteSessionId: string }[]
    readonly sessionIds?: readonly string[]
    readonly channelAccounts?: readonly { readonly adapterId: string; readonly accountId: string }[]
    readonly channelTenants?: readonly { readonly adapterId: string; readonly accountId: string; readonly tenantId: string }[]
    readonly channelConversations?: readonly { readonly adapterId: string; readonly accountId: string; readonly tenantId: string; readonly conversationId: string; readonly kind: 'direct' | 'group' | 'broadcast' }[]
    readonly channelUsers?: readonly { readonly adapterId: string; readonly accountId: string; readonly tenantId: string; readonly userId: string }[]
    readonly rootIds?: readonly string[]
    readonly operations?: readonly ('inspect-structure' | 'read-text' | 'read-attributes' | 'read-state' | 'set-text' | 'set-attribute' | 'insert-owned-structured-child' | 'remove-owned-child' | 'focus')[]
  }
}

export type PluginManifestCapabilityDeclarationV6 =
  | PluginManifestLegacyCapabilityDeclarationV5
  | PluginManifestAgentRuntimeCapabilityDeclarationV6

export type PluginManifestServiceConfigurationV6 =
  | { readonly kind: 'none' }
  | { readonly kind: 'host'; readonly schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/channel-service-config.v1.schema.json'; readonly configApplies: 'restart' }

export interface PluginManifestChannelAdapterServiceV6 {
  readonly id: string
  readonly kind: 'channel-adapter'
  readonly entry: string
  readonly configuration: PluginManifestServiceConfigurationV6
}

export interface PluginRuntimeManifestV6 {
  readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/plugin-manifest.v6.schema.json'
  readonly schemaVersion: 6
  readonly id: string
  readonly name?: string
  readonly capabilities: readonly PluginManifestCapabilityDeclarationV6[]
  /** Service declarations remain byte-for-byte compatible with manifest v5. */
  readonly services: readonly PluginManifestChannelAdapterServiceV6[]
}
