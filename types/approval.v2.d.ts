import type { Agent, AgentDefinitionIdentity, AgentId } from './agents.v1.js'
import type { ApprovalOutcome, ApprovalRequestId, SessionEvent, SessionId, ToolCallId } from './sessions.v1.js'

export type { ApprovalOutcome, ApprovalRequestId } from './sessions.v1.js'

/** A live handle plus the exact persisted definition identity the Host must verify. */
export interface ApprovalAgentTarget {
  readonly agent: Agent
  readonly definition: AgentDefinitionIdentity
}

/** Structured-clone-safe historical identity, captured while the Agent is live. */
export interface ApprovalAgentBinding {
  readonly agentId: AgentId
  readonly sessionId: SessionId
  readonly agentGeneration: number
  readonly definition: AgentDefinitionIdentity
}

export interface ApprovalReason {
  readonly kind: 'plain-text'
  /** Requester-authored text. Hosts render it literally, never as HTML. */
  readonly text: string
}

export interface ApprovalAuthorityBindingData {
  readonly approvalId: ApprovalRequestId
  readonly requester: AgentDefinitionIdentity
  readonly authority: AgentDefinitionIdentity
  readonly reason: ApprovalReason
}

declare module './sessions.v1.js' {
  interface SessionEventDataMap {
    'approval/authority-bound': ApprovalAuthorityBindingData
  }
}

export type ApprovalAuthorityBoundSessionEvent = SessionEvent<'approval/authority-bound'> & { readonly ignorable: true }

export interface ApprovalRequest {
  readonly requester: ApprovalAgentTarget
  readonly authority: ApprovalAgentTarget
  readonly toolName: string
  readonly callId?: ToolCallId
  readonly reason: ApprovalReason
  readonly signal?: AbortSignal
}

export interface ApprovalQuestion {
  readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/approval-question.v2.schema.json'
  readonly contract: 'cordisx.approval-question/v2'
  readonly schemaVersion: 2
  readonly id: ApprovalRequestId
  readonly requester: ApprovalAgentBinding
  readonly authority: ApprovalAgentBinding
  readonly toolName: string
  readonly callId?: ToolCallId
  readonly reason: ApprovalReason
}

export interface ApprovalDecision {
  readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/approval-decision.v2.schema.json'
  readonly contract: 'cordisx.approval-decision/v2'
  readonly schemaVersion: 2
  readonly id: ApprovalRequestId
  readonly requester: ApprovalAgentBinding
  readonly authority: ApprovalAgentBinding
  readonly outcome: ApprovalOutcome
}

export type ApprovalAnswerer = (question: ApprovalQuestion) => ApprovalOutcome | Promise<ApprovalOutcome>

declare const approvalAuthorityAnswererCapability: unique symbol

export interface ApprovalAuthorityAnswererHandle {
  readonly authority: ApprovalAgentBinding
  readonly [approvalAuthorityAnswererCapability]: never
  dispose(): Promise<{ readonly status: 'closed'; readonly code: 'disposed' | 'authority-replaced' | 'plugin-generation-replaced' | 'permission-revoked' | 'connection-replaced' }>
}

/**
 * One Host-owned ledger: a generation-free durable authority binding, asked,
 * and decided are appended in that order to the requester's Session. The
 * question and answerer are separately fenced by both exact live bindings,
 * never a display name, Room user, or current Agent lookup.
 */
export interface ApprovalService {
  request(request: ApprovalRequest): Promise<ApprovalDecision>
  registerAuthorityAnswerer(authority: ApprovalAgentTarget, answerer: ApprovalAnswerer): Promise<ApprovalAuthorityAnswererHandle>
}
