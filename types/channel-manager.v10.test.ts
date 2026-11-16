import type { ChannelManagerV9 } from './channel-manager.v9.js'
import type { ChannelManagerConversationActivityV1, ChannelManagerV10 } from './channel-manager.v10.js'

declare const manager: ChannelManagerV10
const older: ChannelManagerV9 = manager
void older
void manager.conversationPage({ connectionToken: 'opaque', limit: 100 }, new AbortController().signal)
void manager.conversationActivity({ conversationToken: 'opaque' }, new AbortController().signal)
void manager.conversationBindings({ conversationToken: 'opaque' }, new AbortController().signal)
void manager.conversationDetail('opaque', new AbortController().signal)
void manager.openBindingConversation('opaque', new AbortController().signal)
const pending: ChannelManagerConversationActivityV1 = {
  entryId: 'opaque',
  direction: 'outgoing',
  state: 'queued',
  occurredAt: '2026-11-16T00:00:00Z',
  text: 'Pending',
}
void pending
// @ts-expect-error Predecessors have no message-history authority.
void older.conversationActivity
