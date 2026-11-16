import { channelExactConsumerFixture } from './channel-exact-consumer-fixture.mjs'
export const channelConversationConsumerFixture = channelExactConsumerFixture
  + `import type { ChannelManagerV4 } from '@cordisx/protocol/channel-manager/v4'
import type { ChannelServiceConfigV2 } from '@cordisx/protocol/channel-service-config/v2'
import type { ChannelManagerV5 } from '@cordisx/protocol/channel-manager/v5'
import type { ChannelConversationPolicyReadbackV1 } from '@cordisx/protocol/channel-conversation-policy/v1'
import type { ChannelManagerV6 } from '@cordisx/protocol/channel-manager/v6'
import type { ChannelConversationPolicyReadbackV2 } from '@cordisx/protocol/channel-conversation-policy/v2'
declare const replyManager: ChannelManagerV6
const replyPolicy: Promise<ChannelConversationPolicyReadbackV2> = replyManager.conversationReplyPolicy(new AbortController().signal)
replyManager.forOwnReplyService()?.configureConversationReplyPolicy(new AbortController().signal)
void replyPolicy
declare const channelManager: ChannelManagerV4
declare const ownedChannelManager: ChannelManagerV5
const ownManager: ChannelManagerV4 | undefined = ownedChannelManager.forOwnService()
ownManager?.snapshotWithIdentity()
// @ts-expect-error The management interface provides no message transport.
ownManager?.send()
declare const channelConfig: ChannelServiceConfigV2
const channelPolicy: Promise<ChannelConversationPolicyReadbackV1> = channelManager.conversationPolicy(new AbortController().signal)
channelManager.connectionConfiguration('opaque', new AbortController().signal)
channelManager.bindingPage({connectionToken:'opaque',limit:50}, new AbortController().signal)
void channelConfig; void channelPolicy
// @ts-expect-error A plugin cannot pass credentials to the Host configuration surface.
channelManager.configureConversationPolicy({appSecret:'not-allowed'})
// @ts-expect-error A frozen v1 result is not a reply-v2 result.
const wrongReplyPolicy: Promise<ChannelConversationPolicyReadbackV2> = replyManager.conversationPolicy(new AbortController().signal)
void wrongReplyPolicy
import type { ChannelManagerV10 } from '@cordisx/protocol/channel-manager/v10'
declare const conversationManager: ChannelManagerV10
conversationManager.conversationPage({ connectionToken: 'opaque', limit: 100 }, new AbortController().signal)
conversationManager.conversationDetail('opaque', new AbortController().signal)
conversationManager.conversationActivity({ conversationToken: 'opaque' }, new AbortController().signal)
conversationManager.conversationBindings({ conversationToken: 'opaque' }, new AbortController().signal)
conversationManager.openBindingConversation('opaque', new AbortController().signal)
import type { ChannelManagerV11 } from '@cordisx/protocol/channel-manager/v11'
declare const settingsManager: ChannelManagerV11
settingsManager.forOwnSettingsService()?.mountSettingsForm('new-chats', document.createElement('div'), { signal: new AbortController().signal })
settingsManager.registerChatCreationSettingsDestination({ id: 'defaults' })?.dispose()
// @ts-expect-error The destination cannot reference another owner.
settingsManager.registerChatCreationSettingsDestination({ id: 'defaults', owner: 'foreign' })
`
