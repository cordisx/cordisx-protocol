/** Host-owned task delivery policy; independent of the transport-only Channel service configuration. */
export interface ChannelConversationPolicyScopeV1 {
  readonly adapterId?: string
  readonly accountId?: string
  readonly tenantId?: string
  readonly conversationId?: string
}
export interface ChannelConversationUserGroupV1 {
  readonly id: string
  readonly name: string
  readonly members: readonly (ChannelConversationPolicyScopeV1 & { readonly userId: string })[]
}
export interface ChannelConversationPolicyRuleV1 extends ChannelConversationPolicyScopeV1 {
  readonly id: string
  readonly action: 'dispatch' | 'command' | 'send'
  readonly effect: 'allow' | 'deny'
  readonly kinds?: readonly ('direct' | 'group')[]
  readonly userIds?: readonly string[]
  readonly userGroupIds?: readonly string[]
  readonly commands?: readonly string[]
}
export interface ChannelConversationPolicyV1 {
  readonly enabled: boolean
  readonly autoCreate: boolean
  readonly autoReply: boolean
  readonly groupReception: 'all' | 'mentions'
  readonly groups: readonly ChannelConversationUserGroupV1[]
  readonly rules: readonly ChannelConversationPolicyRuleV1[]
  readonly wakePrefixes: readonly (ChannelConversationPolicyScopeV1 & { readonly prefixes: readonly string[] })[]
}
export interface ChannelConversationPolicyReadbackV1 {
  readonly contract: 'cordisx.channel-conversation-policy-readback/v1'
  readonly schemaVersion: 1
  readonly profileId: string
  readonly hostGeneration: string
  readonly revision: number
  readonly policy: ChannelConversationPolicyV1
}
