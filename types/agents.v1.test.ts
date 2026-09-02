import type { Agent, AgentHandle, AgentRegistry, AgentRuntimeCapability } from './agents.v1.js'
import type { Session, UserMessage } from './sessions.v1.js'

declare const agents: AgentRegistry
declare const agent: Agent
declare const handle: AgentHandle
declare const session: Session
declare const message: UserMessage

agent.id satisfies typeof agent.session.id
agent.followup(message).then(result => result.messageId satisfies typeof message.id)
agent.steer(message)
agent.inject(message)
agent.send(message, 'next-step', false)
agent.discard(message.id)
agent.whenIdle()
agents.get(agent.id).then(value => value?.session satisfies Session | undefined)
handle.dispose({ mutationId: 'dispose-retry-1' })
agents.create({ mutationId: 'create-1' })
agents.resume({ sessionId: session.id, mutationId: 'resume-1' })
agents.resume({ sessionId: session.id, mutationId: 'resume-1' }).then(result => {
  if (result.status === 'accepted') {
    result.sessionId satisfies typeof result.handle.agent.id
    result.details?.ref satisfies string | undefined
  }
})
const readCapability: AgentRuntimeCapability = 'sessions.read'
void readCapability

// @ts-expect-error a bare Agent never grants the owner-only disposer
agent.dispose()
// @ts-expect-error a Session is not an AgentHandle
const forged: AgentHandle = session
void forged
