import type { AgentAvatarInheritanceMode, AgentAvatarRef } from './agent-avatar.v1.js'

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
  avatar?: AgentAvatarRef
  extends?: readonly AgentDefinitionIdentity[]
  inherit: {
    promptSections: AgentInheritanceMode
    rules: AgentInheritanceMode
    skills: AgentInheritanceMode
    tools: AgentObjectInheritanceMode
    mcpServers: AgentObjectInheritanceMode
    runtimeDefaults: AgentObjectInheritanceMode
    avatar?: AgentAvatarInheritanceMode
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

/** Consumer-persisted operation identity carried on the wire as commandId. */
export type AgentLoopOperationId = string

export type AgentLoopTaskDetailsUrl =
  | { url: `app:${string}`; target: 'host' }
  | { url: `https:${string}` | `codex:${string}` | `claude:${string}`; target: 'external' }

export interface AgentLoopTaskBinding {
  $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/agent-loop-task-binding.v2.schema.json'
  contract: 'cordisx.agent-loop-task-binding/v2'
  schemaVersion: 2
  binding: AgentLoopBindingIdentity
  definition: AgentDefinitionIdentity
  task: string
  state: 'active' | 'closed'
}

interface AgentLoopCommandBase {
  $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/agent-loop-command.v2.schema.json'
  contract: 'cordisx.agent-loop-command/v2'
  schemaVersion: 2
  /** Durable consumer operation id; structurally different reuse is rejected. */
  commandId: AgentLoopOperationId
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
  $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/agent-loop-result.v2.schema.json'
  contract: 'cordisx.agent-loop-result/v2'
  schemaVersion: 2
  commandId: AgentLoopOperationId
}

export type AgentLoopDeliveryDisposition = 'executed' | 'replayed' | 'reconciled'

export interface AgentLoopDelivery {
  disposition: AgentLoopDeliveryDisposition
}

export type AgentLoopOperationUnavailableCode =
  | 'operation-conflict'
  | 'reconciliation-required'
  | 'operation-expired'
  | 'provider-replaced'

export type AgentLoopCreateOrBindUnavailableCode = 'details-unavailable' | AgentLoopOperationUnavailableCode

type AgentLoopAllowedCreateOrBindAuthorization = Extract<AgentLoopAuthorizationOutcome, { state: 'allowed' }> & {
  capability: 'tasks.create' | 'tasks.content.read'
}

type AgentLoopDeniedCreateOrBindAuthorization = Extract<AgentLoopAuthorizationOutcome, { state: 'denied' }> & {
  capability: 'tasks.create' | 'tasks.content.read'
}

type AgentLoopUnavailableCreateOrBindAuthorization = Extract<AgentLoopAuthorizationOutcome, { state: 'unavailable' }> & {
  capability: 'tasks.create' | 'tasks.content.read'
}

type AgentLoopAllowedSendAuthorization = Extract<AgentLoopAuthorizationOutcome, { state: 'allowed' }> & {
  capability: 'turns.submit'
}

type AgentLoopDeniedSendAuthorization = Extract<AgentLoopAuthorizationOutcome, { state: 'denied' }> & {
  capability: 'turns.submit'
}

type AgentLoopUnavailableSendAuthorization = Extract<AgentLoopAuthorizationOutcome, { state: 'unavailable' }> & {
  capability: 'turns.submit'
}

export type AgentLoopResult =
  | (AgentLoopResultBase & { type: 'create-or-bind'; status: 'accepted'; authorization: AgentLoopAllowedCreateOrBindAuthorization; binding: AgentLoopTaskBinding; detailsUrl: AgentLoopTaskDetailsUrl; delivery: AgentLoopDelivery })
  | (AgentLoopResultBase & { type: 'create-or-bind'; status: 'denied'; authorization: AgentLoopDeniedCreateOrBindAuthorization })
  | (AgentLoopResultBase & { type: 'create-or-bind'; status: 'unavailable'; authorization: AgentLoopUnavailableCreateOrBindAuthorization })
  | (AgentLoopResultBase & { type: 'create-or-bind'; status: 'unavailable'; authorization: AgentLoopAllowedCreateOrBindAuthorization; code: AgentLoopCreateOrBindUnavailableCode })
  | (AgentLoopResultBase & { type: 'send'; status: 'accepted'; authorization: AgentLoopAllowedSendAuthorization; binding: AgentLoopTaskBinding; messageId: string; turn: string; delivery: AgentLoopDelivery })
  | (AgentLoopResultBase & { type: 'send'; status: 'denied'; authorization: AgentLoopDeniedSendAuthorization })
  | (AgentLoopResultBase & { type: 'send'; status: 'unavailable'; authorization: AgentLoopUnavailableSendAuthorization })
  | (AgentLoopResultBase & { type: 'send'; status: 'unavailable'; authorization: AgentLoopAllowedSendAuthorization; code: AgentLoopOperationUnavailableCode })

export type AgentLoopCreateOrBindResult = Extract<AgentLoopResult, { type: 'create-or-bind' }>
export type AgentLoopSendResult = Extract<AgentLoopResult, { type: 'send' }>

interface AgentLoopEventBase {
  $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/agent-loop-event.v2.schema.json'
  contract: 'cordisx.agent-loop-event/v2'
  schemaVersion: 2
  eventId: string
  binding: AgentLoopBindingIdentity
  sequence: number
  occurredAt: string
  causation?: { operationId: AgentLoopOperationId }
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
  $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/agent-loop-event-subscription.v2.schema.json'
  contract: 'cordisx.agent-loop-event-subscription/v2'
  schemaVersion: 2
  subscriptionId: string
  binding: AgentLoopBindingIdentity
  afterSequence: number
  snapshotSequence: number
}

export interface AgentLoopEventPage {
  $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/agent-loop-event-page.v2.schema.json'
  contract: 'cordisx.agent-loop-event-page/v2'
  schemaVersion: 2
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
  readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/agent-loop-bound-client.v2.schema.json'
  readonly contract: 'cordisx.bound-agent-loop-client/v2'
  readonly schemaVersion: 2
  readonly durableLedger: {
    readonly operationId: 'commandId'
    readonly scope: 'owner-provider'
    readonly providerAffinity: 'generation-fenced'
    readonly survivesClientDispose: true
    readonly payloadMatch: 'structural-exact'
    readonly retention: {
      readonly active: 'logical-task-lifetime'
      readonly recoveryDays: 30
    }
  }
  /** Supports multiple definitions and active task bindings in one client lifetime. */
  createOrBind(command: Extract<AgentLoopCommand, { type: 'create-or-bind' }>): Promise<AgentLoopCreateOrBindResult>
  /** Send independently to one exact active binding. */
  send(command: Extract<AgentLoopCommand, { type: 'send' }>): Promise<AgentLoopSendResult>
  /** Each accepted handle owns an independent binding-generation cursor. */
  subscribe(binding: AgentLoopTaskBinding, afterSequence: number): Promise<AgentLoopSubscribeRuntimeResult>
  dispose(): void
}
