import type { ChannelConversationPolicyScopeV1, ChannelConversationPolicyV1 } from './channel-conversation-policy.v1.js'

export type ChannelReplyModeV2 = 'conversation' | 'reply' | 'thread' | 'none'
export type ChannelAutoReplyModeV2 = ChannelReplyModeV2 | 'agent'

export interface ChannelReplyRuleV2 extends ChannelConversationPolicyScopeV1 {
  readonly mode: ChannelAutoReplyModeV2
  readonly fallbackMode?: ChannelReplyModeV2
  readonly kinds?: readonly ('direct' | 'group')[]
}

/** Explicit policy successor. Frozen v1 policy/readback documents cannot contain these fields. */
export interface ChannelConversationPolicyV2 extends ChannelConversationPolicyV1 {
  readonly replyMode: ChannelAutoReplyModeV2
  readonly replyFallbackMode: ChannelReplyModeV2
  readonly replyModes: readonly ChannelReplyRuleV2[]
}

export interface ChannelConversationPolicyReadbackV2 {
  readonly contract: 'cordisx.channel-conversation-policy-readback/v2'
  readonly schemaVersion: 2
  readonly profileId: string
  readonly hostGeneration: string
  readonly revision: number
  readonly policy: ChannelConversationPolicyV2
}
