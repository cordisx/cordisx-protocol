import type { ChannelConversationPolicyScopeV1 } from './channel-conversation-policy.v1.js'

export interface ChannelTaskSettingsV1 { readonly providerId?: string; readonly model?: string; readonly effort?: string }
export interface ChannelTaskScopeV1 extends ChannelConversationPolicyScopeV1 {
  readonly kinds?: readonly ('direct' | 'group')[]
  readonly userIds?: readonly string[]
  readonly userGroupIds?: readonly string[]
}
export interface ChannelTaskDefaultV1 extends ChannelTaskScopeV1 { readonly id: string; readonly settings: ChannelTaskSettingsV1 }
export interface ChannelTaskPermissionV1 extends ChannelTaskScopeV1 {
  readonly id: string
  readonly effect: 'allow' | 'deny'
  readonly fields?: readonly (keyof ChannelTaskSettingsV1)[]
  readonly providerIds?: readonly string[]
  readonly models?: readonly { readonly providerId: string; readonly model: string }[]
  readonly efforts?: readonly string[]
}
export interface ChannelTaskConfigV1 {
  readonly defaults: ChannelTaskSettingsV1
  readonly scopes: readonly ChannelTaskDefaultV1[]
  readonly permissions: readonly ChannelTaskPermissionV1[]
}
