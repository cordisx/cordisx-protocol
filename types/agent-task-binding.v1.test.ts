import type { AgentTaskApprovalHandlers, AgentTaskApprovals, AgentTaskOwnership } from './agent-task-binding.v1.js'
import type { AgentTaskCreateRequest } from './agent-task.v1.js'

declare const approvals: AgentTaskApprovals
declare const ownership: AgentTaskOwnership
declare const request: AgentTaskCreateRequest
const handlers = {
  resolveRequest(question, binding, signal) {
    binding.operationId satisfies string
    signal.aborted satisfies boolean
    // Explicit self-authority is an existing valid binding; human answer still required.
    return {
      $schema:
        'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/approval-request-routing-result.v1.schema.json',
      contract: 'cordisx.approval-request-routing-result/v1',
      schemaVersion: 1,
      routingId: question.routingId,
      registration: question.registration,
      status: 'accepted',
      code: 'routed',
      requester: question.requester,
      authority: question.requester,
    }
  },
  answerAuthority(question, binding, signal) {
    question.authority.definition.agentId satisfies string
    void binding.toolScope
    void signal
    return 'rejected'
  },
  answerLegacy(question) {
    question.sessionId satisfies string
    return 'unavailable'
  },
} satisfies AgentTaskApprovalHandlers
const dispose = approvals.register({ commandId: 'chatroom' }, handlers)
void approvals.createAndSubmit(request)
void approvals.recover({ operationId: request.operationId })
void ownership.acquire({ operationId: request.operationId }).then(result => {
  if (result.status === 'acquired') result.handle.agent.session.id satisfies string
})
dispose()
// @ts-expect-error ownership cannot accept a guessed Session identity
void ownership.acquire({ sessionId: 'guessed' })
// @ts-expect-error recovery cannot change context or definition
void approvals.recover({ operationId: 'operation', context: { kind: 'directory', cwd: '/other' } })
// @ts-expect-error arbitrary pre-submit callbacks are not part of the handler set
void approvals.register({ commandId: 'chatroom' }, { ...handlers, prepare: () => {} })
// @ts-expect-error mandatory requester/authority chain cannot be replaced by only legacy
void approvals.register({ commandId: 'chatroom' }, { answerLegacy: () => 'allowed-once' })
const inspectBinding: AgentTaskApprovalHandlers['answerAuthority'] = (question, binding) => {
  // @ts-expect-error no AgentHandle or pre-submit authority is provided
  void binding.handle
  void question
  return 'unavailable'
}
void inspectBinding
