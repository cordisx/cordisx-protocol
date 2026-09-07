import type { AgentConversationAssociatedSession, AgentConversationSelection } from './agent-conversation-shell.v12.js'
const unloaded: AgentConversationAssociatedSession = {
  participantId: 'agent',
  memberId: 'member',
  runId: 'run',
  sessionId: 'cx-session.original',
  state: 'unloaded',
}
const selection: AgentConversationSelection = {
  kind: 'room',
  roomId: 'room',
  title: { key: 'room', fallback: 'Room' },
  multiParticipant: false,
  participantPresentation: 'none',
  participants: [],
  associatedSessions: [unloaded],
}
void selection
// @ts-expect-error Unloaded association cannot claim a running lifecycle.
const running: AgentConversationAssociatedSession = { ...unloaded, state: 'running' }
void running
