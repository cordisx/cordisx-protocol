import type { AgentCommandOrigin } from './agent-admission.v1.js'
import type { AgentConversationShellCommandContext } from './agent-conversation-shell.v8.js'

declare const origin: AgentCommandOrigin
const composerContext = {
  binding: { bindingId: 'binding-8', ownerGeneration: 'owner-8' },
  generation: 'shell-8',
  scope: 'composer-submit',
  command: { id: 'chatroom.submit' },
  submitPayload: 'Lead review',
  origin,
} satisfies AgentConversationShellCommandContext
composerContext.origin.room.memberId satisfies string

const messageContext = {
  binding: { bindingId: 'binding-8', ownerGeneration: 'owner-8' },
  generation: 'shell-8',
  scope: 'message',
  itemId: 'message-8',
  command: { id: 'chatroom.retry' },
} satisfies AgentConversationShellCommandContext
messageContext.scope satisfies 'message'

// @ts-expect-error composer-submit must carry the Host-generated origin
const missingOrigin: AgentConversationShellCommandContext = { ...composerContext, origin: undefined }
void missingOrigin
