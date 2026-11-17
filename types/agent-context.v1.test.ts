import type { AgentContextSampleV1, AgentContextV1 } from './agent-context.v1.js'
import type { AgentTurnControlV1 } from './agent-turn-control.v1.js'
import type { ChannelManagerV14 } from './channel-manager.v14.js'

declare const context: AgentContextV1
declare const control: AgentTurnControlV1
declare const manager: ChannelManagerV14
context.watch({ sessionId: 's', thresholdRatio: 0.119 }, event => {
  event.sample.budget.status satisfies 'resolved' | 'unavailable'
})
control.acquire({ sessionId: 's', turnId: 'exact' })
manager.mountContinuationDefaultsForm(document.body, { signal: new AbortController().signal })
const sample: AgentContextSampleV1 = {
  contract: 'cordisx.agent-context-sample/v1',
  sessionId: 's',
  sessionGeneration: 1,
  usedTokens: 40000,
  measurement: { source: 'provider-current-context', scope: 'native context total' },
  budget: { status: 'resolved', tokens: 80000, source: 'effective-configuration' },
  ratio: 0.5,
  observedAt: 1,
  expiresAt: 2,
  resetEpoch: 'r',
  configEpoch: 'c',
}
void sample
