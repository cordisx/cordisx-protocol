import type { ContinuationHistoryRequestV1, ConversationContinuationRequestV1 } from './conversation-continuation.v1.js'
const request: ConversationContinuationRequestV1 = {
  contract: 'cordisx.conversation-continuation-request/v1',
  operationId: 'op',
  logicalConversationId: 'logical',
  source: { hostId: 'local', appId: 'codex', profileId: 'personal', sessionId: 'source' },
  expectedRevision: 1,
  target: { providerId: 'target', model: 'example' },
  mode: 'linked',
  historyConsent: 'on-demand',
  handoffConsent: 'none',
  historyCategories: ['user-text', 'assistant-text'],
}
const history: ContinuationHistoryRequestV1 = { contract: 'cordisx.continuation-history-request/v1', limit: 4 }
void request
void history
