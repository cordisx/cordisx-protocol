/**
 * CordisX public Session registry and append-only SessionEvent contract.
 *
 * Ordinary plugins receive read-only Session handles. The single Host-owned
 * Agent/Session Runtime is the only append authority.
 */

export type JsonPrimitive = string | number | boolean | null
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue }

export type SessionId = string
export type MessageId = string
export type ToolCallId = string
export type ApprovalRequestId = string
export type SessionSeq = number
export type SessionSeqCursor = SessionSeq | -1

/**
 * Immutable maximum-scope declaration for a capability bound to one Host route
 * instance. The Host resolves this template; callers never provide the value.
 */
export interface HostRouteSessionScopeBinding {
  readonly kind: 'host-route-param'
  readonly routeId: string
  readonly param: string
}

/** Manifest-only scope. Permission plans, decisions, and runtime handles use exact ids. */
export type SessionScopeDeclaration =
  | readonly [SessionId, ...SessionId[]]
  | HostRouteSessionScopeBinding

/** Exact runtime permission scope after any Host-owned binding is resolved. */
export interface ExactSessionScope {
  readonly sessionIds: readonly [SessionId, ...SessionId[]]
}

export interface PluginOwnerIdentity {
  readonly pluginId: string
  readonly generation: number
}

export interface TextBlock {
  readonly type: 'text'
  readonly text: string
}

export interface ReasoningBlock {
  readonly type: 'reasoning'
  readonly text: string
}

export interface ImageBlock {
  readonly type: 'image'
  readonly ref: string
  readonly mediaType: `image/${string}`
  readonly alt?: string
}

export interface ToolCallBlock {
  readonly type: 'tool-call'
  readonly id: ToolCallId
  readonly name: string
  readonly arguments: string
}

export interface ToolResultBlock {
  readonly type: 'tool-result'
  readonly toolCallId: ToolCallId
  readonly content: readonly ContentBlock[]
  readonly isError?: boolean
}

/** Merge-extensible model-content vocabulary. Extensions must remain lossless JSON. */
export interface ContentBlockMap {
  text: TextBlock
  reasoning: ReasoningBlock
  image: ImageBlock
  'tool-call': ToolCallBlock
  'tool-result': ToolResultBlock
}

export type ContentBlock = ContentBlockMap[keyof ContentBlockMap]

/**
 * Message provenance is a closed security boundary. A bound Host facade must
 * validate user authority and must stamp/validate the exact plugin generation;
 * consumers cannot claim another plugin or an obsolete generation.
 */
export type UserMessageSource =
  | { readonly kind: 'user' }
  | {
    readonly kind: 'plugin'
    readonly pluginId: string
    readonly generation: number
    readonly form?: 'instructions' | 'catalog' | 'snapshot' | 'notice' | 'relay' | 'recall'
    readonly summary?: string
    /**
     * Optional plugin-owned domain correlation preserved by replay. It links
     * the admitted message to domain intent; it never claims which assistant
     * message or turn terminal resulted from that input.
     */
    readonly correlation?: { readonly namespace: string; readonly id: string }
  }

export interface UserMessage {
  readonly id: MessageId
  readonly role: 'user'
  readonly content: readonly ContentBlock[]
  readonly source: UserMessageSource
}

export interface AssistantMessage {
  readonly id: MessageId
  readonly role: 'assistant'
  readonly content: readonly ContentBlock[]
  readonly source: {
    readonly kind: 'model'
    readonly provider: string
    readonly model: string
    readonly replayState?: JsonValue
  }
}

export interface ToolResultMessage {
  readonly id: MessageId
  readonly role: 'user'
  readonly content: readonly [ToolResultBlock]
  readonly source: { readonly kind: 'tool'; readonly callId: ToolCallId }
}

export interface LlmFailure {
  readonly message: string
  readonly code: string
  readonly status?: number
  readonly providerRetryAfterMs?: number
  readonly requestId?: string
}

export interface TokenUsage {
  readonly inputTokens: number
  readonly outputTokens: number
  readonly totalTokens?: number
  readonly cacheReadTokens?: number
  readonly cacheWriteTokens?: number
  readonly reasoningTokens?: number
}

export interface StreamChunkMap {
  'block-start': { readonly type: 'block-start'; readonly index: number; readonly blockType: keyof ContentBlockMap }
  'text-delta': { readonly type: 'text-delta'; readonly index: number; readonly text: string }
  'reasoning-delta': { readonly type: 'reasoning-delta'; readonly index: number; readonly text: string }
  'tool-call-delta': { readonly type: 'tool-call-delta'; readonly index: number; readonly id: ToolCallId; readonly name?: string; readonly argumentsDelta: string }
  'block-end': { readonly type: 'block-end'; readonly index: number; readonly block: ContentBlock }
  usage: { readonly type: 'usage'; readonly usage: TokenUsage }
  finish: { readonly type: 'finish'; readonly reason: FinishReason; readonly replayState?: JsonValue }
}

export type StreamChunk = StreamChunkMap[keyof StreamChunkMap]

/** Merge-extensible model finish vocabulary. */
export interface FinishReasonMap {
  stop: { readonly kind: 'stop' }
  'tool-calls': { readonly kind: 'tool-calls' }
  'max-tokens': { readonly kind: 'max-tokens' }
  aborted: { readonly kind: 'aborted'; readonly failure: LlmFailure }
  error: { readonly kind: 'error'; readonly failure: LlmFailure }
}

export type FinishReason = FinishReasonMap[keyof FinishReasonMap]

export type AgentCancelCause =
  | { readonly kind: 'user' }
  | { readonly kind: 'parent' }
  | { readonly kind: 'hook'; readonly reason: string }
  | { readonly kind: 'disposed' }

/** Merge-extensible durable turn termination vocabulary. */
export interface TurnEndReasonMap {
  completed: { readonly kind: 'completed' }
  aborted: { readonly kind: 'aborted'; readonly reason: AgentCancelCause }
  blocked: { readonly kind: 'blocked' }
  error: { readonly kind: 'error'; readonly error: LlmFailure }
  'max-tokens': { readonly kind: 'max-tokens' }
  interrupted: { readonly kind: 'interrupted' }
}

export type TurnEndReason = TurnEndReasonMap[keyof TurnEndReasonMap]

export interface RequestHeader {
  readonly config: {
    readonly provider: string
    readonly model: string
    readonly reasoningEffort?: string
    readonly temperature?: number
    readonly maxTokens?: number
    readonly stop?: readonly string[]
  }
  readonly system?: string
  readonly tools?: readonly {
    readonly name: string
    readonly description: string
    readonly parameters: Readonly<Record<string, JsonValue>>
  }[]
}

export type RequestHeaderReason = 'initial' | 'resume' | 'change' | 'series'

export type ApprovalOutcome = 'allowed-once' | 'rejected' | 'cancelled' | 'unavailable'

/**
 * Merge-extensible durable vocabulary. Declaration extensions must use
 * lossless-JSON data. Readers must reject an unknown required event; they may
 * skip an unknown event only when `ignorable: true` is present.
 */
export interface SessionEventDataMap {
  'turn/start': { readonly turn: number }
  'turn/end': { readonly turn: number; readonly reason: TurnEndReason }
  'step/start': { readonly turn: number; readonly step: number }
  'step/end': { readonly turn: number; readonly step: number }
  'user/message': UserMessage
  'assistant/chunk': { readonly turn: number; readonly step: number; readonly chunk: StreamChunk }
  'assistant/message': { readonly turn: number; readonly step: number; readonly message: AssistantMessage; readonly usage?: TokenUsage; readonly interrupted?: true }
  'tool/call': { readonly turn: number; readonly step: number; readonly callId: ToolCallId; readonly name: string; readonly arguments: string }
  'tool/result': {
    readonly turn: number
    readonly step: number
    readonly message: ToolResultMessage
    readonly error?: { readonly name: string; readonly code: string }
    readonly meta?: JsonValue
  }
  'request/header': { readonly header: RequestHeader; readonly reason: RequestHeaderReason; readonly startsSeries?: true }
  'request/context': { readonly provider: string; readonly model: string; readonly contextWindow?: number }
  'agent/inbox/spliced': {
    readonly target: 'next-turn' | 'next-step'
    readonly start: number
    readonly removedCount?: number
    readonly inserted: readonly UserMessage[]
    readonly outcome?: 'canceled'
  }
  'approval/asked': { readonly id: ApprovalRequestId; readonly toolName: string; readonly callId?: ToolCallId; readonly reason?: string }
  'approval/decided': { readonly id: ApprovalRequestId; readonly outcome: ApprovalOutcome }
  'session/end-seed': Readonly<Record<string, never>>
}

export type SessionEventType = keyof SessionEventDataMap & string

/** Merge-extensible list of event variants allowed on the ordered conversation surface. */
export interface SessionSurfaceEventTypeMap {
  'user/message': true
  'assistant/message': true
  'tool/result': true
}

export type SessionSurfaceEventType = keyof SessionSurfaceEventTypeMap & SessionEventType

export type SurfaceOp = 'append' | { readonly op: 'replace'; readonly start: SessionSeq; readonly end: SessionSeq }

type SessionEventBase<K extends SessionEventType> = {
  readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/session-event.v1.schema.json'
  readonly contract: 'cordisx.session-event/v1'
  readonly schemaVersion: 1
  readonly sessionId: SessionId
  readonly seq: SessionSeq
  readonly time: number
  readonly type: K
  readonly data: SessionEventDataMap[K]
  readonly ignorable?: true
}

export type SessionEvent<K extends SessionEventType = SessionEventType> = {
  [P in SessionEventType]: SessionEventBase<P> & (P extends SessionSurfaceEventType
    ? { readonly sourceEventSeqs?: readonly SessionSeq[]; readonly surfaceOp?: SurfaceOp }
    : { readonly sourceEventSeqs?: never; readonly surfaceOp?: never })
}[K]

export interface SessionHeader {
  readonly id: SessionId
  readonly formatVersion: number
  readonly createdAt: number
  readonly cwd?: string
  readonly parentSessionId?: SessionId
  readonly isSeeded: boolean
  readonly origin?: 'subagent'
  readonly delegationDepth?: number
  readonly agentPreset?: string
}

export interface SessionReadRequest {
  readonly afterSeq?: SessionSeqCursor
  readonly limit?: number
  /** Reuse the watermark returned by `snapshot()` or the first read page. */
  readonly snapshotSeq?: SessionSeqCursor
}

export interface SessionSnapshot {
  readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/session-snapshot.v1.schema.json'
  readonly contract: 'cordisx.session-snapshot/v1'
  readonly schemaVersion: 1
  readonly sessionId: SessionId
  readonly sessionGeneration: number
  readonly header: SessionHeader
  /** Highest event seq committed before this permission-filtered snapshot. */
  readonly snapshotSeq: SessionSeqCursor
}

export interface SessionEventPage {
  readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/session-event-page.v1.schema.json'
  readonly contract: 'cordisx.session-event-page/v1'
  readonly schemaVersion: 1
  readonly sessionId: SessionId
  readonly sessionGeneration: number
  readonly afterSeq: SessionSeqCursor
  /** Highest committed seq fixed for this read transaction. */
  readonly snapshotSeq: SessionSeqCursor
  readonly events: readonly SessionEvent[]
  readonly nextAfterSeq: SessionSeqCursor
  readonly hasMore: boolean
}

export type SessionUnavailableCode =
  | 'session-replaced'
  | 'route-replaced'
  | 'plugin-generation-replaced'
  | 'connection-replaced'
  | 'permission-revoked'
  | 'host-unavailable'
  | 'unknown-required-event'
  | 'unsupported'

export type SessionReadResult =
  | { readonly status: 'available'; readonly page: SessionEventPage }
  | { readonly status: 'unavailable'; readonly code: SessionUnavailableCode }

export type SessionSnapshotResult =
  | { readonly status: 'available'; readonly snapshot: SessionSnapshot }
  | { readonly status: 'unavailable'; readonly code: SessionUnavailableCode }

export interface SessionSubscribeRequest {
  readonly afterSeq?: SessionSeqCursor
  readonly pageSize?: number
}

export interface SessionSubscriptionPage {
  readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/session-subscription-page.v1.schema.json'
  readonly contract: 'cordisx.session-subscription-page/v1'
  readonly schemaVersion: 1
  readonly sessionId: SessionId
  readonly sessionGeneration: number
  readonly subscriptionGeneration: number
  /** Atomic watermark captured while the live observer is already fenced. */
  readonly replayThrough: SessionSeqCursor
  readonly phase: 'replay' | 'live'
  readonly events: readonly SessionEvent[]
}

export type SessionSubscriptionCloseCode =
  | 'unsubscribed'
  | 'session-replaced'
  | 'route-replaced'
  | 'plugin-generation-replaced'
  | 'connection-replaced'
  | 'permission-revoked'
  | 'host-unavailable'
  | 'unknown-required-event'
  | 'observer-failed'

export interface SessionSubscriptionClosed {
  readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/session-subscription-close.v1.schema.json'
  readonly contract: 'cordisx.session-subscription-close/v1'
  readonly schemaVersion: 1
  readonly sessionId: SessionId
  readonly sessionGeneration: number
  readonly subscriptionGeneration: number
  readonly status: 'closed'
  readonly code: SessionSubscriptionCloseCode
}

export type SessionEventObserver = (page: SessionSubscriptionPage) => void | Promise<void>

declare const sessionHandleCapability: unique symbol
declare const sessionSubscriptionCapability: unique symbol

export interface SessionSubscription {
  readonly sessionId: SessionId
  readonly sessionGeneration: number
  readonly subscriptionGeneration: number
  readonly replayThrough: SessionSeqCursor
  readonly [sessionSubscriptionCapability]: never
  /**
   * Resolves exactly once with the first terminal reason, including spontaneous
   * Host fencing. It never rejects. After resolution no observer invocation may
   * begin; consumers must still generation-fence an already-running observer.
   */
  readonly closed: Promise<SessionSubscriptionClosed>
  /** Idempotent; resolves to the same terminal value as `closed`. */
  unsubscribe(): Promise<SessionSubscriptionClosed>
}

export type SessionSubscribeResult =
  | { readonly status: 'subscribed'; readonly subscription: SessionSubscription }
  | { readonly status: 'unavailable'; readonly code: SessionUnavailableCode }

/** Permission-filtered read-only handle for one exact Session generation. */
export interface Session {
  readonly id: SessionId
  readonly generation: number
  readonly header: SessionHeader
  readonly [sessionHandleCapability]: never
  snapshot(): Promise<SessionSnapshotResult>
  read(request?: SessionReadRequest): Promise<SessionReadResult>
  /**
   * Registers the live fence before reading replay, captures `replayThrough`,
   * emits every replay event through that watermark, then emits live events in
   * strictly increasing contiguous seq order. No event may cross phases twice.
   */
  subscribe(request: SessionSubscribeRequest, observer: SessionEventObserver): Promise<SessionSubscribeResult>
}

export interface SessionRegistry {
  /** Missing and unauthorized identities are intentionally indistinguishable. */
  get(sessionId: SessionId): Promise<Session | undefined>
}
