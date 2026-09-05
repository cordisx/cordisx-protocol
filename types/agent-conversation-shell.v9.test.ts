import type { AgentConversationShellCommandContext } from './agent-conversation-shell.v9.js'
import type { AgentBootstrapCommandOrigin } from './agent-admission.v4.js'
declare const origin: AgentBootstrapCommandOrigin
const context = {
  binding: origin.binding,
  generation: origin.generation,
  scope: 'composer-submit',
  command: { id: origin.commandId },
  submitPayload: 'hello',
  origin,
} satisfies AgentConversationShellCommandContext
context.origin.scope satisfies 'composer-submit'
