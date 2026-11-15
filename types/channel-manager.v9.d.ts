import type { ChannelManagerV8 } from './channel-manager.v8.js'
import type { ChannelManagerBindingV3 } from './channel-manager.v2.js'
import type { ChannelManagerBindingPageV1 } from './channel-manager.v4.js'
import type { ChannelManagerFormMountResultV1, ChannelManagerFormOptionsV1 } from './channel-manager.v7.js'
import type { ChannelConversationPolicyReadbackV3 } from './channel-conversation-policy.v3.js'
import type { ChatExecutionReadbackV1 } from './chat-execution-settings.v1.js'
export interface ChannelManagerBindingDisplayV1 extends ChannelManagerBindingV3 {
  readonly sessionName: string
  readonly conversationName: string
}
export interface ChannelManagerBindingPageV2 extends Omit<ChannelManagerBindingPageV1, 'contract' | 'schemaVersion' | 'bindings'> {
  readonly contract: 'cordisx.channel-manager-binding-page/v2'
  readonly schemaVersion: 2
  readonly bindings: readonly ChannelManagerBindingDisplayV1[]
}
/** The Host owns inputs, authentication, exact target resolution and revision-fenced save. */
export interface ChannelManagerV9 extends ChannelManagerV8 {
  conversationWorkflowPolicy(signal: AbortSignal): Promise<ChannelConversationPolicyReadbackV3>
  mountConversationWorkflowPolicyForm(target: HTMLElement, options: ChannelManagerFormOptionsV1): Promise<ChannelManagerFormMountResultV1>
  mountChatCreationDefaultsForm(target: HTMLElement, options: ChannelManagerFormOptionsV1): Promise<ChannelManagerFormMountResultV1>
  mountBindingExecutionForm(bindingToken: string, target: HTMLElement, options: ChannelManagerFormOptionsV1): Promise<ChannelManagerFormMountResultV1>
  chatCreationDefaults(signal: AbortSignal): Promise<ChatExecutionReadbackV1>
  bindingExecution(bindingToken: string, signal: AbortSignal): Promise<ChatExecutionReadbackV1>
  bindingDisplayPage(request: { readonly connectionToken: string; readonly afterCursor?: string; readonly limit?: number }, signal: AbortSignal): Promise<ChannelManagerBindingPageV2>
  forOwnWorkflowService(): ChannelManagerV9 | undefined
}
