import { channelExactConsumerFixture } from './channel-exact-consumer-fixture.mjs'
export const channelConversationConsumerFixture = channelExactConsumerFixture
  + `import type { ChannelManagerV4 } from '@cordisx/protocol/channel-manager/v4'
import type { ChannelServiceConfigV2 } from '@cordisx/protocol/channel-service-config/v2'
import type { ChannelServiceConfigV3 } from '@cordisx/protocol/channel-service-config/v3'
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
declare const pendingConfig: ChannelServiceConfigV3
pendingConfig.pendingConnections[0]?.account.accountId satisfies string | undefined
// @ts-expect-error Pending accounts do not carry a tenant identity.
pendingConfig.pendingConnections[0]?.account.tenantId
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
import type { ChannelRemoteHistoryRequestV1 } from '@cordisx/protocol/channel-remote-history/v1'
declare const remoteHistory: ChannelRemoteHistoryRequestV1
remoteHistory.account.tenantId satisfies string
import type { ChannelThreadHistoryRequestV1, ChannelThreadHistoryResultV1 } from '@cordisx/protocol/channel-thread-history/v1'
declare const threadHistoryRequest: ChannelThreadHistoryRequestV1
declare const threadHistoryResult: ChannelThreadHistoryResultV1
import type { ChannelMessageSearchRequestV1, ChannelMessageSearchResultV1 } from '@cordisx/protocol/channel-message-search/v1'
declare const messageSearchRequest: ChannelMessageSearchRequestV1
declare const messageSearchResult: ChannelMessageSearchResultV1
void [messageSearchRequest, messageSearchResult]
import type { ChannelHistoricalResourceReadRequestV1, ChannelHistoricalResourceResultV1 } from '@cordisx/protocol/channel-historical-resources/v1'
declare const historicalResourceRequest: ChannelHistoricalResourceReadRequestV1
declare const historicalResourceResult: ChannelHistoricalResourceResultV1
historicalResourceRequest.length satisfies number
if (historicalResourceResult.status === 'ok' && historicalResourceResult.resource.state === 'ready') {
  historicalResourceResult.resource.attachment.handle satisfies string
}
threadHistoryRequest.anchorMessageId satisfies string
import type { ChannelThreadForwardRequestV1, ChannelThreadForwardReceiptV1 } from '@cordisx/protocol/channel-thread-forward/v1'
declare const threadForwardRequest: ChannelThreadForwardRequestV1
declare const threadForwardReceipt: ChannelThreadForwardReceiptV1
threadForwardRequest.threadId satisfies string
if (threadForwardReceipt.state === 'sent') threadForwardReceipt.externalMessageId satisfies string
if (threadHistoryResult.status === 'ok') threadHistoryResult.messages[0]?.threadId satisfies string | undefined
import type { ChannelProviderContinuationRequestV1 } from '@cordisx/protocol/channel-provider-continuation/v1'
declare const providerContinuation: ChannelProviderContinuationRequestV1
providerContinuation.history satisfies 'inherit'
import type { ConversationContinuationRequestV1 } from '@cordisx/protocol/conversation-continuation/v1'
declare const logicalContinuation: ConversationContinuationRequestV1
logicalContinuation.mode satisfies 'linked' | 'fork' | 'fresh'
import type { ChannelMessageReadRequestV1 } from '@cordisx/protocol/channel-message-read/v1'
import type { ChannelTerminalIntentV1 } from '@cordisx/protocol/channel-terminal-intent/v1'
declare const terminalIntent: ChannelTerminalIntentV1
terminalIntent.inputOperationId satisfies string
import type { ChannelMessageOperationsV1 } from '@cordisx/protocol/channel-message-operations/v1'
declare const messageOperations: ChannelMessageOperationsV1
void messageOperations
import type { ChannelCardActionsV1, ChannelCardActionResultV1 } from '@cordisx/protocol/channel-card-actions/v1'
declare const cardActions: ChannelCardActionsV1
declare const cardActionResult: ChannelCardActionResultV1
void cardActions
if (cardActionResult.status === 'ok' && cardActionResult.operation === 'card-action-read') {
  cardActionResult.events satisfies readonly unknown[]
  if (cardActionResult.hasMore) cardActionResult.pageToken satisfies string
}
declare const messageRead: ChannelMessageReadRequestV1
messageRead.messageId satisfies string
`
