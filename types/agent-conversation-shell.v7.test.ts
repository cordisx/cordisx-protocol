import type {
  AgentConversationActiveRunDescriptor,
  AgentConversationApprovalItem,
  AgentConversationComposerShortcutPolicy,
  AgentConversationMessageItem,
  AgentConversationParticipant,
  AgentConversationShellCommandContext,
  AgentConversationShellSnapshot,
  AgentConversationShellSubscriptionHandle,
} from './agent-conversation-shell.v7.js'

const author = {
  participantId: 'participant-reviewer',
  role: 'agent',
  displayName: { key: 'agent.reviewer', fallback: 'Reviewer' },
  agentIdentity: { agentId: 'reviewer', revision: '1' },
} satisfies AgentConversationParticipant

const activeRun = {
  participantId: author.participantId,
  memberId: 'member-reviewer',
  runId: 'run-reviewer',
  sessionId: 'session-reviewer',
  lifecycle: { phase: 'running' },
  details: { kind: 'host', ref: 'agent-detail-reviewer' },
} satisfies AgentConversationActiveRunDescriptor
activeRun.details.ref satisfies string

const authority = {
  participantId: 'participant-lead',
  memberId: 'member-lead',
  identity: { agentId: 'lead', revision: '3' },
} as const
const authorityBinding = {
  agentId: 'session-lead',
  sessionId: 'session-lead',
  agentGeneration: 7,
  definition: authority.identity,
} as const

const approval = {
  kind: 'approval',
  itemId: 'approval-item-1',
  sequence: 4,
  participantId: author.participantId,
  memberId: activeRun.memberId,
  runId: activeRun.runId,
  sessionId: activeRun.sessionId,
  agentGeneration: 2,
  approvalId: 'approval-1',
  approvalKind: 'command',
  requester: author.agentIdentity,
  authority,
  authorityBinding,
  reason: { kind: 'plain-text', text: 'Review this change.' },
  state: 'pending',
  actions: [
    { decision: 'approve', command: { id: 'chatroom.approval.approve', arguments: { approvalId: 'approval-1' } } },
    { decision: 'reject', command: { id: 'chatroom.approval.reject', arguments: { approvalId: 'approval-1' } } },
  ],
} satisfies AgentConversationApprovalItem
approval.agentGeneration satisfies number

const terminalApproval = {
  kind: 'approval',
  itemId: 'approval-item-terminal-1',
  sequence: 5,
  participantId: author.participantId,
  memberId: activeRun.memberId,
  runId: activeRun.runId,
  sessionId: activeRun.sessionId,
  approvalId: 'approval-1',
  approvalKind: 'command',
  requester: author.agentIdentity,
  authority,
  reason: approval.reason,
  state: 'approved',
  actions: [],
} satisfies AgentConversationApprovalItem

// @ts-expect-error pending approvals always require exact live Agent generation
const unboundPendingApproval: AgentConversationApprovalItem = { ...approval, agentGeneration: undefined }
// @ts-expect-error terminal approvals are immutable and cannot expose actions
const actionableTerminalApproval: AgentConversationApprovalItem = { ...terminalApproval, actions: approval.actions }

const approvalCommandContext = {
  binding: { bindingId: 'binding-v7', ownerGeneration: 'owner-v7' },
  generation: 'shell-v7',
  scope: 'approval',
  itemId: approval.itemId,
  command: approval.actions[0].command,
  approval: {
    sessionId: approval.sessionId,
    approvalId: approval.approvalId,
    requester: approval.requester,
    authority: approval.authorityBinding,
    decision: approval.actions[0].decision,
  },
} satisfies AgentConversationShellCommandContext
approvalCommandContext.approval.authority.agentGeneration satisfies number

const introduction = {
  kind: 'message',
  itemId: 'message-item-introduction-1',
  messageId: 'message-output-1',
  sequence: 5,
  source: { kind: 'session-event', sessionId: activeRun.sessionId, eventSeq: 17 },
  semantic: {
    purpose: 'member-self-introduction',
    correlation: { sessionId: activeRun.sessionId, requestMessageId: 'message-request-1' },
    participantId: author.participantId,
    memberId: activeRun.memberId,
    runId: activeRun.runId,
  },
  author,
  body: [{ kind: 'text', text: { key: 'message.introduction', fallback: 'Hello.' } }],
  reactions: [],
  timestamp: '2026-09-03T00:00:00.000Z',
  deliveryState: 'delivered',
  runState: 'idle',
  ariaLive: 'off',
  actions: [],
} satisfies AgentConversationMessageItem
introduction.source.eventSeq satisfies number
introduction.semantic.correlation.requestMessageId satisfies string

const shortcutPolicy = 'enter' satisfies AgentConversationComposerShortcutPolicy
const composerSnapshot = {
  binding: { bindingId: 'binding-v7', ownerGeneration: 'owner-v7' },
  generation: 'shell-v7',
  snapshotSequence: 0,
  selection: { kind: 'no-room' },
  items: [],
  composer: {
    availability: 'available',
    placeholder: { key: 'composer.placeholder', fallback: 'Message the room' },
    disabled: { value: false },
    shortcutPolicy,
    submit: { id: 'chatroom.message.submit' },
  },
  headerActions: [],
} satisfies AgentConversationShellSnapshot
composerSnapshot.composer.shortcutPolicy satisfies 'enter' | 'mod-enter'
// @ts-expect-error shortcut policies are a closed union
const unsupportedShortcut: AgentConversationComposerShortcutPolicy = 'shift-enter'

declare const subscription: AgentConversationShellSubscriptionHandle
subscription.closed.then(closed =>
  closed.code satisfies
    | 'unsubscribed'
    | 'explicit'
    | 'owner-disposed'
    | 'generation-replaced'
    | 'permission-revoked'
    | 'connection-replaced'
    | 'observer-failed'
)
subscription.unsubscribe().then(closed => closed.status satisfies 'closed')

const urlRun: AgentConversationActiveRunDescriptor = {
  ...activeRun,
  // @ts-expect-error v4 active runs expose no URL-shaped navigation value
  detailsUrl: { target: 'host', url: 'app://-/agent' },
}
// @ts-expect-error v4 approvals expose no AgentLoop binding
const boundApproval: AgentConversationApprovalItem = { ...approval, binding: { bindingId: 'binding-1', generation: 1 } }
// @ts-expect-error v4 approvals expose no AgentLoop turn
const turnedApproval: AgentConversationApprovalItem = { ...approval, turn: 'turn-1' }
// @ts-expect-error v4 messages cannot claim the legacy string source
const legacySource: AgentConversationMessageItem = { ...introduction, source: 'agent-loop' }
void [urlRun, boundApproval, turnedApproval, legacySource]

void [
  composerSnapshot,
  unsupportedShortcut,
  terminalApproval,
  unboundPendingApproval,
  actionableTerminalApproval,
  approvalCommandContext,
]
