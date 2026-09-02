import type {
  AgentLoopApprovalDecisionConflictCode,
  AgentLoopApprovalDecisionResult,
  AgentLoopApprovalDecisionUnavailableCode,
  AgentLoopCommand,
  AgentLoopEvent,
  AgentLoopMemberSelfIntroductionUnavailableCode,
  AgentLoopRequestMemberSelfIntroductionResult,
  AgentLoopCancelMemberSelfIntroductionResult,
  AgentLoopTaskBinding,
  BoundAgentLoopClient
} from '@cordisx/protocol/agent-loop/v4'

const binding = {
  $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/agent-loop-task-binding.v4.schema.json',
  contract: 'cordisx.agent-loop-task-binding/v4',
  schemaVersion: 4,
  binding: { bindingId: 'binding-1', generation: 4 },
  definition: { agentId: 'reviewer', revision: 'definition-1' },
  task: 'task-1',
  state: 'active'
} satisfies AgentLoopTaskBinding

const approvalCommand = {
  $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/agent-loop-command.v4.schema.json',
  contract: 'cordisx.agent-loop-command/v4',
  schemaVersion: 4,
  commandId: 'operation-approval-1',
  type: 'approval-decision',
  binding,
  turn: 'turn-1',
  approvalId: 'approval-1',
  decision: 'approved'
} satisfies AgentLoopCommand

const introductionCommand = {
  $schema: approvalCommand.$schema,
  contract: approvalCommand.contract,
  schemaVersion: approvalCommand.schemaVersion,
  commandId: 'operation-introduction-1',
  type: 'request-member-self-introduction',
  binding,
  participantId: 'participant-1',
  memberId: 'member-1',
  runId: 'run-1',
  intent: { kind: 'member-self-introduction', audience: 'room', output: 'assistant-message' }
} satisfies AgentLoopCommand
const cancelIntroductionCommand = {
  $schema: approvalCommand.$schema,
  contract: approvalCommand.contract,
  schemaVersion: approvalCommand.schemaVersion,
  commandId: 'operation-introduction-cancel-1',
  type: 'cancel-member-self-introduction',
  binding,
  participantId: introductionCommand.participantId,
  memberId: introductionCommand.memberId,
  runId: introductionCommand.runId,
  requestOperationId: introductionCommand.commandId
} satisfies AgentLoopCommand

const accepted = {
  $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/agent-loop-result.v4.schema.json',
  contract: 'cordisx.agent-loop-result/v4',
  schemaVersion: 4,
  commandId: approvalCommand.commandId,
  type: 'approval-decision',
  status: 'accepted',
  authorization: { capability: 'approvals.decide', state: 'allowed', code: 'allowed' },
  binding,
  turn: approvalCommand.turn,
  approvalId: approvalCommand.approvalId,
  decision: approvalCommand.decision,
  causation: { operationId: approvalCommand.commandId },
  delivery: { disposition: 'executed' }
} satisfies AgentLoopApprovalDecisionResult

const bindingConflictCode: AgentLoopApprovalDecisionConflictCode = 'binding-conflict'
const unavailableCode: AgentLoopApprovalDecisionUnavailableCode = 'binding-closed'
const introductionUnavailableCode: AgentLoopMemberSelfIntroductionUnavailableCode = 'binding-closed'
void bindingConflictCode
void unavailableCode
void introductionUnavailableCode
const conflict = {
  $schema: accepted.$schema,
  contract: accepted.contract,
  schemaVersion: accepted.schemaVersion,
  commandId: approvalCommand.commandId,
  type: 'approval-decision',
  status: 'conflict',
  authorization: { capability: 'approvals.decide', state: 'allowed', code: 'allowed' },
  code: 'approval-conflict'
} satisfies AgentLoopApprovalDecisionResult
const unavailable = { ...conflict, status: 'unavailable', code: 'reconciliation-required' } satisfies AgentLoopApprovalDecisionResult
const authorizationUnavailable = {
  $schema: accepted.$schema,
  contract: accepted.contract,
  schemaVersion: accepted.schemaVersion,
  commandId: approvalCommand.commandId,
  type: 'approval-decision',
  status: 'unavailable',
  authorization: { capability: 'approvals.decide', state: 'unavailable', code: 'host-unavailable' }
} satisfies AgentLoopApprovalDecisionResult
const denied = { ...authorizationUnavailable, status: 'denied', authorization: { capability: 'approvals.decide', state: 'denied', code: 'user-denied' } } satisfies AgentLoopApprovalDecisionResult
void accepted
void conflict
void unavailable
void authorizationUnavailable
void denied

const resolvedApproval = {
  $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/agent-loop-event.v4.schema.json',
  contract: 'cordisx.agent-loop-event/v4',
  schemaVersion: 4,
  eventId: 'event-approval-1',
  binding: binding.binding,
  sequence: 4,
  occurredAt: '2026-08-31T00:00:00.000Z',
  causation: { operationId: approvalCommand.commandId },
  type: 'approval',
  turn: approvalCommand.turn,
  approval: { approvalId: approvalCommand.approvalId, kind: 'command', state: 'resolved', outcome: 'approved' }
} satisfies AgentLoopEvent
const expiredApproval = { ...resolvedApproval, eventId: 'event-approval-expired', causation: undefined, approval: { ...resolvedApproval.approval, outcome: 'expired' } } satisfies AgentLoopEvent
void resolvedApproval
void expiredApproval

const acceptedIntroduction = {
  $schema: accepted.$schema,
  contract: accepted.contract,
  schemaVersion: accepted.schemaVersion,
  commandId: introductionCommand.commandId,
  type: 'request-member-self-introduction',
  status: 'accepted',
  authorization: { capability: 'turns.introduce', state: 'allowed', code: 'allowed' },
  binding,
  participantId: introductionCommand.participantId,
  memberId: introductionCommand.memberId,
  runId: introductionCommand.runId,
  turn: 'turn-introduction-1',
  messageId: 'message-introduction-1',
  causation: { operationId: introductionCommand.commandId },
  delivery: { disposition: 'executed' }
} satisfies AgentLoopRequestMemberSelfIntroductionResult
const acceptedIntroductionCancel = {
  ...acceptedIntroduction,
  commandId: cancelIntroductionCommand.commandId,
  type: 'cancel-member-self-introduction',
  requestOperationId: cancelIntroductionCommand.requestOperationId,
  causation: { operationId: cancelIntroductionCommand.commandId },
  delivery: { disposition: 'reconciled' }
} satisfies AgentLoopCancelMemberSelfIntroductionResult
const introductionBindingClosed = {
  $schema: accepted.$schema,
  contract: accepted.contract,
  schemaVersion: accepted.schemaVersion,
  commandId: introductionCommand.commandId,
  type: 'request-member-self-introduction',
  status: 'unavailable',
  authorization: { capability: 'turns.introduce', state: 'allowed', code: 'allowed' },
  code: 'binding-closed'
} satisfies AgentLoopRequestMemberSelfIntroductionResult
const introductionCancelBindingClosed = {
  ...introductionBindingClosed,
  commandId: cancelIntroductionCommand.commandId,
  type: 'cancel-member-self-introduction'
} satisfies AgentLoopCancelMemberSelfIntroductionResult
const introductionEvent = {
  $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/agent-loop-event.v4.schema.json',
  contract: 'cordisx.agent-loop-event/v4',
  schemaVersion: 4,
  eventId: 'event-introduction-1',
  binding: binding.binding,
  sequence: 5,
  occurredAt: '2026-08-31T00:00:01.000Z',
  causation: { operationId: introductionCommand.commandId },
  turn: acceptedIntroduction.turn,
  type: 'message',
  message: { messageId: acceptedIntroduction.messageId, role: 'assistant', purpose: 'member-self-introduction', content: [{ kind: 'text', text: 'Hello, I am Reviewer.' }] }
} satisfies AgentLoopEvent
void acceptedIntroduction
void acceptedIntroductionCancel
void introductionBindingClosed
void introductionCancelBindingClosed
void introductionEvent

declare const client: BoundAgentLoopClient
const decisionResult = await client.decideApproval(approvalCommand)
if (decisionResult.status === 'accepted') decisionResult.delivery.disposition satisfies 'executed' | 'replayed' | 'reconciled'
if (decisionResult.status === 'conflict') decisionResult.code satisfies 'operation-conflict' | 'binding-conflict' | 'approval-conflict'
const introductionResult = await client.requestMemberSelfIntroduction(introductionCommand)
if (introductionResult.status === 'accepted') introductionResult.messageId satisfies string
const introductionCancelResult = await client.cancelMemberSelfIntroduction(cancelIntroductionCommand)
if (introductionCancelResult.status === 'accepted') {
  introductionCancelResult.requestOperationId satisfies string
  introductionCancelResult.causation.operationId satisfies string
}

// @ts-expect-error approval-decision requires the full v4 task binding
const identityOnlyDecision: AgentLoopCommand = { ...approvalCommand, binding: binding.binding }
void identityOnlyDecision
// @ts-expect-error accepted decisions must echo delivery
const missingDelivery: AgentLoopApprovalDecisionResult = { ...accepted, delivery: undefined }
void missingDelivery
// @ts-expect-error accepted decisions require their own operation causation
const missingApprovalCausation: AgentLoopApprovalDecisionResult = { ...accepted, causation: undefined }
void missingApprovalCausation
// @ts-expect-error v4 approval decisions use terminal-state tokens
const imperativeApprovalDecision: AgentLoopCommand = { ...approvalCommand, decision: 'approve' }
void imperativeApprovalDecision
// @ts-expect-error approval decisions use approvals.decide authorization
const wrongApprovalAuthorization: AgentLoopApprovalDecisionResult = { ...accepted, authorization: { capability: 'turns.submit', state: 'allowed', code: 'allowed' } }
void wrongApprovalAuthorization
// @ts-expect-error decision-resolved approval events require operation causation
const uncorrelatedResolvedApproval: AgentLoopEvent = { ...resolvedApproval, causation: undefined }
void uncorrelatedResolvedApproval
// @ts-expect-error self-introduction requests cannot carry a hidden prompt/body/model
const promptedIntroduction: AgentLoopCommand = { ...introductionCommand, prompt: 'Introduce yourself' }
void promptedIntroduction
// @ts-expect-error self-introduction events must be assistant-authored
const userIntroductionEvent: AgentLoopEvent = { ...introductionEvent, message: { ...introductionEvent.message, role: 'user' } }
void userIntroductionEvent
// @ts-expect-error self-introduction events require the accepted turn
const turnlessIntroductionEvent: AgentLoopEvent = { ...introductionEvent, turn: undefined }
void turnlessIntroductionEvent
// @ts-expect-error self-introduction events require operation causation
const uncorrelatedIntroductionEvent: AgentLoopEvent = { ...introductionEvent, causation: undefined }
void uncorrelatedIntroductionEvent
// @ts-expect-error accepted self-introduction requests require command causation
const uncorrelatedAcceptedIntroduction: AgentLoopRequestMemberSelfIntroductionResult = { ...acceptedIntroduction, causation: undefined }
void uncorrelatedAcceptedIntroduction
// @ts-expect-error accepted self-introduction cancellations require their own command causation
const uncorrelatedAcceptedIntroductionCancel: AgentLoopCancelMemberSelfIntroductionResult = { ...acceptedIntroductionCancel, causation: undefined }
void uncorrelatedAcceptedIntroductionCancel
// @ts-expect-error cancellation is data-only and cannot carry AbortSignal
const abortableCancel: AgentLoopCommand = { ...cancelIntroductionCommand, signal: new AbortController().signal }
void abortableCancel
