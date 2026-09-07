import type { JsonValue } from './sessions.v1.js'

export interface AgentToolResourcesV1 {
  readonly contract: 'cordisx.agent-tools/v1'
  readonly skills: readonly { readonly id: string; readonly path: `./${string}` }[]
  readonly commands: readonly { readonly id: string; readonly entry: `./${string}`; readonly skillId: string }[]
}

export interface AgentToolBinding {
  readonly sessionId: string
  readonly scope: JsonValue
}

export interface AgentToolBindingHandle {
  readonly bindingId: string
  readonly sessionId: string
  readonly expiresAt: string
  revoke(): Promise<void>
}

export type AgentToolHandler = (request: {
  readonly input: JsonValue
  readonly binding: AgentToolBinding
  readonly signal: AbortSignal
}) => JsonValue | Promise<JsonValue>

export interface AgentTools {
  register(command: { readonly id: string }, handler: AgentToolHandler): () => void
  bind(request: {
    readonly commandId: string
    readonly sessionId: string
    readonly scope: JsonValue
  }): Promise<AgentToolBindingHandle>
}
