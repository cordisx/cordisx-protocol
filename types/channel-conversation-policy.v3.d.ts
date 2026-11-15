import type { ChannelConversationPolicyV2 } from './channel-conversation-policy.v2.js'
/** New commands and display organization; transport and older wire documents remain frozen. */
export interface ChannelConversationPolicyV3 extends ChannelConversationPolicyV2 {
  /** Omitted selects the Host default group; null disables automatic grouping. */
  readonly sidebarGroup?: string | null
}
export interface ChannelConversationPolicyReadbackV3 {
  readonly contract: 'cordisx.channel-conversation-policy-readback/v3'
  readonly schemaVersion: 3
  readonly profileId: string
  readonly hostGeneration: string
  readonly revision: number
  readonly policy: ChannelConversationPolicyV3
}
