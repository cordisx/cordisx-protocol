import type { Agent } from './agents.v1.js'
import type { ApprovalService } from './approval.v1.js'

declare const agent: Agent
declare const approval: ApprovalService

approval.request({ agent, toolName: 'shell', callId: 'call-1', reason: 'writes files' })
approval.registerAnswerer(agent, question => {
  question.agentId satisfies typeof agent.id
  return 'allowed-once'
})

// @ts-expect-error approval outcomes are a closed fail-closed vocabulary
approval.registerAnswerer(agent, () => 'approved')
