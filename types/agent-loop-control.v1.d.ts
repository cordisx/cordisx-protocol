import type { AgentLoopTaskBinding, AgentLoopContentPart, BoundAgentLoopClient, AgentLoopCreateOrBindResult } from './agent-loop.v4.js'

export interface AgentLoopControlledTurnV1 {
  readonly contract: 'cordisx.agent-loop-controlled-turn/v1'
  readonly binding: AgentLoopTaskBinding
  readonly turn: string
  readonly commandId: string
  readonly deadline: number
}
export type AgentLoopControlFailureV1 =
  | 'denied' | 'unsupported' | 'invalid-request' | 'host-unavailable'
  | 'binding-unavailable' | 'provider-replaced' | 'operation-conflict'
  | 'reconciliation-required' | 'turn-unavailable' | 'deadline-exceeded'
export type AgentLoopControlResultV1<T> =
  | { readonly status: 'accepted'; readonly value: T }
  | { readonly status: 'unavailable'; readonly code: AgentLoopControlFailureV1 }
export interface AgentLoopControlV1 {
  readonly contract: 'cordisx.agent-loop-control/v1'
  /** Creates a user Agent in a fresh Host-owned game working directory; does not sandbox built-in tools. */
  create(command: Parameters<BoundAgentLoopClient['createOrBind']>[0] & { readonly target: { readonly mode: 'create' } }): Promise<AgentLoopCreateOrBindResult>
  /** Ordinary user-owned agent execution; does not promise a tool or filesystem sandbox. */
  submit(input: {
    readonly commandId: string
    readonly binding: AgentLoopTaskBinding
    readonly content: readonly [AgentLoopContentPart, ...AgentLoopContentPart[]]
    /** Absolute Unix milliseconds, at most 10 minutes from Host acceptance. */
    readonly deadline: number
  }): Promise<AgentLoopControlResultV1<AgentLoopControlledTurnV1>>
  /** Cancels only this owner's exact controlled turn; never the provider's current unrelated turn. */
  cancel(input: {
    readonly commandId: string
    readonly target: AgentLoopControlledTurnV1
  }): Promise<AgentLoopControlResultV1<{ readonly outcome: 'cancelled' | 'already-terminal' }>>
  /** Read completion/cancellation independently of content events; unknown is never completion. */
  read(target: AgentLoopControlledTurnV1): Promise<AgentLoopControlResultV1<{
    readonly state: 'running' | 'completed' | 'failed' | 'cancelled' | 'deadline-exceeded'
  }>>
  /** Requests cancellation of all controlled turns owned by this client. */
  dispose(): void
}
