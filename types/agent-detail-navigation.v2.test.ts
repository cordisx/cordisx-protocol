import type { AgentDetailNavigationService, AgentSessionDetailReferenceService } from './agent-detail-navigation.v2.js'
import type { AgentDetailNavigationService as V1Navigation } from './agent-detail-navigation.v1.js'

declare const references: AgentSessionDetailReferenceService
declare const navigation: AgentDetailNavigationService
const frozen: V1Navigation = navigation
void frozen
async function openHistorical(): Promise<void> {
  const result = await references.getV2({ sessionId: 'known-session' })
  if (result.status === 'accepted') await navigation.openV2({ target: result.target })
  await references.get({ sessionId: 'current-session' })
  // @ts-expect-error caller cannot select another source
  await references.getV2({ sessionId: 'known-session', source: 'foreign' })
  // @ts-expect-error caller cannot provide a raw URL
  await navigation.openV2({ target: { kind: 'url', ref: 'https://example.invalid/' } })
  // @ts-expect-error v1 service cannot silently promise historical support
  await frozen.openV2({ target: { kind: 'host', ref: 'old' } })
}
void openHistorical
