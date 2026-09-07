import type {
  AgentConversationMessageSource,
  AgentConversationRoomUserMessage,
} from './agent-conversation-shell.v11.js'
const source: AgentConversationMessageSource = {
  kind: 'room-user-message',
  roomId: 'room-1',
  messageId: 'message-2',
  sequence: 2,
}
const message: AgentConversationRoomUserMessage = {
  kind: 'message',
  itemId: 'message-1',
  messageId: 'message-2',
  sequence: 2,
  source,
  author: { participantId: 'user', role: 'human', displayName: { key: 'user', fallback: 'You' } },
  semantic: { purpose: 'conversation' },
  body: [{ kind: 'text', text: { key: 'message', fallback: 'hi' } }],
  reactions: [],
  timestamp: '2026-09-07T00:00:00Z',
  deliveryState: 'sent',
  runState: 'idle',
  ariaLive: 'off',
  actions: [],
}
// @ts-expect-error A Room human input is not an Agent execution source.
const agent: AgentConversationRoomUserMessage = { ...message, author: { ...message.author, role: 'agent' } }
void agent
