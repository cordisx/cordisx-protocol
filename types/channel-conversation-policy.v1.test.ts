import type { ChannelManagerV3 } from './channel-manager.v3.js'
import type { ChannelManagerV4 } from './channel-manager.v4.js'
import type {
  ChannelConversationPolicyReadbackV1,
  ChannelConversationPolicyV1,
} from './channel-conversation-policy.v1.js'
import type { ChannelServiceConfigV2 } from './channel-service-config.v2.js'

declare const manager: ChannelManagerV4
const old: ChannelManagerV3 = manager
const policy: ChannelConversationPolicyV1 = {
  enabled: true,
  autoCreate: true,
  autoReply: true,
  groupReception: 'all',
  groups: [{
    id: 'operators',
    name: 'Operators',
    members: [{ adapterId: 'feishu', tenantId: 'tenant', userId: 'user' }],
  }],
  rules: [{ id: 'commands', action: 'command', effect: 'allow', userGroupIds: ['operators'], commands: ['bind'] }],
  wakePrefixes: [{ accountId: 'account', prefixes: ['wake'] }],
}
const read: Promise<ChannelConversationPolicyReadbackV1> = manager.conversationPolicy(new AbortController().signal)
void manager.configureConversationPolicy(new AbortController().signal)
void manager.connectionConfiguration('opaque-token', new AbortController().signal)
void manager.bindingPage({ connectionToken: 'opaque-token', limit: 50 }, new AbortController().signal)
// @ts-expect-error Pagination cannot supply another profile's bindings.
void manager.bindingPage({ connectionToken: 'opaque-token', profileId: 'other' }, new AbortController().signal)
// @ts-expect-error Policy mutation is Host-owned; no plugin draft can be passed here.
void manager.configureConversationPolicy(policy)
// @ts-expect-error Credentials are not part of the consumer policy.
policy.appSecret = 'not-an-account'
declare const configuration: ChannelServiceConfigV2
void configuration.connections[0]?.selectors
void old
void read
