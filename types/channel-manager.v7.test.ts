import type { ChannelManagerFormOutcomeV1, ChannelManagerV7 } from './channel-manager.v7.js'
import type { ManagerContentRecordSummaryV6 } from './manager-content-navigation.v6.js'
declare const manager: ChannelManagerV7
declare const target: HTMLElement
const options = {
  signal: new AbortController().signal,
  onResult: (result: ChannelManagerFormOutcomeV1) => result.status,
}
manager.mountCredentialForm('opaque', target, options)
manager.forOwnPageService()?.mountConversationReplyPolicyForm(target, options)
// @ts-expect-error No plugin-controlled policy writes.
manager.mountConversationReplyPolicyForm(target, { ...options, policy: {} })
// @ts-expect-error No secret return fields.
options.onResult({ status: 'applied', code: 'APPLIED', secret: 'private' })
const summary: ManagerContentRecordSummaryV6 = {
  leadingVisual: { kind: 'identity', icon: 'host:chat' },
  title: { namespace: 'consumer', key: 'title', fallback: 'Account' },
  metrics: [{
    id: 'pending',
    icon: 'host:chat',
    label: { namespace: 'consumer', key: 'pending', fallback: 'Pending' },
    tone: 'neutral',
    value: 0,
  }],
}
void summary
