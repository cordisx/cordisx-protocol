export interface AgentDefinitionIdentity {
  agentId: string
  revision: string
}

export type AgentInheritanceMode = 'append' | 'prepend' | 'merge' | 'replace' | 'none'
export type AgentObjectInheritanceMode = 'merge' | 'replace' | 'none'

export interface AgentDefinition {
  $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/agent-definition.v1.schema.json'
  contract: 'cordisx.agent-definition/v1'
  schemaVersion: 1
  identity: AgentDefinitionIdentity
  name?: string
  description?: string
  extends?: readonly AgentDefinitionIdentity[]
  inherit: {
    promptSections: AgentInheritanceMode
    rules: AgentInheritanceMode
    skills: AgentInheritanceMode
    tools: AgentObjectInheritanceMode
    mcpServers: AgentObjectInheritanceMode
    runtimeDefaults: AgentObjectInheritanceMode
  }
  promptSections?: readonly {
    sectionId: string
    kind: 'introduction' | 'personality' | 'role' | 'operations' | 'tools' | 'knowledge' | 'memory-policy' | 'memory' | 'other'
    text: string
  }[]
  rules?: readonly string[]
  skills?: readonly string[]
  tools?: AgentFilter
  mcpServers?: AgentFilter
  runtimeDefaults?: {
    adapterId?: string
    model?: { providerId: string; modelId: string }
    effort?: 'low' | 'medium' | 'high' | 'xhigh'
  }
}

export interface AgentFilter {
  include?: readonly string[]
  exclude?: readonly string[]
}

export type AgentLoopContentPart =
  | { kind: 'text'; text: string }
  | { kind: 'image-ref'; ref: string; mediaType: `image/${string}`; alt?: string }

export interface AgentLoopBindingIdentity {
  bindingId: string
  generation: number
}

export interface AgentLoopTaskBinding {
  $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/agent-loop-task-binding.v1.schema.json'
  contract: 'cordisx.agent-loop-task-binding/v1'
  schemaVersion: 1
  binding: AgentLoopBindingIdentity
  definition: AgentDefinitionIdentity
  task: string
  state: 'active' | 'closed'
}

interface AgentLoopCommandBase {
  $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/agent-loop-command.v1.schema.json'
  contract: 'cordisx.agent-loop-command/v1'
  schemaVersion: 1
  commandId: string
}

export type AgentLoopCommand =
  | (AgentLoopCommandBase & {
    type: 'create-or-bind'
    definition: AgentDefinitionIdentity
    definitions: readonly [AgentDefinition, ...AgentDefinition[]]
    target: { mode: 'create' } | { mode: 'bind'; task: string }
  })
  | (AgentLoopCommandBase & {
    type: 'send'
    binding: AgentLoopTaskBinding
    content: readonly [AgentLoopContentPart, ...AgentLoopContentPart[]]
  })

export type AgentLoopAuthorizationOutcome =
  | { capability: 'tasks.create' | 'tasks.content.read' | 'turns.submit'; state: 'allowed'; code: 'allowed' }
  | { capability: 'tasks.create' | 'tasks.content.read' | 'turns.submit'; state: 'denied'; code: 'user-denied' | 'policy-denied' }
  | { capability: 'tasks.create' | 'tasks.content.read' | 'turns.submit'; state: 'unavailable'; code: 'host-unavailable' | 'task-unavailable' | 'unsupported' }

interface AgentLoopResultBase {
  $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/agent-loop-result.v1.schema.json'
  contract: 'cordisx.agent-loop-result/v1'
  schemaVersion: 1
  commandId: string
}

export type AgentLoopResult =
  | (AgentLoopResultBase & { type: 'create-or-bind'; status: 'accepted'; authorization: Extract<AgentLoopAuthorizationOutcome, { state: 'allowed' }>; binding: AgentLoopTaskBinding })
  | (AgentLoopResultBase & { type: 'create-or-bind'; status: 'denied'; authorization: Extract<AgentLoopAuthorizationOutcome, { state: 'denied' }> })
  | (AgentLoopResultBase & { type: 'create-or-bind'; status: 'unavailable'; authorization: Extract<AgentLoopAuthorizationOutcome, { state: 'unavailable' }> })
  | (AgentLoopResultBase & { type: 'send'; status: 'accepted'; authorization: Extract<AgentLoopAuthorizationOutcome, { state: 'allowed' }>; binding: AgentLoopTaskBinding; messageId: string })
  | (AgentLoopResultBase & { type: 'send'; status: 'denied'; authorization: Extract<AgentLoopAuthorizationOutcome, { state: 'denied' }> })
  | (AgentLoopResultBase & { type: 'send'; status: 'unavailable'; authorization: Extract<AgentLoopAuthorizationOutcome, { state: 'unavailable' }> })

export type AgentLoopCreateOrBindResult = Extract<AgentLoopResult, { type: 'create-or-bind' }>
export type AgentLoopSendResult = Extract<AgentLoopResult, { type: 'send' }>

interface AgentLoopEventBase {
  $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/agent-loop-event.v1.schema.json'
  contract: 'cordisx.agent-loop-event/v1'
  schemaVersion: 1
  eventId: string
  binding: AgentLoopBindingIdentity
  sequence: number
  occurredAt: string
  turn?: string
}

export type AgentLoopEvent =
  | (AgentLoopEventBase & {
    type: 'message'
    message: {
      messageId: string
      role: 'user' | 'assistant'
      content: readonly [AgentLoopContentPart, ...AgentLoopContentPart[]]
    }
  })
  | (AgentLoopEventBase & {
    type: 'approval'
    turn: string
    approval:
      | { approvalId: string; kind: 'command' | 'file-change' | 'external-action' | 'other'; state: 'pending' }
      | { approvalId: string; kind: 'command' | 'file-change' | 'external-action' | 'other'; state: 'resolved'; outcome: 'approved' | 'denied' | 'expired' | 'cancelled' }
  })
  | (AgentLoopEventBase & {
    type: 'lifecycle'
    lifecycle:
      | { phase: 'binding.created' | 'binding.bound' | 'turn.started' | 'turn.completed' | 'binding.closed' }
      | { phase: 'turn.failed'; failure: { code: string; retryable: boolean } }
  })

export interface AgentLoopEventSubscription {
  $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/agent-loop-event-subscription.v1.schema.json'
  contract: 'cordisx.agent-loop-event-subscription/v1'
  schemaVersion: 1
  subscriptionId: string
  binding: AgentLoopBindingIdentity
  afterSequence: number
  snapshotSequence: number
}

export interface AgentLoopEventPage {
  $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/agent-loop-event-page.v1.schema.json'
  contract: 'cordisx.agent-loop-event-page/v1'
  schemaVersion: 1
  subscription: AgentLoopEventSubscription
  afterSequence: number
  phase: 'replay' | 'live'
  events: readonly AgentLoopEvent[]
  nextAfterSequence: number
  hasMore: boolean
}

export interface AgentLoopSubscription {
  readonly subscription: AgentLoopEventSubscription
  readonly pages: AsyncIterable<AgentLoopEventPage>
  unsubscribe(): void
}

export type AgentLoopSubscribeRuntimeResult =
  | { status: 'accepted'; authorization: Extract<AgentLoopAuthorizationOutcome, { state: 'allowed' }> & { capability: 'tasks.content.read' }; handle: AgentLoopSubscription }
  | { status: 'denied'; authorization: Extract<AgentLoopAuthorizationOutcome, { state: 'denied' }> & { capability: 'tasks.content.read' } }
  | { status: 'unavailable'; authorization: Extract<AgentLoopAuthorizationOutcome, { state: 'unavailable' }> & { capability: 'tasks.content.read' } }

export interface BoundAgentLoopClient {
  readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/agent-loop-bound-client.v1.schema.json'
  readonly contract: 'cordisx.bound-agent-loop-client/v1'
  readonly schemaVersion: 1
  createOrBind(command: Extract<AgentLoopCommand, { type: 'create-or-bind' }>): Promise<AgentLoopCreateOrBindResult>
  send(command: Extract<AgentLoopCommand, { type: 'send' }>): Promise<AgentLoopSendResult>
  subscribe(binding: AgentLoopTaskBinding, afterSequence: number): Promise<AgentLoopSubscribeRuntimeResult>
  dispose(): void
}
