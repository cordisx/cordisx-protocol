import type { AgentCommandOrigin } from './agent-admission.v1.js'
import type { AgentConversationShellCommandContext as AgentConversationShellCommandContextV7 } from './agent-conversation-shell.v7.js'

export * from './agent-conversation-shell.v7.js'

/**
 * Additive Shell v8 command context. All v7 fields and branches remain
 * available; only composer-submit gains the Host-generated origin capability.
 */
export type AgentConversationShellCommandContext =
  | Exclude<AgentConversationShellCommandContextV7, { readonly scope: 'composer-submit' }>
  | (Extract<AgentConversationShellCommandContextV7, { readonly scope: 'composer-submit' }> & { readonly origin: AgentCommandOrigin })
