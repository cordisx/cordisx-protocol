import { spawnSync } from 'node:child_process'
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
  './agent-loop/v1',
  './agent-loop/v2',
  './agent-loop/v3',
  './connector-service/v1',
  './host-dom/v1',
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
  'types/agent-loop.v1.d.ts',
  'types/agent-loop.v2.d.ts',
  'types/agent-loop.v3.d.ts',
  'types/connector-service.v1.d.ts',
  'types/host-dom.v1.d.ts',
].sort()

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
import type { AgentLoopCommand as AgentLoopCommandV1, BoundAgentLoopClient as BoundAgentLoopClientV1 } from '@cordisx/protocol/agent-loop/v1'
import type { AgentDefinition, AgentLoopCreateOrBindUnavailableCode, AgentLoopDelivery, AgentLoopDeliveryDisposition, AgentLoopEvent as AgentLoopEventV2, AgentLoopOperationId, AgentLoopOperationUnavailableCode, BoundAgentLoopClient } from '@cordisx/protocol/agent-loop/v2'
import type { AgentLoopApprovalDecision, AgentLoopApprovalDecisionConflictCode, AgentLoopApprovalDecisionUnavailableCode, AgentLoopCancelMemberSelfIntroductionResult, AgentLoopCommand as AgentLoopCommandV3, AgentLoopEvent as AgentLoopEventV3, AgentLoopMemberSelfIntroductionConflictCode, AgentLoopMemberSelfIntroductionIntent, AgentLoopMemberSelfIntroductionUnavailableCode, AgentLoopRequestMemberSelfIntroductionResult, AgentLoopTaskBinding as AgentLoopTaskBindingV3, BoundAgentLoopClient as BoundAgentLoopClientV3 } from '@cordisx/protocol/agent-loop/v3'
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
declare const agentLoop: BoundAgentLoopClient
declare const legacyAgentLoop: BoundAgentLoopClientV1
declare const agentLoopV3: BoundAgentLoopClientV3
declare const approvalBindingV3: AgentLoopTaskBindingV3
declare const createCommand: Parameters<BoundAgentLoopClient['createOrBind']>[0]
declare const sendCommand: Parameters<BoundAgentLoopClient['send']>[0]
declare const hostDom: BoundHostDomClient
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
