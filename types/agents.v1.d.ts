import type {
  AgentCancelCause,
  MessageId,
  PluginOwnerIdentity,
  Session,
  SessionId,
  UserMessage,
} from './sessions.v1.js'
import type { AgentAvatarInheritanceMode, AgentAvatarRef } from './agent-avatar.v1.js'

export type AgentId = SessionId
export type AgentMutationId = string

/** Closed Host permission boundary. The caller principal is Host-bound, never request data. */
export type AgentRuntimeCapability =
  | 'agents.create'
  | 'agents.resume'
  | 'agents.get'
  | 'agents.message.submit'
  | 'agents.message.cancel'
  | 'agents.cancel'
  | 'agents.live.subscribe'
  | 'sessions.get'
  | 'sessions.read'
  | 'sessions.subscribe'
  | 'approvals.request'
  | 'approvals.answer'

export interface AgentDefinitionIdentity {
  readonly agentId: string
  readonly revision: string
}

export type AgentInheritanceMode = 'append' | 'prepend' | 'merge' | 'replace' | 'none'
export type AgentObjectInheritanceMode = 'merge' | 'replace' | 'none'

export interface AgentDefinition {
  readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/agent-definition.v1.schema.json'
  readonly contract: 'cordisx.agent-definition/v1'
  readonly schemaVersion: 1
  readonly identity: AgentDefinitionIdentity
  readonly name?: string
  readonly description?: string
  readonly avatar?: AgentAvatarRef
  readonly extends?: readonly AgentDefinitionIdentity[]
  readonly inherit: {
    readonly promptSections: AgentInheritanceMode
    readonly rules: AgentInheritanceMode
    readonly skills: AgentInheritanceMode
    readonly tools: AgentObjectInheritanceMode
    readonly mcpServers: AgentObjectInheritanceMode
    readonly runtimeDefaults: AgentObjectInheritanceMode
    readonly avatar?: AgentAvatarInheritanceMode
  }
  readonly promptSections?: readonly {
    readonly sectionId: string
    readonly kind: 'introduction' | 'personality' | 'role' | 'operations' | 'tools' | 'knowledge' | 'memory-policy' | 'memory' | 'other'
    readonly text: string
  }[]
  readonly rules?: readonly string[]
  readonly skills?: readonly string[]
  readonly tools?: { readonly include?: readonly string[]; readonly exclude?: readonly string[] }
  readonly mcpServers?: { readonly include?: readonly string[]; readonly exclude?: readonly string[] }
  readonly runtimeDefaults?: AgentRuntimeDefaults
}

export interface AgentRuntimeDefaults {
  readonly adapterId?: string
  readonly model?: { readonly providerId: string; readonly modelId: string }
  readonly effort?: 'low' | 'medium' | 'high' | 'xhigh'
}

/**
 * Data-only, business-neutral composition input. The Host runtime authority
 * resolves inheritance and registers tools/prompt sections before publication.
 */
export interface AgentSetup {
  readonly definition: AgentDefinitionIdentity
  readonly definitions: readonly [AgentDefinition, ...AgentDefinition[]]
}

/** Host-owned navigation identity. Plugins never receive or provide a raw URL. */
export interface AgentDetailReference {
  readonly kind: 'host'
  readonly ref: string
}

/** Merge-extensible creation options; the Host runtime authority owns interpretation. */
export interface AgentOptions {
  readonly provider?: string
  readonly model?: string
  readonly reasoningEffort?: string
  readonly maxTokens?: number
}

export type AgentStatus = 'idle' | 'running'

export type AgentStatusUnavailableCode =
  | 'whole-agent-idle-unobservable'
  | 'agent-replaced'
  | 'plugin-generation-replaced'
  | 'connection-replaced'
  | 'host-unavailable'

export type AgentStatusObservation =
  | { readonly status: 'available'; readonly value: AgentStatus }
  | { readonly status: 'unavailable'; readonly code: AgentStatusUnavailableCode }

export interface AgentInboxSnapshot {
  readonly nextTurn: readonly UserMessage[]
  readonly nextStep: readonly UserMessage[]
}

interface AgentAdmissionEnvelope {
  readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/agent-admission.v1.schema.json'
  readonly contract: 'cordisx.agent-admission/v1'
  readonly schemaVersion: 1
}

export type AgentAdmission = AgentAdmissionEnvelope & (
  | { readonly status: 'accepted'; readonly messageId: MessageId }
  | { readonly status: 'denied'; readonly messageId: MessageId; readonly code: 'permission-denied' | 'source-denied' }
  | {
    readonly status: 'unavailable'
    readonly messageId: MessageId
    readonly code: 'agent-replaced' | 'plugin-generation-replaced' | 'connection-replaced' | 'host-unavailable' | 'unsupported'
  })

export interface AgentCancelOptions {
  readonly keepInbox?: boolean
  /**
   * Optional idempotency identity for this message-less mutation only. It is
   * unrelated to any MessageId and establishes no output causation.
   */
  readonly mutationId?: AgentMutationId
}

interface AgentMutationResultEnvelope<O extends 'cancel' | 'dispose'> {
  readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/agent-mutation-result.v1.schema.json'
  readonly contract: 'cordisx.agent-mutation-result/v1'
  readonly schemaVersion: 1
  readonly operation: O
  readonly mutationId?: AgentMutationId
}

export type AgentMutationResult<O extends 'cancel' | 'dispose' = 'cancel' | 'dispose'> = AgentMutationResultEnvelope<O> & (
  | { readonly status: 'accepted' }
  | { readonly status: 'denied'; readonly code: 'permission-denied' | 'not-owner' }
  | {
    readonly status: 'unavailable'
    readonly code: 'agent-replaced' | 'plugin-generation-replaced' | 'connection-replaced' | 'host-unavailable' | 'unsupported'
  })

export type AgentIdleResult =
  | { readonly status: 'idle' }
  | { readonly status: 'unavailable'; readonly code: AgentStatusUnavailableCode }

/** Merge-extensible live-only notification vocabulary; never replayed or paged. */
export interface AgentLiveEventDataMap {
  'agent/created': Readonly<Record<string, never>>
  'agent/disposed': { readonly reason: 'owner-disposed' | 'runtime-disposed' | 'agent-replaced' | 'plugin-generation-replaced' | 'connection-replaced' }
  'agent/status': { readonly status: AgentStatus }
  'agent/inbox/inserted': { readonly message: UserMessage }
  'agent/inbox/claimed': { readonly message: UserMessage; readonly turn: number }
  'agent/inbox/discarded': { readonly message: UserMessage }
  'agent/session-start': { readonly source: 'startup' | 'resume' | 'clear' | 'compact' }
}

export type AgentLiveEventType = keyof AgentLiveEventDataMap & string

export type AgentLiveEvent<K extends AgentLiveEventType = AgentLiveEventType> = {
  [P in AgentLiveEventType]: {
    readonly type: P
    readonly agentId: AgentId
    readonly sessionId: SessionId
    readonly agentGeneration: number
    readonly time: number
    readonly data: AgentLiveEventDataMap[P]
  }
}[K]

export type AgentLiveEventObserver = (event: AgentLiveEvent) => void | Promise<void>

declare const agentCapability: unique symbol
declare const agentLiveSubscriptionCapability: unique symbol
declare const agentHandleCapability: unique symbol

export interface AgentLiveSubscription {
  readonly agentId: AgentId
  readonly agentGeneration: number
  readonly [agentLiveSubscriptionCapability]: never
  unsubscribe(): Promise<{ readonly status: 'closed'; readonly code: 'unsubscribed' | 'agent-replaced' | 'plugin-generation-replaced' | 'connection-replaced' | 'permission-revoked' }>
}

export type AgentLiveSubscribeResult =
  | { readonly status: 'subscribed'; readonly subscription: AgentLiveSubscription }
  | { readonly status: 'denied'; readonly code: 'permission-denied' }
  | { readonly status: 'unavailable'; readonly code: 'agent-replaced' | 'plugin-generation-replaced' | 'connection-replaced' | 'host-unavailable' | 'unsupported' }

/** One exact live Agent generation. `session` is the registry's same Session handle. */
export interface Agent {
  readonly id: AgentId
  readonly generation: number
  readonly options: AgentOptions
  readonly session: Session
  readonly inbox: AgentInboxSnapshot
  readonly status: AgentStatusObservation
  readonly detail?: AgentDetailReference
  readonly [agentCapability]: never

  /** Admission only. `message.id` is the sole public idempotency identity. */
  send(message: UserMessage, target: 'next-turn' | 'next-step', wakeup: boolean): Promise<AgentAdmission>
  followup(message: UserMessage): Promise<AgentAdmission>
  steer(message: UserMessage): Promise<AgentAdmission>
  inject(message: UserMessage): Promise<AgentAdmission>
  /** Cancel one still-pending inbox message. An already-claimed message is never treated as cancelled. */
  discard(messageId: MessageId): Promise<AgentMessageDiscardResult>
  cancel(cause: AgentCancelCause, options?: AgentCancelOptions): Promise<AgentMutationResult<'cancel'>>
  /** Never derives whole-agent idle from a completed turn. */
  whenIdle(): Promise<AgentIdleResult>
  /** Live only: no cursor, replay, event id, or durable history. */
  subscribe(observer: AgentLiveEventObserver): Promise<AgentLiveSubscribeResult>
}

interface AgentMessageDiscardEnvelope {
  readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/agent-message-cancellation-result.v1.schema.json'
  readonly contract: 'cordisx.agent-message-cancellation-result/v1'
  readonly schemaVersion: 1
}

export type AgentMessageDiscardResult = AgentMessageDiscardEnvelope & (
  | { readonly status: 'accepted'; readonly messageId: MessageId }
  | { readonly status: 'conflict'; readonly messageId: MessageId; readonly code: 'already-claimed' }
  | { readonly status: 'not-found'; readonly messageId: MessageId }
  | { readonly status: 'denied'; readonly messageId: MessageId; readonly code: 'permission-denied' }
  | {
    readonly status: 'unavailable'
    readonly messageId: MessageId
    readonly code: 'agent-replaced' | 'plugin-generation-replaced' | 'connection-replaced' | 'host-unavailable' | 'unsupported'
  })

export interface AgentCreateOptions {
  /** Omit for a Host-minted SessionId; caller-supplied ids require create authority. */
  readonly sessionId?: SessionId
  readonly options?: AgentOptions
  readonly setup?: AgentSetup
  /** Optional retry identity for create only; never a prompt/message identity. */
  readonly mutationId?: AgentMutationId
}

export interface AgentResumeOptions {
  readonly sessionId: SessionId
  readonly options?: AgentOptions
  readonly setup?: AgentSetup
  /** Optional retry identity for resume only; never a prompt/message identity. */
  readonly mutationId?: AgentMutationId
}

export interface AgentDisposeOptions {
  /** Optional retry identity for dispose only; never a prompt/message identity. */
  readonly mutationId?: AgentMutationId
}

export type AgentAcquireOperation = 'create' | 'resume'

interface AgentAcquireRequestEnvelope {
  readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/agent-acquire-request.v1.schema.json'
  readonly contract: 'cordisx.agent-acquire-request/v1'
  readonly schemaVersion: 1
}

export type AgentAcquireRequestDocument = AgentAcquireRequestEnvelope & (
  | ({ readonly type: 'create' } & AgentCreateOptions)
  | ({ readonly type: 'resume' } & AgentResumeOptions)
)

interface AgentAcquireResultEnvelope {
  readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/agent-acquire-result.v1.schema.json'
  readonly contract: 'cordisx.agent-acquire-result/v1'
  readonly schemaVersion: 1
  readonly operation: AgentAcquireOperation
  readonly mutationId?: AgentMutationId
}

export type AgentAcquireResultProjection = AgentAcquireResultEnvelope & (
  | {
    readonly status: 'accepted'
    readonly sessionId: SessionId
    readonly agentGeneration: number
    readonly sessionGeneration: number
    readonly owner: PluginOwnerIdentity
    readonly sessionIdSource: 'host' | 'caller'
    readonly disposition: 'created' | 'resumed' | 'replayed'
    readonly details?: AgentDetailReference
  }
  | { readonly status: 'denied'; readonly code: 'permission-denied' }
  | { readonly status: 'unavailable'; readonly code: 'runtime-unavailable' | 'session-unavailable' | 'host-unavailable' | 'unsupported' }
  | { readonly status: 'conflict'; readonly code: 'mutation-conflict' | 'session-already-exists' | 'agent-already-live' | 'setup-conflict' }
)

/** In-process result: the Host binds the accepted wire projection to an unforgeable owner handle. */
export type AgentAcquireResult =
  | (Extract<AgentAcquireResultProjection, { readonly status: 'accepted' }> & { readonly handle: AgentHandle })
  | Exclude<AgentAcquireResultProjection, { readonly status: 'accepted' }>

/**
 * Owner capability for one Agent generation. It is bound to the creating
 * plugin generation, cannot be serialized/reconstructed, and cannot be
 * obtained from AgentId/SessionId or `AgentRegistry.get()`.
 */
export interface AgentHandle {
  readonly agent: Agent
  readonly owner: PluginOwnerIdentity
  readonly [agentHandleCapability]: never
  dispose(options?: AgentDisposeOptions): Promise<AgentMutationResult<'dispose'>>
}

export interface AgentRegistry {
  /**
   * A missing sessionId is minted by the Host. A supplied id is caller-owned
   * input subject to authorization. Existing Session or live Agent identities
   * return a typed conflict and are never silently resumed.
   */
  create(options: AgentCreateOptions): Promise<AgentAcquireResult>
  /**
   * Concurrent first resume is deterministic: one mutation publishes the
   * Agent. The same owner generation replaying the same mutationId receives
   * `disposition: 'replayed'`; a distinct mutation receives
   * `agent-already-live`.
   */
  resume(options: AgentResumeOptions): Promise<AgentAcquireResult>
  /** Missing and unauthorized identities are intentionally indistinguishable; never returns dispose authority. */
  get(agentId: AgentId): Promise<Agent | undefined>
}
