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

export type AgentLoopOperationId = string

export interface AgentLoopOperationCausation {
  operationId: AgentLoopOperationId
}

export type AgentLoopTaskDetailsUrl =
  | { url: `app:${string}`; target: 'host' }
  | { url: `https:${string}` | `codex:${string}` | `claude:${string}`; target: 'external' }

export interface AgentLoopTaskBinding {
  $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/agent-loop-task-binding.v4.schema.json'
  contract: 'cordisx.agent-loop-task-binding/v4'
  schemaVersion: 4
  binding: AgentLoopBindingIdentity
  definition: AgentDefinitionIdentity
  task: string
  state: 'active' | 'closed'
}

interface AgentLoopCommandBase {
  $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/agent-loop-command.v4.schema.json'
  contract: 'cordisx.agent-loop-command/v4'
  schemaVersion: 4
  commandId: AgentLoopOperationId
}

export type AgentLoopApprovalDecision = 'approved' | 'denied' | 'cancelled'
export interface AgentLoopMemberSelfIntroductionIntent {
  kind: 'member-self-introduction'
  audience: 'room'
  output: 'assistant-message'
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
  | (AgentLoopCommandBase & {
    type: 'approval-decision'
    binding: AgentLoopTaskBinding
    turn: string
    approvalId: string
    decision: AgentLoopApprovalDecision
  })
  | (AgentLoopCommandBase & {
    type: 'request-member-self-introduction'
    binding: AgentLoopTaskBinding
    participantId: string
    memberId: string
    runId: string
    intent: AgentLoopMemberSelfIntroductionIntent
  })
  | (AgentLoopCommandBase & {
    type: 'cancel-member-self-introduction'
    binding: AgentLoopTaskBinding
    participantId: string
    memberId: string
    runId: string
    requestOperationId: AgentLoopOperationId
  })

export type AgentLoopAuthorizationOutcome =
  | { capability: 'tasks.create' | 'tasks.content.read' | 'turns.submit' | 'turns.introduce' | 'approvals.decide'; state: 'allowed'; code: 'allowed' }
  | { capability: 'tasks.create' | 'tasks.content.read' | 'turns.submit' | 'turns.introduce' | 'approvals.decide'; state: 'denied'; code: 'user-denied' | 'policy-denied' }
  | { capability: 'tasks.create' | 'tasks.content.read' | 'turns.submit' | 'turns.introduce' | 'approvals.decide'; state: 'unavailable'; code: 'host-unavailable' | 'task-unavailable' | 'unsupported' }

interface AgentLoopResultBase {
  $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/agent-loop-result.v4.schema.json'
  contract: 'cordisx.agent-loop-result/v4'
  schemaVersion: 4
  commandId: AgentLoopOperationId
}

export type AgentLoopDeliveryDisposition = 'executed' | 'replayed' | 'reconciled'
export interface AgentLoopDelivery { disposition: AgentLoopDeliveryDisposition }

export type AgentLoopOperationUnavailableCode =
  | 'operation-conflict'
  | 'reconciliation-required'
  | 'operation-expired'
  | 'provider-replaced'

export type AgentLoopCreateOrBindUnavailableCode = 'details-unavailable' | AgentLoopOperationUnavailableCode
export type AgentLoopApprovalDecisionConflictCode = 'operation-conflict' | 'binding-conflict' | 'approval-conflict'
export type AgentLoopApprovalDecisionUnavailableCode =
  | 'reconciliation-required'
  | 'operation-expired'
  | 'provider-replaced'
  | 'binding-closed'
  | 'approval-expired'
  | 'approval-unavailable'
export type AgentLoopMemberSelfIntroductionConflictCode =
  | 'operation-conflict'
  | 'binding-conflict'
  | 'member-conflict'
  | 'run-conflict'
  | 'introduction-conflict'
  | 'introduction-completed'
  | 'introduction-cancelled'
export type AgentLoopMemberSelfIntroductionUnavailableCode =
  | 'reconciliation-required'
  | 'operation-expired'
  | 'provider-replaced'
  | 'binding-closed'
  | 'introduction-expired'
  | 'introduction-unavailable'
  | 'introduction-not-found'

type AgentLoopAllowedCreateOrBindAuthorization = Extract<AgentLoopAuthorizationOutcome, { state: 'allowed' }> & { capability: 'tasks.create' | 'tasks.content.read' }
type AgentLoopDeniedCreateOrBindAuthorization = Extract<AgentLoopAuthorizationOutcome, { state: 'denied' }> & { capability: 'tasks.create' | 'tasks.content.read' }
type AgentLoopUnavailableCreateOrBindAuthorization = Extract<AgentLoopAuthorizationOutcome, { state: 'unavailable' }> & { capability: 'tasks.create' | 'tasks.content.read' }
type AgentLoopAllowedSendAuthorization = Extract<AgentLoopAuthorizationOutcome, { state: 'allowed' }> & { capability: 'turns.submit' }
type AgentLoopDeniedSendAuthorization = Extract<AgentLoopAuthorizationOutcome, { state: 'denied' }> & { capability: 'turns.submit' }
type AgentLoopUnavailableSendAuthorization = Extract<AgentLoopAuthorizationOutcome, { state: 'unavailable' }> & { capability: 'turns.submit' }
type AgentLoopAllowedApprovalAuthorization = Extract<AgentLoopAuthorizationOutcome, { state: 'allowed' }> & { capability: 'approvals.decide' }
type AgentLoopDeniedApprovalAuthorization = Extract<AgentLoopAuthorizationOutcome, { state: 'denied' }> & { capability: 'approvals.decide' }
type AgentLoopUnavailableApprovalAuthorization = Extract<AgentLoopAuthorizationOutcome, { state: 'unavailable' }> & { capability: 'approvals.decide' }
type AgentLoopAllowedIntroductionAuthorization = Extract<AgentLoopAuthorizationOutcome, { state: 'allowed' }> & { capability: 'turns.introduce' }
type AgentLoopDeniedIntroductionAuthorization = Extract<AgentLoopAuthorizationOutcome, { state: 'denied' }> & { capability: 'turns.introduce' }
type AgentLoopUnavailableIntroductionAuthorization = Extract<AgentLoopAuthorizationOutcome, { state: 'unavailable' }> & { capability: 'turns.introduce' }

export type AgentLoopResult =
  | (AgentLoopResultBase & { type: 'create-or-bind'; status: 'accepted'; authorization: AgentLoopAllowedCreateOrBindAuthorization; binding: AgentLoopTaskBinding; detailsUrl: AgentLoopTaskDetailsUrl; delivery: AgentLoopDelivery })
  | (AgentLoopResultBase & { type: 'create-or-bind'; status: 'denied'; authorization: AgentLoopDeniedCreateOrBindAuthorization })
  | (AgentLoopResultBase & { type: 'create-or-bind'; status: 'unavailable'; authorization: AgentLoopUnavailableCreateOrBindAuthorization })
  | (AgentLoopResultBase & { type: 'create-or-bind'; status: 'unavailable'; authorization: AgentLoopAllowedCreateOrBindAuthorization; code: AgentLoopCreateOrBindUnavailableCode })
  | (AgentLoopResultBase & { type: 'send'; status: 'accepted'; authorization: AgentLoopAllowedSendAuthorization; binding: AgentLoopTaskBinding; messageId: string; turn: string; delivery: AgentLoopDelivery })
  | (AgentLoopResultBase & { type: 'send'; status: 'denied'; authorization: AgentLoopDeniedSendAuthorization })
  | (AgentLoopResultBase & { type: 'send'; status: 'unavailable'; authorization: AgentLoopUnavailableSendAuthorization })
  | (AgentLoopResultBase & { type: 'send'; status: 'unavailable'; authorization: AgentLoopAllowedSendAuthorization; code: AgentLoopOperationUnavailableCode })
  | (AgentLoopResultBase & { type: 'approval-decision'; status: 'accepted'; authorization: AgentLoopAllowedApprovalAuthorization; binding: AgentLoopTaskBinding; turn: string; approvalId: string; decision: AgentLoopApprovalDecision; causation: AgentLoopOperationCausation; delivery: AgentLoopDelivery })
  | (AgentLoopResultBase & { type: 'approval-decision'; status: 'conflict'; authorization: AgentLoopAllowedApprovalAuthorization; code: AgentLoopApprovalDecisionConflictCode })
  | (AgentLoopResultBase & { type: 'approval-decision'; status: 'denied'; authorization: AgentLoopDeniedApprovalAuthorization })
  | (AgentLoopResultBase & { type: 'approval-decision'; status: 'unavailable'; authorization: AgentLoopUnavailableApprovalAuthorization })
  | (AgentLoopResultBase & { type: 'approval-decision'; status: 'unavailable'; authorization: AgentLoopAllowedApprovalAuthorization; code: AgentLoopApprovalDecisionUnavailableCode })
  | (AgentLoopResultBase & { type: 'request-member-self-introduction'; status: 'accepted'; authorization: AgentLoopAllowedIntroductionAuthorization; binding: AgentLoopTaskBinding; participantId: string; memberId: string; runId: string; turn: string; messageId: string; causation: AgentLoopOperationCausation; delivery: AgentLoopDelivery })
  | (AgentLoopResultBase & { type: 'request-member-self-introduction'; status: 'conflict'; authorization: AgentLoopAllowedIntroductionAuthorization; code: AgentLoopMemberSelfIntroductionConflictCode })
  | (AgentLoopResultBase & { type: 'request-member-self-introduction'; status: 'denied'; authorization: AgentLoopDeniedIntroductionAuthorization })
  | (AgentLoopResultBase & { type: 'request-member-self-introduction'; status: 'unavailable'; authorization: AgentLoopUnavailableIntroductionAuthorization })
  | (AgentLoopResultBase & { type: 'request-member-self-introduction'; status: 'unavailable'; authorization: AgentLoopAllowedIntroductionAuthorization; code: AgentLoopMemberSelfIntroductionUnavailableCode })
  | (AgentLoopResultBase & { type: 'cancel-member-self-introduction'; status: 'accepted'; authorization: AgentLoopAllowedIntroductionAuthorization; binding: AgentLoopTaskBinding; participantId: string; memberId: string; runId: string; requestOperationId: AgentLoopOperationId; turn: string; messageId: string; causation: AgentLoopOperationCausation; delivery: AgentLoopDelivery })
  | (AgentLoopResultBase & { type: 'cancel-member-self-introduction'; status: 'conflict'; authorization: AgentLoopAllowedIntroductionAuthorization; code: AgentLoopMemberSelfIntroductionConflictCode })
  | (AgentLoopResultBase & { type: 'cancel-member-self-introduction'; status: 'denied'; authorization: AgentLoopDeniedIntroductionAuthorization })
  | (AgentLoopResultBase & { type: 'cancel-member-self-introduction'; status: 'unavailable'; authorization: AgentLoopUnavailableIntroductionAuthorization })
  | (AgentLoopResultBase & { type: 'cancel-member-self-introduction'; status: 'unavailable'; authorization: AgentLoopAllowedIntroductionAuthorization; code: AgentLoopMemberSelfIntroductionUnavailableCode })

export type AgentLoopCreateOrBindResult = Extract<AgentLoopResult, { type: 'create-or-bind' }>
export type AgentLoopSendResult = Extract<AgentLoopResult, { type: 'send' }>
export type AgentLoopApprovalDecisionResult = Extract<AgentLoopResult, { type: 'approval-decision' }>
export type AgentLoopRequestMemberSelfIntroductionResult = Extract<AgentLoopResult, { type: 'request-member-self-introduction' }>
export type AgentLoopCancelMemberSelfIntroductionResult = Extract<AgentLoopResult, { type: 'cancel-member-self-introduction' }>

interface AgentLoopEventBase {
  $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/agent-loop-event.v4.schema.json'
  contract: 'cordisx.agent-loop-event/v4'
  schemaVersion: 4
  eventId: string
  binding: AgentLoopBindingIdentity
  sequence: number
  occurredAt: string
  causation?: { operationId: AgentLoopOperationId }
  turn?: string
}

export type AgentLoopEvent =
  | (AgentLoopEventBase & { type: 'message'; message: { messageId: string; role: 'user' | 'assistant'; purpose: 'conversation'; content: readonly [AgentLoopContentPart, ...AgentLoopContentPart[]] } })
  | (AgentLoopEventBase & { type: 'message'; turn: string; causation: { operationId: AgentLoopOperationId }; message: { messageId: string; role: 'assistant'; purpose: 'member-self-introduction'; content: readonly [AgentLoopContentPart, ...AgentLoopContentPart[]] } })
  | (AgentLoopEventBase & {
    type: 'approval'
    turn: string
    approval: { approvalId: string; kind: 'command' | 'file-change' | 'external-action' | 'other'; state: 'pending' }
  })
  | (AgentLoopEventBase & {
    type: 'approval'
    turn: string
    approval: { approvalId: string; kind: 'command' | 'file-change' | 'external-action' | 'other'; state: 'resolved'; outcome: 'expired' }
  })
  | (AgentLoopEventBase & {
    type: 'approval'
    turn: string
    causation: { operationId: AgentLoopOperationId }
    approval: { approvalId: string; kind: 'command' | 'file-change' | 'external-action' | 'other'; state: 'resolved'; outcome: 'approved' | 'denied' | 'cancelled' }
  })
  | (AgentLoopEventBase & { type: 'lifecycle'; lifecycle: { phase: 'binding.created' | 'binding.bound' | 'turn.started' | 'turn.completed' | 'binding.closed' } | { phase: 'turn.failed'; failure: { code: string; retryable: boolean } } })
  | (AgentLoopEventBase & { type: 'lifecycle'; turn: string; causation: { operationId: AgentLoopOperationId }; lifecycle: { phase: 'turn.cancelled' } })

export interface AgentLoopEventSubscription {
  $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/agent-loop-event-subscription.v4.schema.json'
  contract: 'cordisx.agent-loop-event-subscription/v4'
  schemaVersion: 4
  subscriptionId: string
  binding: AgentLoopBindingIdentity
  afterSequence: number
  snapshotSequence: number
}

export interface AgentLoopEventPage {
  $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/agent-loop-event-page.v4.schema.json'
  contract: 'cordisx.agent-loop-event-page/v4'
  schemaVersion: 4
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
  readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/agent-loop-bound-client.v4.schema.json'
  readonly contract: 'cordisx.bound-agent-loop-client/v4'
  readonly schemaVersion: 4
  readonly durableLedger: {
    readonly operationId: 'commandId'
    readonly scope: 'owner-provider'
    readonly providerAffinity: 'generation-fenced'
    readonly survivesClientDispose: true
    readonly payloadMatch: 'structural-exact'
    readonly retention: { readonly active: 'logical-task-lifetime'; readonly recoveryDays: 30 }
  }
  createOrBind(command: Extract<AgentLoopCommand, { type: 'create-or-bind' }>): Promise<AgentLoopCreateOrBindResult>
  send(command: Extract<AgentLoopCommand, { type: 'send' }>): Promise<AgentLoopSendResult>
  decideApproval(command: Extract<AgentLoopCommand, { type: 'approval-decision' }>): Promise<AgentLoopApprovalDecisionResult>
  requestMemberSelfIntroduction(command: Extract<AgentLoopCommand, { type: 'request-member-self-introduction' }>): Promise<AgentLoopRequestMemberSelfIntroductionResult>
  cancelMemberSelfIntroduction(command: Extract<AgentLoopCommand, { type: 'cancel-member-self-introduction' }>): Promise<AgentLoopCancelMemberSelfIntroductionResult>
  subscribe(binding: AgentLoopTaskBinding, afterSequence: number): Promise<AgentLoopSubscribeRuntimeResult>
  dispose(): void
}
