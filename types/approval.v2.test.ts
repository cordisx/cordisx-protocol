import type { Agent, AgentDefinitionIdentity } from './agents.v1.js'
import type { ApprovalAgentBinding, ApprovalAuthorityBoundSessionEvent, ApprovalService } from './approval.v2.js'

declare const reviewer: Agent
declare const lead: Agent
declare const reviewerDefinition: AgentDefinitionIdentity
declare const leadDefinition: AgentDefinitionIdentity
declare const approvals: ApprovalService

approvals.request({
  requester: { agent: reviewer, definition: reviewerDefinition },
  authority: { agent: lead, definition: leadDefinition },
  toolName: 'review',
  reason: { kind: 'plain-text', text: 'Please review the proposed change.' },
})
approvals.registerAuthorityAnswerer({ agent: lead, definition: leadDefinition }, question => {
  question.requester.definition satisfies AgentDefinitionIdentity
  question.authority.definition satisfies AgentDefinitionIdentity
  question.reason.text satisfies string
  return 'allowed-once'
})

declare const binding: ApprovalAgentBinding
binding.agentId satisfies typeof binding.sessionId
declare const event: ApprovalAuthorityBoundSessionEvent
event.type satisfies 'approval/authority-bound'
event.ignorable satisfies true

// @ts-expect-error requester-authored reason is required
approvals.request({
  requester: { agent: reviewer, definition: reviewerDefinition },
  authority: { agent: lead, definition: leadDefinition },
  toolName: 'review',
})
approvals.request({
  requester: { agent: reviewer, definition: reviewerDefinition },
  // @ts-expect-error v2 has no default user or unbound identity authority
  authority: { definition: leadDefinition },
  toolName: 'review',
  reason: { kind: 'plain-text', text: 'Review.' },
})
// @ts-expect-error outcomes remain closed
approvals.registerAuthorityAnswerer({ agent: lead, definition: leadDefinition }, () => 'approved')
