export const channelInlineFormsConsumerFixture = `
import type { ChannelManagerV9 } from '@cordisx/protocol/channel-manager/v9'
import type { ChatExecutionReadbackV1 } from '@cordisx/protocol/chat-execution-settings/v1'
import type { PluginDocumentsV1, PluginDocumentReadbackV1 } from '@cordisx/protocol/plugin-documents/v1'
import type { ChannelManagerV8 } from '@cordisx/protocol/channel-manager/v8'
import type { ChannelManagerV7, ChannelManagerFormOutcomeV1 } from '@cordisx/protocol/channel-manager/v7'
import type { ManagerContentNavigationDeclarationV6 } from '@cordisx/protocol/manager-content-navigation/v6'
declare const inlineManager: ChannelManagerV7
declare const configurationManager: ChannelManagerV8
declare const inlineSeat: HTMLElement
const inlineOptions = { signal: new AbortController().signal, onResult: (result: ChannelManagerFormOutcomeV1) => result.code }
declare const workflowManager: ChannelManagerV9
workflowManager.forOwnWorkflowService()?.mountChatCreationDefaultsForm(inlineSeat, inlineOptions)
workflowManager.mountBindingExecutionForm('binding-token', inlineSeat, inlineOptions)
workflowManager.bindingDisplayPage({ connectionToken: 'connection-token' }, inlineOptions.signal)
declare const executionReadback: ChatExecutionReadbackV1
executionReadback.application satisfies 'saved' | 'submitted' | 'applied' | 'restricted' | 'unknown'
declare const pluginDocs: PluginDocumentsV1
declare const pluginDoc: PluginDocumentReadbackV1
pluginDocs.documents[0]?.path satisfies string | undefined
pluginDoc.content satisfies string
// @ts-expect-error Plugin forms resolve native identity internally, never from plugin-provided chat IDs.
workflowManager.mountBindingExecutionForm('binding-token', inlineSeat, { ...inlineOptions, threadId: 'private' })
inlineManager.forOwnPageService()?.mountConversationReplyPolicyForm(inlineSeat, inlineOptions)
inlineManager.mountCredentialForm('opaque-token', inlineSeat, inlineOptions)
configurationManager.forOwnConfigurationService()?.mountConnectionConfigurationForm('opaque-token', inlineSeat, inlineOptions)
// @ts-expect-error No private settings or secret submission from the plugin.
configurationManager.mountConnectionConfigurationForm('opaque-token', inlineSeat, { ...inlineOptions, secret: 'forged' })
// @ts-expect-error Plugins cannot supply secrets or a policy draft to a mounted Host form.
inlineManager.mountCredentialForm('opaque-token', inlineSeat, { ...inlineOptions, secret: 'forged' })
declare const inlineSummary: ManagerContentNavigationDeclarationV6
inlineSummary.recordSummary?.metrics?.[0]?.value satisfies number | undefined
`
