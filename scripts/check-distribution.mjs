import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const expectedExports = [
  './agent-avatar/v1',
  './agent-conversation-shell/v1',
  './agent-conversation-shell/v2',
  './agent-conversation-shell/v3',
  './agent-conversation-shell/v4',
  './agent-conversation-shell/v5',
  './agent-loop/v1',
  './agent-loop/v2',
  './agent-loop/v3',
  './agent-loop/v4',
  './agents/v1',
  './entities/v1',
  './sessions/v1',
  './approval/v1',
  './connector-service/v1',
  './host-dom/v1',
  './manager-collection/v1',
  './manager-content-navigation/v1',
  './manager-content-navigation/v2',
  './manager-content-navigation/v3',
  './navigation-collection-actions/v1',
].sort()
const expectedFiles = [
  'LICENSE',
  'README.md',
  'package.json',
  'runtime/agent-avatar.v1.js',
  'schemas/README.md',
  ...readdirSync(join(root, 'schemas'), { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => `schemas/${entry.name}`),
  'types/agent-avatar.v1.d.ts',
  'types/agent-conversation-shell.v1.d.ts',
  'types/agent-conversation-shell.v2.d.ts',
  'types/agent-conversation-shell.v3.d.ts',
  'types/agent-conversation-shell.v4.d.ts',
  'types/agent-conversation-shell.v5.d.ts',
  'types/agent-loop.v1.d.ts',
  'types/agent-loop.v2.d.ts',
  'types/agent-loop.v3.d.ts',
  'types/agent-loop.v4.d.ts',
  'types/agents.v1.d.ts',
  'types/entities.v1.d.ts',
  'types/sessions.v1.d.ts',
  'types/approval.v1.d.ts',
  'types/connector-service.v1.d.ts',
  'types/host-dom.v1.d.ts',
  'types/manager-collection.v1.d.ts',
  'types/manager-content-navigation.v1.d.ts',
  'types/manager-content-navigation.v2.d.ts',
  'types/manager-content-navigation.v3.d.ts',
  'types/navigation-collection-actions.v1.d.ts',
].sort()
const frozenAgentLoopFiles = [
  ...readdirSync(join(root, 'schemas'))
    .filter((name) => /^agent-loop-.*\.v[123]\.schema\.json$/.test(name))
    .map((name) => `schemas/${name}`),
  'types/agent-loop.v1.d.ts',
  'types/agent-loop.v2.d.ts',
  'types/agent-loop.v3.d.ts',
].sort()
const frozenAgentLoopDigest = '8eff903c47166aa358d31cce8d9d8a1cfe693f3fe6558ac332006fe71cb6f852'

function run(command, arguments_, cwd = root) {
  const result = spawnSync(command, arguments_, { cwd, encoding: 'utf8' })
  if (result.status !== 0) throw new Error(`${command} ${arguments_.join(' ')} failed:\n${result.stdout}\n${result.stderr}`)
  return result.stdout
}

function packEntries(output) {
  const parsed = JSON.parse(output)
  const entries = Array.isArray(parsed) ? parsed : Object.values(parsed)
  if (entries.length !== 1 || entries[0] === null || typeof entries[0] !== 'object' || !Array.isArray(entries[0].files)) {
    throw new Error('expected exactly one npm pack result with a files array')
  }
  return entries
}

function fileDigest(directory, files) {
  const digest = createHash('sha256')
  for (const file of files) {
    digest.update(file)
    digest.update('\0')
    digest.update(readFileSync(join(directory, file)))
    digest.update('\0')
  }
  return digest.digest('hex')
}

if (fileDigest(root, frozenAgentLoopFiles) !== frozenAgentLoopDigest) throw new Error('frozen AgentLoop v1/v2/v3 package bytes drifted')

if (JSON.stringify(Object.keys(manifest.exports).sort()) !== JSON.stringify(expectedExports)) {
  throw new Error(`unexpected public exports: ${JSON.stringify(Object.keys(manifest.exports).sort())}`)
}

const temp = mkdtempSync(join(tmpdir(), 'cordisx-protocol-distribution-'))
try {
  const npmCli = process.env.npm_execpath ?? 'node_modules/npm/bin/npm-cli.js'
  const packed = packEntries(run(process.execPath, [npmCli, 'pack', '--dry-run', '--json', '--pack-destination', temp]))
  const actualFiles = packed[0].files.map((file) => file.path).sort()
  if (JSON.stringify(actualFiles) !== JSON.stringify(expectedFiles)) throw new Error(`unexpected publish contents: ${JSON.stringify(actualFiles)}`)

  const packedArchive = packEntries(run(process.execPath, [npmCli, 'pack', '--json', '--pack-destination', temp]))
  if (JSON.stringify(packedArchive[0].files.map((file) => file.path).sort()) !== JSON.stringify(expectedFiles)) throw new Error('actual pack contents drifted from dry-run')
  if (!packedArchive[0].integrity || !packedArchive[0].shasum) throw new Error('actual pack omitted integrity or shasum')
  const archive = join(temp, packedArchive[0].filename)
  const consumer = join(temp, 'consumer')
  run(process.execPath, [npmCli, 'install', '--ignore-scripts', '--no-package-lock', '--prefix', consumer, archive])
  writeFileSync(join(consumer, 'package.json'), '{"type":"module"}\n')
  writeFileSync(join(consumer, 'consumer.ts'), `import { canonicalizeAgentAvatarSeed, cloneAgentAvatarRef, createGeneratedAgentAvatarRef, resolveAgentDefinitionAvatar, type AgentAvatarRef, type AgentAvatarResolutionResult } from '@cordisx/protocol/agent-avatar/v1'
import type { BoundConnectorClient } from '@cordisx/protocol/connector-service/v1'
import type { AgentConversationParticipant as AgentConversationParticipantV1, AgentConversationShellSource as AgentConversationShellSourceV1 } from '@cordisx/protocol/agent-conversation-shell/v1'
import type { AgentConversationActiveRunDescriptor, AgentConversationItem, AgentConversationMemberPresenceItem, AgentConversationParticipant, AgentConversationReaction, AgentConversationShellSource } from '@cordisx/protocol/agent-conversation-shell/v2'
import type { AgentConversationApprovalAction, AgentConversationApprovalItem, AgentConversationMessageItem as AgentConversationMessageItemV3, AgentConversationMessageSemantic, AgentConversationParticipant as AgentConversationParticipantV3, AgentConversationRoomCollectionLeadingVisual, AgentConversationRoomCollectionParticipantRef, AgentConversationRoomDescription, AgentConversationRoomSettingsUpdateRequest, AgentConversationRoomSettingsUpdateResult, AgentConversationSelection as AgentConversationSelectionV3, AgentConversationShellCommandContext as AgentConversationShellCommandContextV3, AgentConversationShellSource as AgentConversationShellSourceV3 } from '@cordisx/protocol/agent-conversation-shell/v3'
import type { AgentConversationActiveRunDescriptor as AgentConversationActiveRunDescriptorV4, AgentConversationApprovalItem as AgentConversationApprovalItemV4, AgentConversationMessageItem as AgentConversationMessageItemV4, AgentConversationShellSubscriptionHandle as AgentConversationShellSubscriptionHandleV4 } from '@cordisx/protocol/agent-conversation-shell/v4'
import type { AgentConversationComposerShortcutPolicy, AgentConversationShellSnapshot as AgentConversationShellSnapshotV5, AgentConversationShellSubscriptionHandle as AgentConversationShellSubscriptionHandleV5 } from '@cordisx/protocol/agent-conversation-shell/v5'
import type { AgentLoopCommand as AgentLoopCommandV1, BoundAgentLoopClient as BoundAgentLoopClientV1 } from '@cordisx/protocol/agent-loop/v1'
import type { AgentDefinition, AgentLoopCreateOrBindUnavailableCode, AgentLoopDelivery, AgentLoopDeliveryDisposition, AgentLoopEvent as AgentLoopEventV2, AgentLoopOperationId, AgentLoopOperationUnavailableCode, BoundAgentLoopClient } from '@cordisx/protocol/agent-loop/v2'
import type { AgentLoopApprovalDecision, AgentLoopApprovalDecisionConflictCode, AgentLoopApprovalDecisionUnavailableCode, AgentLoopCancelMemberSelfIntroductionResult, AgentLoopCommand as AgentLoopCommandV3, AgentLoopEvent as AgentLoopEventV3, AgentLoopMemberSelfIntroductionConflictCode, AgentLoopMemberSelfIntroductionIntent, AgentLoopMemberSelfIntroductionUnavailableCode, AgentLoopRequestMemberSelfIntroductionResult, AgentLoopTaskBinding as AgentLoopTaskBindingV3, BoundAgentLoopClient as BoundAgentLoopClientV3 } from '@cordisx/protocol/agent-loop/v3'
import type { AgentLoopApprovalDecisionResult as AgentLoopApprovalDecisionResultV4, AgentLoopApprovalDecisionUnavailableCode as AgentLoopApprovalDecisionUnavailableCodeV4, AgentLoopCancelMemberSelfIntroductionResult as AgentLoopCancelMemberSelfIntroductionResultV4, AgentLoopCommand as AgentLoopCommandV4, AgentLoopCreateOrBindResult as AgentLoopCreateOrBindResultV4, AgentLoopEvent as AgentLoopEventV4, AgentLoopMemberSelfIntroductionUnavailableCode as AgentLoopMemberSelfIntroductionUnavailableCodeV4, AgentLoopRequestMemberSelfIntroductionResult as AgentLoopRequestMemberSelfIntroductionResultV4, AgentLoopSendResult as AgentLoopSendResultV4, AgentLoopTaskBinding as AgentLoopTaskBindingV4, BoundAgentLoopClient as BoundAgentLoopClientV4 } from '@cordisx/protocol/agent-loop/v4'
import type { Agent, AgentRegistry } from '@cordisx/protocol/agents/v1'
import type { EntityBackedAgentRegistry, EntityDefinitionBoundSessionEvent, EntityFile, EntityRegistry } from '@cordisx/protocol/entities/v1'
import type { ManagerContentNavigationDeclarationV3, ManagerContentProjectionV2 } from '@cordisx/protocol/manager-content-navigation/v3'
import type { ApprovalService } from '@cordisx/protocol/approval/v1'
import type { Session, SessionEvent, SessionRegistry, UserMessage } from '@cordisx/protocol/sessions/v1'
import type { BoundHostDomClient } from '@cordisx/protocol/host-dom/v1'
const avatar = createGeneratedAgentAvatarRef({ namespace: 'agent-definition', agentId: 'reviewer' })
const canonical = canonicalizeAgentAvatarSeed({ namespace: 'agent-definition', agentId: ' reviewer ' })
const cloned = cloneAgentAvatarRef(avatar)
const effective = resolveAgentDefinitionAvatar({ agentId: 'reviewer', inherit: 'none' })
avatar satisfies AgentAvatarRef
declare const resolution: AgentAvatarResolutionResult
declare const definition: AgentDefinition
declare const participant: AgentConversationParticipant
declare const activeRun: AgentConversationActiveRunDescriptor
declare const item: AgentConversationItem
declare const presence: AgentConversationMemberPresenceItem
declare const reaction: AgentConversationReaction
declare const connector: BoundConnectorClient
declare const shell: AgentConversationShellSource
declare const legacyShell: AgentConversationShellSourceV1
declare const shellV3: AgentConversationShellSourceV3
declare const shellSubscriptionV4: AgentConversationShellSubscriptionHandleV4
declare const shellSubscriptionV5: AgentConversationShellSubscriptionHandleV5
declare const agentLoop: BoundAgentLoopClient
declare const legacyAgentLoop: BoundAgentLoopClientV1
declare const agentLoopV3: BoundAgentLoopClientV3
declare const approvalBindingV3: AgentLoopTaskBindingV3
declare const agentLoopV4: BoundAgentLoopClientV4
declare const bindingV4: AgentLoopTaskBindingV4
declare const agents: AgentRegistry
declare const entityAgents: EntityBackedAgentRegistry
declare const entities: EntityRegistry
declare const sessions: SessionRegistry
declare const approvals: ApprovalService
declare const agent: Agent
declare const session: Session
declare const userMessage: UserMessage
declare const entityBoundEvent: EntityDefinitionBoundSessionEvent
declare const managerNavigationV3: ManagerContentNavigationDeclarationV3
declare const managerProjectionV2: ManagerContentProjectionV2
const entityFile = { $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/entity-file.v1.schema.json', contract: 'cordisx.entity-file/v1', schemaVersion: 1, agentId: 'reviewer', inherit: { promptSections: 'append', rules: 'append', skills: 'append', tools: 'merge', mcpServers: 'merge', runtimeDefaults: 'merge' }, promptSections: [{ sectionId: 'role', kind: 'role', source: { kind: 'markdown', path: './prompts/role.md' } }] } satisfies EntityFile
entities.get({ agentId: entityFile.agentId, revision: entityBoundEvent.data.resolution.digest })
managerNavigationV3.subject?.kind satisfies 'agent-definition' | undefined
managerProjectionV2.recordSummary?.leadingVisual.kind satisfies 'agent-avatar' | undefined
entityAgents.create({ definition: entityBoundEvent.data.resolution.identity, mutationId: 'create-entity-installed-consumer' })
entityAgents.resume({ sessionId: entityBoundEvent.sessionId, definitionSource: 'session-persisted' })
const shellRunV4 = { participantId: 'participant-v4', memberId: 'member-v4', runId: 'run-v4', sessionId: 'session-v4', lifecycle: { phase: 'running' }, details: { kind: 'host', ref: 'agent-detail-v4' } } satisfies AgentConversationActiveRunDescriptorV4
const shellApprovalV4 = { kind: 'approval', itemId: 'approval-item-v4', sequence: 1, participantId: shellRunV4.participantId, memberId: shellRunV4.memberId, runId: shellRunV4.runId, sessionId: shellRunV4.sessionId, agentGeneration: 1, approvalId: 'approval-v4', approvalKind: 'command', state: 'pending', actions: [{ decision: 'approve', command: { id: 'approval.accept' } }] } satisfies AgentConversationApprovalItemV4
declare const shellMessageV4: AgentConversationMessageItemV4
shellMessageV4.source.kind satisfies 'session-event' | 'chatroom-acknowledgement'
shellSubscriptionV4.closed.then(value => value.status satisfies 'closed')
const shellShortcut = 'mod-enter' satisfies AgentConversationComposerShortcutPolicy
declare const shellSnapshotV5: AgentConversationShellSnapshotV5
shellSnapshotV5.composer.shortcutPolicy satisfies 'enter' | 'mod-enter'
shellSnapshotV5.composer.submit.id satisfies string
shellShortcut satisfies 'mod-enter'
shellSubscriptionV5.closed.then(value => value.status satisfies 'closed')
declare const createCommand: Parameters<BoundAgentLoopClient['createOrBind']>[0]
declare const sendCommand: Parameters<BoundAgentLoopClient['send']>[0]
declare const hostDom: BoundHostDomClient
agents.create({ mutationId: 'create-installed-consumer' })
agents.resume({ sessionId: session.id, mutationId: 'resume-installed-consumer' })
agents.get(agent.id)
sessions.get(session.id)
session.snapshot().then(result => { if (result.status === 'available') void session.read({ afterSeq: -1, snapshotSeq: result.snapshot.snapshotSeq }) })
session.subscribe({ afterSeq: -1 }, page => { page.events satisfies readonly SessionEvent[] })
agent.followup(userMessage)
agent.steer(userMessage)
agent.inject(userMessage)
agent.discard(userMessage.id)
agent.cancel({ kind: 'user' })
agent.whenIdle()
approvals.request({ agent, toolName: 'shell' })
const discovered = await connector.discover()
if (discovered.status === 'accepted') discovered.snapshot.registrations satisfies readonly unknown[]
if (resolution.status === 'unsupported') resolution.code satisfies 'unsupported-kind' | 'unsupported-provider' | 'reference-unavailable'
definition.avatar satisfies AgentAvatarRef | undefined
participant.avatar satisfies AgentAvatarRef | undefined
if (participant.role === 'agent') participant.agentIdentity?.agentId satisfies string | undefined
activeRun.detailsUrl.target satisfies 'host' | 'external'
if (item.kind === 'message') {
  item.source satisfies 'agent-loop' | 'chatroom-acknowledgement'
  for (const value of item.reactions) value.state satisfies 'pending' | 'completed' | 'failed'
}
presence.state satisfies 'inviting' | 'creating' | 'joined' | 'ready' | 'failed'
reaction.actorParticipantId satisfies string
if (reaction.value.kind === 'emoji') reaction.value.emoji satisfies string
else reaction.value.token satisfies string
createCommand.commandId satisfies AgentLoopOperationId
sendCommand.commandId satisfies AgentLoopOperationId
agentLoop.durableLedger.operationId satisfies 'commandId'
agentLoop.durableLedger.scope satisfies 'owner-provider'
agentLoop.durableLedger.providerAffinity satisfies 'generation-fenced'
agentLoop.durableLedger.survivesClientDispose satisfies true
agentLoop.durableLedger.payloadMatch satisfies 'structural-exact'
agentLoop.durableLedger.retention.active satisfies 'logical-task-lifetime'
agentLoop.durableLedger.retention.recoveryDays satisfies 30
const installedDelivery = { disposition: 'reconciled' } satisfies AgentLoopDelivery
installedDelivery.disposition satisfies AgentLoopDeliveryDisposition
const installedEvent = {
  $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/agent-loop-event.v2.schema.json',
  contract: 'cordisx.agent-loop-event/v2',
  schemaVersion: 2,
  eventId: 'installed-event',
  binding: { bindingId: 'installed-binding', generation: 1 },
  sequence: 0,
  occurredAt: '2026-08-31T00:00:00.000Z',
  causation: { operationId: createCommand.commandId },
  type: 'lifecycle',
  lifecycle: { phase: 'binding.created' },
} satisfies AgentLoopEventV2
installedEvent.causation.operationId satisfies AgentLoopOperationId
const legacyCreate = {
  $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/agent-loop-command.v1.schema.json',
  contract: 'cordisx.agent-loop-command/v1',
  schemaVersion: 1,
  commandId: 'legacy-create',
  type: 'create-or-bind',
  definition: definition.identity,
  definitions: [definition],
  target: { mode: 'create' },
} satisfies AgentLoopCommandV1
const legacyParticipant = {
  participantId: 'legacy-participant',
  role: 'agent',
  displayName: { key: 'legacy.agent', fallback: 'Legacy Agent' },
} satisfies AgentConversationParticipantV1
const emptyRoomDescription = { state: 'empty' } satisfies AgentConversationRoomDescription
const presentRoomDescription = { state: 'present', text: { key: 'room.description', fallback: 'Protocol room introduction' } } satisfies AgentConversationRoomDescription
const roomSelectionV3 = {
  kind: 'room',
  roomId: 'room-installed-consumer',
  title: { key: 'room.title', fallback: 'Protocol room' },
  description: emptyRoomDescription,
  multiParticipant: true,
  participantPresentation: 'host-initials',
  participants: [],
} satisfies AgentConversationSelectionV3
roomSelectionV3.description.state satisfies 'empty'
presentRoomDescription.text.fallback satisfies string
const roomSelectionWithDescriptionV3 = { ...roomSelectionV3, description: presentRoomDescription } satisfies AgentConversationSelectionV3
roomSelectionWithDescriptionV3.description.text.fallback satisfies string
const newRoomLeadingVisual = { kind: 'semantic-icon', icon: 'host:action.add' } satisfies AgentConversationRoomCollectionLeadingVisual
newRoomLeadingVisual.icon satisfies \`host:\${string}\`
const zeroRoomParticipants = [] as const satisfies readonly AgentConversationRoomCollectionParticipantRef[]
zeroRoomParticipants.length satisfies 0
const emptyRoomComposite = { kind: 'room-composite-avatar', roomId: roomSelectionV3.roomId, participants: zeroRoomParticipants } satisfies AgentConversationRoomCollectionLeadingVisual
emptyRoomComposite.roomId satisfies string
emptyRoomComposite.participants.length satisfies 0
const fiveRoomParticipants = [
  { participantId: 'participant-installed-1', avatar },
  { participantId: 'participant-installed-2', avatar },
  { participantId: 'participant-installed-3', avatar },
  { participantId: 'participant-installed-4', avatar },
  { participantId: 'participant-installed-5', avatar },
] as const satisfies readonly AgentConversationRoomCollectionParticipantRef[]
fiveRoomParticipants.length satisfies 5
const populatedRoomComposite = { kind: 'room-composite-avatar', roomId: roomSelectionV3.roomId, participants: fiveRoomParticipants } satisfies AgentConversationRoomCollectionLeadingVisual
populatedRoomComposite.roomId satisfies string
for (const participantVisual of populatedRoomComposite.participants) {
  participantVisual.participantId satisfies string
  participantVisual.avatar satisfies AgentAvatarRef
}
const shellApprovalAction = { decision: 'approve', command: { id: 'chatroom.approval.approve', arguments: { approvalId: 'approval-installed-consumer' } } } satisfies AgentConversationApprovalAction
shellApprovalAction.decision satisfies AgentLoopApprovalDecision
shellApprovalAction.command.id satisfies string
const shellApprovalItem = {
  kind: 'approval',
  itemId: 'approval-item-installed-consumer',
  sequence: 9,
  participantId: 'participant-installed-1',
  memberId: 'member-installed-1',
  runId: 'run-installed-1',
  binding: { bindingId: 'binding-installed-consumer', generation: 3 },
  turn: 'turn-installed-consumer',
  approvalId: 'approval-installed-consumer',
  approvalKind: 'command',
  state: 'pending',
  rationale: { key: 'approval.command', fallback: 'Allow this command?' },
  actions: [shellApprovalAction],
} satisfies AgentConversationApprovalItem
shellApprovalItem.participantId satisfies string
shellApprovalItem.memberId satisfies string
shellApprovalItem.runId satisfies string
shellApprovalItem.binding.generation satisfies number
shellApprovalItem.turn satisfies string
shellApprovalItem.approvalId satisfies string
shellApprovalItem.approvalKind satisfies 'command'
shellApprovalItem.actions[0].command.id satisfies string
const shellApprovalCommandContext = {
  binding: { bindingId: 'shell-binding-installed-consumer', ownerGeneration: 'owner-generation-installed-consumer' },
  generation: 'shell-generation-installed-consumer',
  scope: 'approval',
  itemId: shellApprovalItem.itemId,
  command: shellApprovalAction.command,
} satisfies AgentConversationShellCommandContextV3
shellApprovalCommandContext.scope satisfies 'approval'
shellApprovalCommandContext.itemId satisfies string
shellApprovalCommandContext.command.id satisfies string
// @ts-expect-error approval command contexts expose no private callback
shellApprovalCommandContext.callback
const shellAgentParticipantV3 = {
  participantId: 'participant-installed-1',
  role: 'agent',
  displayName: { key: 'agent.installed', fallback: 'Installed Agent' },
  avatar,
  agentIdentity: definition.identity,
} satisfies AgentConversationParticipantV3
const conversationSemantic = { purpose: 'conversation', causation: { operationId: 'conversation-installed-consumer' } } satisfies AgentConversationMessageSemantic
const selfIntroductionSemantic = {
  purpose: 'member-self-introduction',
  causation: { operationId: 'introduction-request-installed-consumer' },
  participantId: shellAgentParticipantV3.participantId,
  memberId: 'member-installed-1',
  runId: 'run-installed-1',
  binding: { bindingId: 'binding-installed-consumer', generation: 3 },
  turn: 'turn-installed-consumer',
} satisfies AgentConversationMessageSemantic
const acknowledgementSemantic = { purpose: 'chatroom-acknowledgement' } satisfies AgentConversationMessageSemantic
const shellMessageBaseV3 = {
  kind: 'message',
  sequence: 13,
  body: [{ kind: 'text', text: { key: 'message.installed', fallback: 'Installed consumer message' } }],
  reactions: [],
  timestamp: '2026-08-31T00:00:00.000Z',
  deliveryState: 'delivered',
  runState: 'idle',
  ariaLive: 'off',
  actions: [],
} as const
const conversationMessageV3 = { ...shellMessageBaseV3, itemId: 'conversation-item-installed', messageId: 'conversation-message-installed', source: 'agent-loop', author: shellAgentParticipantV3, semantic: conversationSemantic } satisfies AgentConversationMessageItemV3
const selfIntroductionMessageV3 = { ...shellMessageBaseV3, itemId: 'introduction-item-installed', messageId: 'introduction-message-installed', source: 'agent-loop', author: shellAgentParticipantV3, semantic: selfIntroductionSemantic } satisfies AgentConversationMessageItemV3
const acknowledgementMessageV3 = { ...shellMessageBaseV3, itemId: 'ack-item-installed', messageId: 'ack-message-installed', source: 'chatroom-acknowledgement', author: shellAgentParticipantV3, semantic: acknowledgementSemantic } satisfies AgentConversationMessageItemV3
conversationMessageV3.semantic.purpose satisfies 'conversation'
selfIntroductionMessageV3.semantic.purpose satisfies 'member-self-introduction'
selfIntroductionMessageV3.semantic.causation.operationId satisfies AgentLoopOperationId
selfIntroductionMessageV3.semantic.participantId satisfies typeof shellAgentParticipantV3.participantId
selfIntroductionMessageV3.semantic.memberId satisfies string
selfIntroductionMessageV3.semantic.runId satisfies string
selfIntroductionMessageV3.semantic.binding.bindingId satisfies string
selfIntroductionMessageV3.semantic.turn satisfies string
acknowledgementMessageV3.semantic.purpose satisfies 'chatroom-acknowledgement'
// @ts-expect-error every Shell v3 message requires semantic metadata
const semanticlessMessageV3 = { ...conversationMessageV3, semantic: undefined } satisfies AgentConversationMessageItemV3
// @ts-expect-error chatroom acknowledgement source cannot impersonate an AgentLoop self-introduction
const forgedChatroomMessageV3 = { ...selfIntroductionMessageV3, source: 'chatroom-acknowledgement' } satisfies AgentConversationMessageItemV3
const roomSettingsRequest = {
  requestId: 'settings-installed-consumer',
  binding: { bindingId: 'binding-installed-consumer', ownerGeneration: 'owner-generation-installed-consumer' },
  generation: 'shell-generation-installed-consumer',
  roomId: roomSelectionV3.roomId,
  expectedSnapshotSequence: 8,
  patch: { name: 'Updated protocol room', description: { state: 'present', text: 'Updated introduction' } },
} satisfies AgentConversationRoomSettingsUpdateRequest
declare const roomSettingsResult: AgentConversationRoomSettingsUpdateResult
const updatedRoomSettings = await shellV3.updateRoomSettings(roomSettingsRequest)
for (const result of [roomSettingsResult, updatedRoomSettings]) {
  result.type satisfies 'update-room-settings'
  result.binding.ownerGeneration satisfies string
  result.generation satisfies string
  result.roomId satisfies string
  result.expectedSnapshotSequence satisfies number
  if (result.status === 'applied') {
    result.code satisfies 'applied'
    result.snapshotSequence satisfies number
  } else if (result.status === 'conflict') {
    result.code satisfies 'request-conflict' | 'owner-conflict' | 'generation-conflict' | 'room-conflict' | 'snapshot-conflict'
  } else {
    result.status satisfies 'unavailable'
    result.code satisfies 'owner-unavailable' | 'settings-unavailable' | 'disposed'
  }
}
const legacyCreated = await legacyAgentLoop.createOrBind(legacyCreate)
if (legacyCreated.status === 'accepted') legacyCreated.binding.task satisfies string
// @ts-expect-error v1 intentionally has no durable cross-client ledger descriptor
legacyAgentLoop.durableLedger
const approvalCommandV3 = {
  $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/agent-loop-command.v3.schema.json',
  contract: 'cordisx.agent-loop-command/v3',
  schemaVersion: 3,
  commandId: 'approval-installed-consumer',
  type: 'approval-decision',
  binding: approvalBindingV3,
  turn: 'turn-installed-consumer',
  approvalId: 'approval-installed-consumer',
  decision: 'approve',
} satisfies AgentLoopCommandV3
approvalCommandV3.decision satisfies AgentLoopApprovalDecision
const approvalResultV3 = await agentLoopV3.decideApproval(approvalCommandV3)
approvalResultV3.type satisfies 'approval-decision'
if (approvalResultV3.status === 'accepted') {
  approvalResultV3.authorization.capability satisfies 'approvals.decide'
  approvalResultV3.binding satisfies AgentLoopTaskBindingV3
  approvalResultV3.turn satisfies string
  approvalResultV3.approvalId satisfies string
  approvalResultV3.decision satisfies AgentLoopApprovalDecision
  approvalResultV3.delivery.disposition satisfies AgentLoopDeliveryDisposition
} else if (approvalResultV3.status === 'conflict') {
  approvalResultV3.code satisfies AgentLoopApprovalDecisionConflictCode
  approvalResultV3.authorization.state satisfies 'allowed'
} else if (approvalResultV3.status === 'denied') {
  approvalResultV3.authorization.state satisfies 'denied'
} else if ('code' in approvalResultV3) {
  approvalResultV3.code satisfies AgentLoopApprovalDecisionUnavailableCode
  approvalResultV3.authorization.state satisfies 'allowed'
} else {
  approvalResultV3.authorization.state satisfies 'unavailable'
}
agentLoopV3.schemaVersion satisfies 3
const selfIntroductionIntent = { kind: 'member-self-introduction', audience: 'room', output: 'assistant-message' } satisfies AgentLoopMemberSelfIntroductionIntent
const selfIntroductionRequestCommand = {
  $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/agent-loop-command.v3.schema.json',
  contract: 'cordisx.agent-loop-command/v3',
  schemaVersion: 3,
  commandId: 'introduction-request-installed-consumer',
  type: 'request-member-self-introduction',
  binding: approvalBindingV3,
  participantId: 'participant-installed-1',
  memberId: 'member-installed-1',
  runId: 'run-installed-1',
  intent: selfIntroductionIntent,
} satisfies AgentLoopCommandV3
const selfIntroductionCancelCommand = {
  $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/agent-loop-command.v3.schema.json',
  contract: 'cordisx.agent-loop-command/v3',
  schemaVersion: 3,
  commandId: 'introduction-cancel-installed-consumer',
  type: 'cancel-member-self-introduction',
  binding: approvalBindingV3,
  participantId: selfIntroductionRequestCommand.participantId,
  memberId: selfIntroductionRequestCommand.memberId,
  runId: selfIntroductionRequestCommand.runId,
  requestOperationId: selfIntroductionRequestCommand.commandId,
} satisfies AgentLoopCommandV3
// @ts-expect-error AgentLoop v3 commands never accept consumer time
const selfIntroductionWithIssuedAt = { ...selfIntroductionRequestCommand, issuedAt: '2026-08-31T00:00:00.000Z' } satisfies AgentLoopCommandV3
// @ts-expect-error provider-private observation time is never a public command field
const selfIntroductionWithFirstObservedAt = { ...selfIntroductionRequestCommand, firstObservedAt: '2026-08-31T00:00:00.000Z' } satisfies AgentLoopCommandV3
// @ts-expect-error provider-private closure time is never a public command field
const selfIntroductionWithClosedAt = { ...selfIntroductionRequestCommand, closedAt: '2026-08-31T00:00:00.000Z' } satisfies AgentLoopCommandV3
// @ts-expect-error AgentLoop v3 self-introduction commands never accept a prompt
const selfIntroductionWithPrompt = { ...selfIntroductionRequestCommand, prompt: 'Introduce yourself' } satisfies AgentLoopCommandV3
// @ts-expect-error AgentLoop v3 self-introduction commands never accept a hidden prompt
const selfIntroductionWithHiddenPrompt = { ...selfIntroductionRequestCommand, hiddenPrompt: 'Introduce yourself' } satisfies AgentLoopCommandV3
// @ts-expect-error AgentLoop v3 self-introduction commands never accept a body
const selfIntroductionWithBody = { ...selfIntroductionRequestCommand, body: 'Introduce yourself' } satisfies AgentLoopCommandV3
// @ts-expect-error AgentLoop v3 self-introduction commands never accept deterministic text
const selfIntroductionWithText = { ...selfIntroductionRequestCommand, text: 'Introduce yourself' } satisfies AgentLoopCommandV3
// @ts-expect-error AgentLoop v3 self-introduction commands never accept canned content
const selfIntroductionWithContent = { ...selfIntroductionRequestCommand, content: [{ kind: 'text', text: 'Introduce yourself' }] } satisfies AgentLoopCommandV3
// @ts-expect-error AgentLoop v3 self-introduction commands never select a model
const selfIntroductionWithModel = { ...selfIntroductionRequestCommand, model: 'provider/model' } satisfies AgentLoopCommandV3
// @ts-expect-error AgentLoop v3 self-introduction commands never carry a canned response
const selfIntroductionWithResponse = { ...selfIntroductionRequestCommand, response: 'Hello from the member.' } satisfies AgentLoopCommandV3
declare const declaredIntroductionRequestResult: AgentLoopRequestMemberSelfIntroductionResult
declare const declaredIntroductionCancelResult: AgentLoopCancelMemberSelfIntroductionResult
const requestedIntroduction = await agentLoopV3.requestMemberSelfIntroduction(selfIntroductionRequestCommand)
const cancelledIntroduction = await agentLoopV3.cancelMemberSelfIntroduction(selfIntroductionCancelCommand)
for (const introductionResult of [declaredIntroductionRequestResult, declaredIntroductionCancelResult, requestedIntroduction, cancelledIntroduction]) {
  introductionResult.authorization.capability satisfies 'turns.introduce'
  if (introductionResult.status === 'accepted') {
    introductionResult.binding satisfies AgentLoopTaskBindingV3
    introductionResult.participantId satisfies string
    introductionResult.memberId satisfies string
    introductionResult.runId satisfies string
    introductionResult.turn satisfies string
    introductionResult.messageId satisfies string
    introductionResult.delivery.disposition satisfies AgentLoopDeliveryDisposition
    // @ts-expect-error frozen AgentLoop v3 accepted results predate result causation
    introductionResult.causation
  } else if (introductionResult.status === 'conflict') {
    introductionResult.code satisfies AgentLoopMemberSelfIntroductionConflictCode
    introductionResult.authorization.state satisfies 'allowed'
  } else if (introductionResult.status === 'denied') {
    introductionResult.authorization.state satisfies 'denied'
  } else if ('code' in introductionResult) {
    introductionResult.code satisfies AgentLoopMemberSelfIntroductionUnavailableCode
    introductionResult.authorization.state satisfies 'allowed'
  } else {
    introductionResult.authorization.state satisfies 'unavailable'
  }
}
if (cancelledIntroduction.status === 'accepted') cancelledIntroduction.requestOperationId satisfies AgentLoopOperationId
const selfIntroductionRequestCommandV4 = {
  $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/agent-loop-command.v4.schema.json',
  contract: 'cordisx.agent-loop-command/v4',
  schemaVersion: 4,
  commandId: 'introduction-request-v4-installed-consumer',
  type: 'request-member-self-introduction',
  binding: bindingV4,
  participantId: 'participant-v4-installed-1',
  memberId: 'member-v4-installed-1',
  runId: 'run-v4-installed-1',
  intent: { kind: 'member-self-introduction', audience: 'room', output: 'assistant-message' },
} satisfies AgentLoopCommandV4
// @ts-expect-error v4 self-introduction requires the full generation-fenced task binding
const identityOnlySelfIntroductionV4 = { ...selfIntroductionRequestCommandV4, binding: bindingV4.binding } satisfies AgentLoopCommandV4
const selfIntroductionCancelCommandV4 = {
  $schema: selfIntroductionRequestCommandV4.$schema,
  contract: selfIntroductionRequestCommandV4.contract,
  schemaVersion: selfIntroductionRequestCommandV4.schemaVersion,
  commandId: 'introduction-cancel-v4-installed-consumer',
  type: 'cancel-member-self-introduction',
  binding: bindingV4,
  participantId: selfIntroductionRequestCommandV4.participantId,
  memberId: selfIntroductionRequestCommandV4.memberId,
  runId: selfIntroductionRequestCommandV4.runId,
  requestOperationId: selfIntroductionRequestCommandV4.commandId,
} satisfies AgentLoopCommandV4
// @ts-expect-error v4 commands never accept consumer time
const selfIntroductionV4WithIssuedAt = { ...selfIntroductionRequestCommandV4, issuedAt: '2026-08-31T00:00:00.000Z' } satisfies AgentLoopCommandV4
// @ts-expect-error provider observation time remains private
const selfIntroductionV4WithFirstObservedAt = { ...selfIntroductionRequestCommandV4, firstObservedAt: '2026-08-31T00:00:00.000Z' } satisfies AgentLoopCommandV4
// @ts-expect-error provider closure time remains private
const selfIntroductionV4WithClosedAt = { ...selfIntroductionRequestCommandV4, closedAt: '2026-08-31T00:00:00.000Z' } satisfies AgentLoopCommandV4
// @ts-expect-error v4 self-introduction commands never accept a prompt
const selfIntroductionV4WithPrompt = { ...selfIntroductionRequestCommandV4, prompt: 'Introduce yourself' } satisfies AgentLoopCommandV4
// @ts-expect-error v4 self-introduction commands never accept a hidden prompt
const selfIntroductionV4WithHiddenPrompt = { ...selfIntroductionRequestCommandV4, hiddenPrompt: 'Introduce yourself' } satisfies AgentLoopCommandV4
// @ts-expect-error v4 self-introduction commands never accept a body
const selfIntroductionV4WithBody = { ...selfIntroductionRequestCommandV4, body: 'Introduce yourself' } satisfies AgentLoopCommandV4
// @ts-expect-error v4 self-introduction commands never accept deterministic text
const selfIntroductionV4WithText = { ...selfIntroductionRequestCommandV4, text: 'Introduce yourself' } satisfies AgentLoopCommandV4
// @ts-expect-error v4 self-introduction commands never accept canned content
const selfIntroductionV4WithContent = { ...selfIntroductionRequestCommandV4, content: [{ kind: 'text', text: 'Introduce yourself' }] } satisfies AgentLoopCommandV4
// @ts-expect-error v4 self-introduction commands never select a model
const selfIntroductionV4WithModel = { ...selfIntroductionRequestCommandV4, model: 'provider/model' } satisfies AgentLoopCommandV4
// @ts-expect-error v4 self-introduction commands never carry a canned response
const selfIntroductionV4WithResponse = { ...selfIntroductionRequestCommandV4, response: 'Hello from the member.' } satisfies AgentLoopCommandV4
const acceptedSelfIntroductionV4 = {
  $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/agent-loop-result.v4.schema.json',
  contract: 'cordisx.agent-loop-result/v4',
  schemaVersion: 4,
  commandId: selfIntroductionRequestCommandV4.commandId,
  type: 'request-member-self-introduction',
  status: 'accepted',
  authorization: { capability: 'turns.introduce', state: 'allowed', code: 'allowed' },
  binding: bindingV4,
  participantId: selfIntroductionRequestCommandV4.participantId,
  memberId: selfIntroductionRequestCommandV4.memberId,
  runId: selfIntroductionRequestCommandV4.runId,
  turn: 'turn-v4-installed-consumer',
  messageId: 'message-v4-installed-consumer',
  causation: { operationId: selfIntroductionRequestCommandV4.commandId },
  delivery: { disposition: 'executed' },
} satisfies AgentLoopRequestMemberSelfIntroductionResultV4
const acceptedSelfIntroductionCancelV4 = {
  ...acceptedSelfIntroductionV4,
  commandId: selfIntroductionCancelCommandV4.commandId,
  type: 'cancel-member-self-introduction',
  requestOperationId: selfIntroductionCancelCommandV4.requestOperationId,
  causation: { operationId: selfIntroductionCancelCommandV4.commandId },
  delivery: { disposition: 'reconciled' },
} satisfies AgentLoopCancelMemberSelfIntroductionResultV4
for (const result of [acceptedSelfIntroductionV4, acceptedSelfIntroductionCancelV4]) {
  result.binding.task satisfies string
  result.turn satisfies string
  result.messageId satisfies string
  result.delivery.disposition satisfies AgentLoopDeliveryDisposition
  result.causation.operationId satisfies AgentLoopOperationId
  if (result.causation.operationId !== result.commandId) throw new Error('accepted v4 self-introduction result causation must equal its own commandId')
}
const requestedIntroductionV4 = await agentLoopV4.requestMemberSelfIntroduction(selfIntroductionRequestCommandV4)
const cancelledIntroductionV4 = await agentLoopV4.cancelMemberSelfIntroduction(selfIntroductionCancelCommandV4)
for (const result of [requestedIntroductionV4, cancelledIntroductionV4]) {
  if (result.status === 'accepted') {
    result.turn satisfies string
    result.messageId satisfies string
    result.delivery.disposition satisfies AgentLoopDeliveryDisposition
    result.causation.operationId satisfies AgentLoopOperationId
  } else {
    // @ts-expect-error non-accepted v4 self-introduction results expose no causation
    result.causation
    if (result.status === 'unavailable' && 'code' in result) result.code satisfies AgentLoopMemberSelfIntroductionUnavailableCodeV4
  }
}
const selfIntroductionBindingClosedV4 = 'binding-closed' satisfies AgentLoopMemberSelfIntroductionUnavailableCodeV4
declare const createResultV4: AgentLoopCreateOrBindResultV4
declare const sendResultV4: AgentLoopSendResultV4
if (createResultV4.status === 'accepted') {
  // @ts-expect-error existing accepted operations remain v3-shaped in v4
  createResultV4.causation
}
if (sendResultV4.status === 'accepted') {
  // @ts-expect-error existing accepted operations remain v3-shaped in v4
  sendResultV4.causation
}
const approvalCommandV4 = {
  $schema: selfIntroductionRequestCommandV4.$schema,
  contract: selfIntroductionRequestCommandV4.contract,
  schemaVersion: selfIntroductionRequestCommandV4.schemaVersion,
  commandId: 'approval-v4-installed-consumer',
  type: 'approval-decision',
  binding: bindingV4,
  turn: 'turn-approval-v4-installed-consumer',
  approvalId: 'approval-v4-installed-consumer',
  decision: 'approved',
} satisfies AgentLoopCommandV4
const acceptedApprovalResultV4 = {
  $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/agent-loop-result.v4.schema.json',
  contract: 'cordisx.agent-loop-result/v4',
  schemaVersion: 4,
  commandId: approvalCommandV4.commandId,
  type: 'approval-decision',
  status: 'accepted',
  authorization: { capability: 'approvals.decide', state: 'allowed', code: 'allowed' },
  binding: bindingV4,
  turn: approvalCommandV4.turn,
  approvalId: approvalCommandV4.approvalId,
  decision: approvalCommandV4.decision,
  causation: { operationId: approvalCommandV4.commandId },
  delivery: { disposition: 'executed' },
} satisfies AgentLoopApprovalDecisionResultV4
if (acceptedApprovalResultV4.causation.operationId !== acceptedApprovalResultV4.commandId) throw new Error('accepted v4 approval result causation must equal its own commandId')
const resolvedApprovalEventV4 = {
  $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/agent-loop-event.v4.schema.json',
  contract: 'cordisx.agent-loop-event/v4',
  schemaVersion: 4,
  eventId: 'approval-event-v4-installed-consumer',
  binding: bindingV4.binding,
  sequence: 15,
  occurredAt: '2026-08-31T00:00:00.000Z',
  causation: { operationId: approvalCommandV4.commandId },
  type: 'approval',
  turn: approvalCommandV4.turn,
  approval: { approvalId: approvalCommandV4.approvalId, kind: 'command', state: 'resolved', outcome: approvalCommandV4.decision },
} satisfies AgentLoopEventV4
resolvedApprovalEventV4.causation.operationId satisfies AgentLoopOperationId
const approvalResultV4 = await agentLoopV4.decideApproval(approvalCommandV4)
if (approvalResultV4.status === 'accepted') {
  approvalResultV4.decision satisfies 'approved' | 'denied' | 'cancelled'
  approvalResultV4.causation.operationId satisfies AgentLoopOperationId
  approvalResultV4.delivery.disposition satisfies AgentLoopDeliveryDisposition
} else {
  // @ts-expect-error non-accepted v4 approval results expose no causation
  approvalResultV4.causation
  if (approvalResultV4.status === 'unavailable' && 'code' in approvalResultV4) approvalResultV4.code satisfies AgentLoopApprovalDecisionUnavailableCodeV4
}
const bindingClosedV4 = 'binding-closed' satisfies AgentLoopApprovalDecisionUnavailableCodeV4
agentLoopV4.schemaVersion satisfies 4
const selfIntroductionMessageEvent = {
  $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/agent-loop-event.v3.schema.json',
  contract: 'cordisx.agent-loop-event/v3',
  schemaVersion: 3,
  eventId: 'introduction-message-installed-consumer',
  binding: approvalBindingV3.binding,
  sequence: 12,
  occurredAt: '2026-08-31T00:00:00.000Z',
  causation: { operationId: selfIntroductionRequestCommand.commandId },
  turn: 'turn-installed-consumer',
  type: 'message',
  message: { messageId: 'introduction-message-installed-consumer', role: 'assistant', purpose: 'member-self-introduction', content: [{ kind: 'text', text: 'Hello from the member.' }] },
} satisfies AgentLoopEventV3
selfIntroductionMessageEvent.message.purpose satisfies 'member-self-introduction'
selfIntroductionMessageEvent.causation.operationId satisfies AgentLoopOperationId
selfIntroductionMessageEvent.turn satisfies string
const created = await agentLoop.createOrBind(createCommand)
if (created.status === 'accepted') {
  if (created.detailsUrl.target === 'host') created.detailsUrl.url satisfies \`app:\${string}\`
  else created.detailsUrl.url satisfies \`https:\${string}\` | \`codex:\${string}\` | \`claude:\${string}\`
  created.delivery.disposition satisfies AgentLoopDeliveryDisposition
} else if (created.status === 'denied') {
  created.authorization.state satisfies 'denied'
} else if ('code' in created) {
  created.code satisfies AgentLoopCreateOrBindUnavailableCode
  created.authorization.state satisfies 'allowed'
} else {
  created.authorization.state satisfies 'unavailable'
}
const sent = await agentLoop.send(sendCommand)
if (sent.status === 'accepted') {
  sent.messageId satisfies string
  sent.turn satisfies string
  sent.delivery.disposition satisfies AgentLoopDeliveryDisposition
} else if (sent.status === 'denied') {
  sent.authorization.state satisfies 'denied'
} else if ('code' in sent) {
  sent.code satisfies AgentLoopOperationUnavailableCode
  sent.authorization.state satisfies 'allowed'
} else {
  sent.authorization.state satisfies 'unavailable'
}
// @ts-expect-error task details are persisted results, not a resolver operation
agentLoop.resolveTaskPresentation
// @ts-expect-error Agent Loop owns no task-details open or navigation operation
agentLoop.openTaskDetails
const roots = await hostDom.catalog()
roots.authority satisfies 'host'
void canonical
void cloned
void effective
void shell
void legacyShell
void shellV3
void legacyParticipant
void agentLoopV3
void agentLoopV4
void selfIntroductionMessageEvent
void selfIntroductionWithIssuedAt
void selfIntroductionWithFirstObservedAt
void selfIntroductionWithClosedAt
void selfIntroductionWithPrompt
void selfIntroductionWithHiddenPrompt
void selfIntroductionWithBody
void selfIntroductionWithText
void selfIntroductionWithContent
void selfIntroductionWithModel
void selfIntroductionWithResponse
void selfIntroductionV4WithIssuedAt
void selfIntroductionV4WithFirstObservedAt
void selfIntroductionV4WithClosedAt
void selfIntroductionV4WithPrompt
void selfIntroductionV4WithHiddenPrompt
void selfIntroductionV4WithBody
void selfIntroductionV4WithText
void selfIntroductionV4WithContent
void selfIntroductionV4WithModel
void selfIntroductionV4WithResponse
void identityOnlySelfIntroductionV4
void selfIntroductionBindingClosedV4
void bindingClosedV4
void presentRoomDescription
void roomSelectionWithDescriptionV3
void newRoomLeadingVisual
void emptyRoomComposite
void populatedRoomComposite
void shellApprovalItem
void shellApprovalCommandContext
void semanticlessMessageV3
void forgedChatroomMessageV3
`)
  run(process.execPath, [join(root, 'node_modules/typescript/bin/tsc'), '--noEmit', '--strict', '--module', 'NodeNext', '--moduleResolution', 'NodeNext', '--target', 'ES2023', join(consumer, 'consumer.ts')], consumer)
  writeFileSync(join(consumer, 'consumer.mjs'), `import { AGENT_AVATAR_UNKNOWN_SEED, canonicalizeAgentAvatarSeed, cloneAgentAvatarRef, createGeneratedAgentAvatarRef, resolveAgentDefinitionAvatar } from '@cordisx/protocol/agent-avatar/v1'\nimport assert from 'node:assert/strict'\nconst canonical = canonicalizeAgentAvatarSeed({ namespace: 'agent-definition', agentId: '  Ångent  ' })\nassert.equal(canonical, 'cordisx.agent-avatar.seed/v1:agent-definition:7:Ångent')\nassert.equal(canonicalizeAgentAvatarSeed({ namespace: 'unknown' }), AGENT_AVATAR_UNKNOWN_SEED)\nconst source = { kind: 'asset', ref: 'avatar-assets:reviewer' }\nconst cloned = cloneAgentAvatarRef(source)\nassert.notEqual(cloned, source)\nassert.ok(Object.isFrozen(cloned))\nsource.ref = 'avatar-assets:mutated'\nassert.equal(cloned.ref, 'avatar-assets:reviewer')\nconst parent = createGeneratedAgentAvatarRef({ namespace: 'agent-definition', agentId: 'parent' })\nconst fallback = resolveAgentDefinitionAvatar({ agentId: 'child', inherit: 'inherit', parentAvatars: [parent] })\nassert.equal(fallback.seed, 'cordisx.agent-avatar.seed/v1:agent-definition:5:child')\nassert.ok(Object.isFrozen(fallback))\n`)
  run(process.execPath, [join(consumer, 'consumer.mjs')], consumer)

  const installed = JSON.parse(readFileSync(join(consumer, 'node_modules/@cordisx/protocol/package.json'), 'utf8'))
  if (installed.version !== manifest.version) throw new Error('consumer resolved the wrong package version')
  if (JSON.stringify(installed.exports) !== JSON.stringify(manifest.exports)) throw new Error('consumer resolved different public exports')
  const installedRoot = join(consumer, 'node_modules/@cordisx/protocol')
  if (fileDigest(installedRoot, frozenAgentLoopFiles) !== frozenAgentLoopDigest) throw new Error('installed frozen AgentLoop v1/v2/v3 package bytes drifted')
  for (const file of expectedFiles) readFileSync(join(installedRoot, file))
  for (const file of expectedFiles.filter(file => file.startsWith('schemas/') && file.endsWith('.json'))) {
    JSON.parse(readFileSync(join(installedRoot, file), 'utf8'))
  }
  if (readFileSync(join(installedRoot, 'schemas/README.md'), 'utf8') !== readFileSync(join(root, 'schemas/README.md'), 'utf8')) {
    throw new Error('installed schemas/README.md differs from source')
  }
  console.log(JSON.stringify({ npmVersion: run(process.execPath, [npmCli, '--version']).trim(), files: actualFiles, package: `${manifest.name}@${manifest.version}`, integrity: packedArchive[0].integrity, shasum: packedArchive[0].shasum, consumerImports: expectedExports }))
} finally {
  rmSync(temp, { recursive: true, force: true })
}
