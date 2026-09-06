import type {
  AgentDetailNavigationRequest,
  AgentDetailNavigationService,
  AgentSessionDetailReferenceRequest,
  AgentSessionDetailReferenceService,
} from './agent-detail-navigation.v1.js'

declare const references: AgentSessionDetailReferenceService
declare const navigation: AgentDetailNavigationService
declare const referenceRequest: AgentSessionDetailReferenceRequest
declare const navigationRequest: AgentDetailNavigationRequest

references.get(referenceRequest).then((result) => {
  if (result.status === 'accepted') {
    result.target.kind satisfies 'host'
    navigation.open({ target: result.target })
  }
})
navigation.open(navigationRequest).then((result) => result.status satisfies 'accepted' | 'denied' | 'unavailable')

const invalid = {
  // @ts-expect-error detail navigation does not accept raw URLs
  target: { url: 'https://example.invalid/details', target: 'external' },
} satisfies AgentDetailNavigationRequest
void invalid
