import type { ChannelManagerV5 } from './channel-manager.v5.js'
import type { ChannelConversationPolicyReadbackV2 } from './channel-conversation-policy.v2.js'

/** Reply policy successor. All inherited wire documents and callable signatures remain unchanged. */
export interface ChannelManagerV6 extends ChannelManagerV5 {
  conversationReplyPolicy(signal: AbortSignal): Promise<ChannelConversationPolicyReadbackV2>
  /** Host form edits the v2 policy, retaining the same profile, revision and caller lifetime fences. */
  configureConversationReplyPolicy(signal: AbortSignal): ReturnType<ChannelManagerV5['configureConversationPolicy']>
  /** Same ownership rules as forOwnService(); missing, foreign or retired ownership returns undefined. */
  forOwnReplyService(): ChannelManagerV6 | undefined
}
