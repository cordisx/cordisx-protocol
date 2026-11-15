import type { ChannelManagerV3 } from './channel-manager.v3.js'
import type { ChannelManagerBindingV3, ChannelManagerSelectorV2 } from './channel-manager.v2.js'
import type { ChannelConversationPolicyReadbackV1 } from './channel-conversation-policy.v1.js'

export interface ChannelManagerConnectionConfigurationV1 {
  readonly contract: 'cordisx.channel-manager-connection-configuration/v1'
  readonly schemaVersion: 1
  readonly profileId: string
  readonly hostGeneration: string
  readonly revision: number
  readonly connectionToken: string
  readonly displayName?: string
  readonly selectors: readonly ChannelManagerSelectorV2[]
}

export interface ChannelManagerBindingPageV1 {
  readonly contract: 'cordisx.channel-manager-binding-page/v1'
  readonly schemaVersion: 1
  readonly profileId: string
  readonly hostGeneration: string
  readonly snapshotRevision: number
  readonly connectionToken: string
  readonly total: number
  readonly bindings: readonly ChannelManagerBindingV3[]
  readonly nextCursor?: string
}

/** Explicit successor: inherited snapshot and operation wire documents stay frozen. */
export interface ChannelManagerV4 extends ChannelManagerV3 {
  /** Redacted transport reception configuration; never an App ID, secret or credential reference. */
  connectionConfiguration(connectionToken: string, signal: AbortSignal): Promise<ChannelManagerConnectionConfigurationV1>
  /** Revision-fenced read window. The page budget does not limit persistent binding cardinality. */
  bindingPage(request: { readonly connectionToken: string; readonly afterCursor?: string; readonly limit?: number },
    signal: AbortSignal): Promise<ChannelManagerBindingPageV1>
  /** Read the current profile's Host consumer policy; does not connect, send or create a task. */
  conversationPolicy(signal: AbortSignal): Promise<ChannelConversationPolicyReadbackV1>
  /** Host-owned configuration surface. Plugins never own credentials, policy writes or form chrome. */
  configureConversationPolicy(signal: AbortSignal): Promise<{
    readonly status: 'applied' | 'cancelled' | 'conflict' | 'rejected' | 'unavailable'
    readonly code: string
  }>
}
