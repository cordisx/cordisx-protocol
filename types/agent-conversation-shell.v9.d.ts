import type { AgentCommandOrigin } from './agent-admission.v1.js'
import type { AgentBootstrapCommandOrigin } from './agent-admission.v4.js'
import type { AgentConversationShellCommandContext as AgentConversationShellCommandContextV8 } from './agent-conversation-shell.v8.js'
export * from './agent-conversation-shell.v8.js'
/** Composer bootstrap context has no pre-existing Room target; Host mints it before handler entry. */
export type AgentConversationShellCommandContext =
  | Exclude<AgentConversationShellCommandContextV8, { readonly scope: 'composer-submit' }>
  | (Omit<Extract<AgentConversationShellCommandContextV8, { readonly scope: 'composer-submit' }>, 'origin'> & { readonly origin: AgentCommandOrigin | AgentBootstrapCommandOrigin })
