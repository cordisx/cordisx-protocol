import type { Agent } from './agents.v1.js'
import type { ApprovalOutcome, ApprovalRequestId, ToolCallId } from './sessions.v1.js'

export type { ApprovalOutcome, ApprovalRequestId } from './sessions.v1.js'

export interface ApprovalRequest {
  readonly agent: Agent
  readonly toolName: string
  readonly callId?: ToolCallId
  readonly reason?: string
  readonly signal?: AbortSignal
}

export interface ApprovalQuestion {
  readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/approval-question.v1.schema.json'
  readonly contract: 'cordisx.approval-question/v1'
  readonly schemaVersion: 1
  readonly id: ApprovalRequestId
  readonly agentId: string
  readonly sessionId: string
  readonly agentGeneration: number
  readonly toolName: string
  readonly callId?: ToolCallId
  readonly reason?: string
}

export interface ApprovalDecision {
  readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/approval-decision.v1.schema.json'
  readonly contract: 'cordisx.approval-decision/v1'
  readonly schemaVersion: 1
  /** Exact terminal identity of the corresponding question and SessionEvent pair. */
  readonly id: ApprovalRequestId
  readonly agentId: string
  readonly sessionId: string
  readonly agentGeneration: number
  readonly outcome: ApprovalOutcome
}

export type ApprovalAnswerer = (question: ApprovalQuestion) => ApprovalOutcome | Promise<ApprovalOutcome>

declare const approvalAnswererCapability: unique symbol

export interface ApprovalAnswererHandle {
  readonly agentId: string
  readonly agentGeneration: number
  readonly [approvalAnswererCapability]: never
  dispose(): Promise<{ readonly status: 'closed'; readonly code: 'disposed' | 'agent-replaced' | 'plugin-generation-replaced' | 'permission-revoked' }>
}

/**
 * Separate Agent-scoped approval service. `request()` appends exactly one
 * `approval/asked` and one `approval/decided` to the Agent's same Session.
 * Missing, throwing, invalid, stale, or non-owning answerers resolve
 * fail-closed as `unavailable`.
 */
export interface ApprovalService {
  request(request: ApprovalRequest): Promise<ApprovalDecision>
  registerAnswerer(agent: Agent, answerer: ApprovalAnswerer): Promise<ApprovalAnswererHandle>
}
