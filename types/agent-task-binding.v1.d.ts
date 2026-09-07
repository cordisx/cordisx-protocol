import type { AgentHandle } from './agents.v1.js'
import type { AgentTaskCreateRequest, AgentTaskCreateResult, AgentTaskQueryRequest } from './agent-task.v1.js'
import type { ApprovalQuestion as LegacyApprovalQuestion } from './approval.v1.js'
import type { ApprovalQuestion } from './approval.v2.js'
import type { ApprovalRequestRoutingQuestion, ApprovalRequestRoutingResult } from './approval.v3.js'
import type { ApprovalOutcome, JsonValue } from './sessions.v1.js'

/** Host-frozen correlation, never CLI input or caller identity. */
export interface AgentTaskApprovalBinding {
  readonly operationId: string
  readonly toolScope: JsonValue
}

/** Handlers run only for real approval questions, never during task preparation. */
export interface AgentTaskApprovalHandlers {
  readonly resolveRequest: (
    question: ApprovalRequestRoutingQuestion,
    binding: AgentTaskApprovalBinding,
    signal: AbortSignal,
  ) => ApprovalRequestRoutingResult | Promise<ApprovalRequestRoutingResult>
  readonly answerAuthority: (
    question: ApprovalQuestion,
    binding: AgentTaskApprovalBinding,
    signal: AbortSignal,
  ) => ApprovalOutcome | Promise<ApprovalOutcome>
  readonly answerLegacy?: (
    question: LegacyApprovalQuestion,
    binding: AgentTaskApprovalBinding,
    signal: AbortSignal,
  ) => ApprovalOutcome | Promise<ApprovalOutcome>
}

/** Optional same-owner service. Registration installs no new approval policy. */
export interface AgentTaskApprovals {
  /** One registration per declared command and plugin generation. Duplicate registration is rejected. */
  register(command: { readonly commandId: string }, handlers: AgentTaskApprovalHandlers): () => void
  /** Requires a current registration; installs existing Agent-scoped approvals before first submission. */
  createAndSubmit(request: AgentTaskCreateRequest): Promise<AgentTaskCreateResult>
  /** Explicit recovery of known approval-install failure in the same live Session; never creates/resumes. */
  recover(request: AgentTaskQueryRequest): Promise<AgentTaskCreateResult>
}

export type AgentTaskOwnershipResult =
  | { readonly status: 'acquired'; readonly handle: AgentHandle }
  | {
      readonly status: 'unavailable'
      readonly code: 'permission-denied' | 'not-found' | 'not-accepted' | 'host-unavailable' | 'unsupported'
    }

/** Optional same-owner live capability acquisition, strictly after durable task acceptance. */
export interface AgentTaskOwnership {
  /** Returns the existing runtime-branded owner handle. No create, resume, native call or input submission. */
  acquire(request: AgentTaskQueryRequest): Promise<AgentTaskOwnershipResult>
}
