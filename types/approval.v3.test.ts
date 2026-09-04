import type { Agent, AgentDefinitionIdentity } from './agents.v1.js'
import type {
  ApprovalAgentBinding,
  ApprovalRequestRoutingQuestion,
  ApprovalRequestRoutingResult,
  ApprovalService,
} from './approval.v3.js'

declare const approvals: ApprovalService
declare const reviewer: Agent
declare const lead: Agent
declare const reviewerDefinition: AgentDefinitionIdentity
declare const leadBinding: ApprovalAgentBinding

approvals.request({
  requester: { agent: reviewer, definition: reviewerDefinition },
  authority: { agent: lead, definition: leadBinding.definition },
  toolName: 'compatibility',
  reason: { kind: 'plain-text', text: 'Approval v2 remains available.' },
})

approvals.registerRequestResolver(
  { agent: reviewer, definition: reviewerDefinition },
  async (question, signal) => {
    question satisfies ApprovalRequestRoutingQuestion
    signal satisfies AbortSignal
    question.requester.sessionId satisfies string
    return {
      $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/approval-request-routing-result.v1.schema.json',
      contract: 'cordisx.approval-request-routing-result/v1',
      schemaVersion: 1,
      routingId: question.routingId,
      registration: question.registration,
      status: 'accepted',
      code: 'routed',
      requester: question.requester,
      authority: leadBinding,
    } satisfies ApprovalRequestRoutingResult
  },
).then(result => {
  if (result.status === 'registered') {
    result.handle.registration.requester.sessionId satisfies string
    result.handle.closed.then(closed => closed.code satisfies 'disposed' | 'requester-replaced' | 'plugin-generation-replaced' | 'permission-revoked' | 'connection-replaced')
  }
})

// @ts-expect-error registration requires an exact live requester Agent target
approvals.registerRequestResolver({ definition: reviewerDefinition }, async () => undefined)

declare const question: ApprovalRequestRoutingQuestion
// @ts-expect-error authority is an exact clone-safe live binding, not a name or definition alone
const malformedAuthority: ApprovalRequestRoutingResult = { $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/approval-request-routing-result.v1.schema.json', contract: 'cordisx.approval-request-routing-result/v1', schemaVersion: 1, routingId: question.routingId, registration: question.registration, status: 'accepted', code: 'routed', requester: question.requester, authority: { definition: reviewerDefinition } }
void malformedAuthority

// @ts-expect-error result status is closed
const unknownStatus: ApprovalRequestRoutingResult = { $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/approval-request-routing-result.v1.schema.json', contract: 'cordisx.approval-request-routing-result/v1', schemaVersion: 1, routingId: question.routingId, registration: question.registration, status: 'fallback', code: 'legacy' }
void unknownStatus
