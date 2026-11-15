import type { ChannelManagerV6 } from './channel-manager.v6.js'
import type { ChannelManagerV4 } from './channel-manager.v4.js'
import type { ChannelConversationPolicyReadbackV1 } from './channel-conversation-policy.v1.js'
import type { ChannelConversationPolicyReadbackV2, ChannelReplyModeV2 } from './channel-conversation-policy.v2.js'

declare const manager: ChannelManagerV6
const signal = new AbortController().signal
const predecessor: ChannelManagerV4 = manager
const oldReadback: Promise<ChannelConversationPolicyReadbackV1> = predecessor.conversationPolicy(signal)
const newReadback: Promise<ChannelConversationPolicyReadbackV2> = manager.conversationReplyPolicy(signal)
const own: ChannelManagerV6 | undefined = manager.forOwnReplyService()
own?.configureConversationReplyPolicy(signal)
const mode: ChannelReplyModeV2 = 'thread'
void oldReadback
void newReadback
void mode
// @ts-expect-error Frozen v1 method cannot be retyped as a reply-v2 document.
const wrong: Promise<ChannelConversationPolicyReadbackV2> = manager.conversationPolicy(signal)
// @ts-expect-error The form accepts no policy write or credential from a plugin.
manager.configureConversationReplyPolicy({ policy: {}, appSecret: 'private' })
// @ts-expect-error A reply management facade grants no message transport.
own?.send()
// @ts-expect-error A concrete fallback cannot delegate back to the Agent.
const fallback: ChannelReplyModeV2 = 'agent'
void wrong
void fallback
