import { execFileSync, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
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
  './agent-loop/v4',
  './connector-service/v1',
  './host-dom/v1',
].sort()
const expectedV3Schemas = [
  'agent-loop-bound-client.v3.schema.json',
  'agent-loop-command.v3.schema.json',
  'agent-loop-common.v3.schema.json',
  'agent-loop-event-page.v3.schema.json',
  'agent-loop-event-subscription.v3.schema.json',
  'agent-loop-event.v3.schema.json',
  'agent-loop-result.v3.schema.json',
  'agent-loop-task-binding.v3.schema.json',
  'agent-conversation-shell-binding.v3.schema.json',
  'agent-conversation-shell-command-context.v3.schema.json',
  'agent-conversation-shell-common.v3.schema.json',
  'agent-conversation-shell-page.v3.schema.json',
  'agent-conversation-shell-result.v3.schema.json',
  'agent-conversation-shell-room-collection-leading-visual.v3.schema.json',
  'agent-conversation-shell-room-settings-request.v3.schema.json',
  'agent-conversation-shell-room-settings-result.v3.schema.json',
  'agent-conversation-shell-snapshot.v3.schema.json',
  'agent-conversation-shell-subscription.v3.schema.json',
]
const expectedV4Schemas = [
  'agent-loop-bound-client.v4.schema.json',
  'agent-loop-command.v4.schema.json',
  'agent-loop-common.v4.schema.json',
  'agent-loop-event-page.v4.schema.json',
  'agent-loop-event-subscription.v4.schema.json',
  'agent-loop-event.v4.schema.json',
  'agent-loop-result.v4.schema.json',
  'agent-loop-task-binding.v4.schema.json',
]
const frozenAgentLoopFiles = [
  ...readdirSync(join(root, 'schemas'))
    .filter((name) => /^agent-loop-.*\.v[123]\.schema\.json$/.test(name))
    .map((name) => `schemas/${name}`),
  'types/agent-loop.v1.d.ts',
  'types/agent-loop.v2.d.ts',
  'types/agent-loop.v3.d.ts',
].sort()
const frozenAgentLoopDigest = '8eff903c47166aa358d31cce8d9d8a1cfe693f3fe6558ac332006fe71cb6f852'

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

if (fileDigest(root, frozenAgentLoopFiles) !== frozenAgentLoopDigest) {
  throw new Error('frozen AgentLoop v1/v2/v3 package bytes drifted')
}
if (JSON.stringify(Object.keys(manifest.exports).sort()) !== JSON.stringify(expectedExports)) {
  throw new Error('local public export inventory drifted')
}
const arguments_ = process.argv.slice(2)
if (arguments_.length !== 0 && (arguments_.length !== 2 || arguments_[0] !== '--version')) {
  throw new Error('usage: verify-registry-beta.mjs [--version <exact-prerelease>]')
}
const version = arguments_.length === 0 ? manifest.version : arguments_[1]
const exactPrereleasePattern =
  /^(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)$/
const versionMatch = exactPrereleasePattern.exec(version ?? '')
if (
  versionMatch === null
  || versionMatch[1].split('.').some(identifier =>
    /^[0-9]+$/.test(identifier) && identifier.length > 1 && identifier.startsWith('0')
  )
) {
  throw new Error(
    'version must be one exact prerelease, not a range, tag, git/file/link/workspace selector, or stable version',
  )
}
if (version !== manifest.version) {
  throw new Error(`local package version ${manifest.version} does not match requested registry version ${version}`)
}
const npm = [process.execPath, process.env.npm_execpath ?? 'node_modules/npm/bin/npm-cli.js']

function run(arguments_, cwd = root) {
  const result = spawnSync(npm[0], [...npm.slice(1), ...arguments_], { cwd, encoding: 'utf8' })
  if (result.status !== 0) throw new Error(`npm ${arguments_.join(' ')} failed:\n${result.stdout}\n${result.stderr}`)
  return result.stdout
}

const published = JSON.parse(
  run([
    'view',
    `${manifest.name}@${version}`,
    'version',
    'dist',
    'gitHead',
    'repository',
    '--json',
    '--registry=https://registry.npmjs.org',
  ]),
)
const beta = JSON.parse(
  run(['view', manifest.name, 'dist-tags.beta', '--json', '--registry=https://registry.npmjs.org']),
)
const expectedGitHead = process.env.EXPECT_GIT_HEAD
  ?? execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim()
if (published.version !== version || beta !== version) throw new Error('registry version or beta tag drift')
if (!published.dist?.integrity || !published.dist?.shasum) throw new Error('registry omitted integrity or shasum')
if (published.gitHead !== expectedGitHead) throw new Error(`registry gitHead mismatch: ${published.gitHead}`)
if (!String(published.repository?.url ?? '').includes('github.com/cordisx/cordisx-protocol')) {
  throw new Error('registry repository provenance mismatch')
}

const temp = mkdtempSync(join(tmpdir(), 'cordisx-protocol-registry-'))
try {
  const packedJson = JSON.parse(run(['pack', '--json', '--pack-destination', temp]))
  const packed = Array.isArray(packedJson) ? packedJson : Object.values(packedJson)
  if (packed.length !== 1) throw new Error('local npm pack did not produce exactly one package')
  const local = packed[0]
  if (!local.integrity || !local.shasum) throw new Error('local npm pack omitted integrity or shasum')
  if (published.dist.integrity !== local.integrity || published.dist.shasum !== local.shasum) {
    throw new Error(
      `registry archive differs from local npm pack: registry ${published.dist.integrity} ${published.dist.shasum}; local ${local.integrity} ${local.shasum}`,
    )
  }

  const consumer = join(temp, 'consumer')
  mkdirSync(consumer)
  writeFileSync(
    join(consumer, 'package.json'),
    JSON.stringify({ private: true, type: 'module', dependencies: { [manifest.name]: version } }) + '\n',
  )
  run(['install', '--ignore-scripts', '--no-package-lock', '--registry=https://registry.npmjs.org'], consumer)
  writeFileSync(
    join(consumer, 'consumer.ts'),
    `import { canonicalizeAgentAvatarSeed, cloneAgentAvatarRef, createGeneratedAgentAvatarRef, resolveAgentDefinitionAvatar, type AgentAvatarRef, type AgentAvatarResolutionResult } from '@cordisx/protocol/agent-avatar/v1'\nimport type { BoundConnectorClient } from '@cordisx/protocol/connector-service/v1'\nimport type { AgentConversationParticipant, AgentConversationShellSource } from '@cordisx/protocol/agent-conversation-shell/v1'\nimport type { AgentConversationParticipant as AgentConversationParticipantV2, AgentConversationShellSource as AgentConversationShellSourceV2 } from '@cordisx/protocol/agent-conversation-shell/v2'\nimport type { BoundHostDomClient } from '@cordisx/protocol/host-dom/v1'\nimport type { AgentDefinition, BoundAgentLoopClient as BoundAgentLoopClientV1 } from '@cordisx/protocol/agent-loop/v1'\nimport type { BoundAgentLoopClient as BoundAgentLoopClientV2 } from '@cordisx/protocol/agent-loop/v2'\nconst avatar = createGeneratedAgentAvatarRef({ namespace: 'agent-definition', agentId: 'registry-verifier' })\nconst canonical = canonicalizeAgentAvatarSeed({ namespace: 'agent-definition', agentId: ' registry-verifier ' })\nconst cloned = cloneAgentAvatarRef(avatar)\nconst effective = resolveAgentDefinitionAvatar({ agentId: 'registry-verifier', inherit: 'none' })\navatar satisfies AgentAvatarRef\ndeclare const resolution: AgentAvatarResolutionResult\ndeclare const connector: BoundConnectorClient\ndeclare const participant: AgentConversationParticipant\ndeclare const participantV2: AgentConversationParticipantV2\ndeclare const shell: AgentConversationShellSource\ndeclare const shellV2: AgentConversationShellSourceV2\ndeclare const hostDom: BoundHostDomClient\ndeclare const definition: AgentDefinition\ndeclare const agentLoopV1: BoundAgentLoopClientV1\ndeclare const agentLoopV2: BoundAgentLoopClientV2\nif (resolution.status === 'unsupported') resolution.code satisfies 'unsupported-kind' | 'unsupported-provider' | 'reference-unavailable'\ndefinition.avatar satisfies AgentAvatarRef | undefined\nparticipant.avatar satisfies AgentAvatarRef | undefined\nparticipantV2.avatar satisfies AgentAvatarRef | undefined\nvoid canonical\nvoid cloned\nvoid effective\nvoid connector\nvoid shell\nvoid shellV2\nvoid hostDom\nvoid agentLoopV1\nvoid agentLoopV2\n`,
  )
  execFileSync(process.execPath, [
    join(root, 'node_modules/typescript/bin/tsc'),
    '--noEmit',
    '--strict',
    '--module',
    'NodeNext',
    '--moduleResolution',
    'NodeNext',
    '--target',
    'ES2023',
    join(consumer, 'consumer.ts'),
  ], { cwd: consumer, stdio: 'inherit' })
  writeFileSync(
    join(consumer, 'consumer-v3.ts'),
    `import type { AgentConversationRoomDescription, AgentConversationRoomSettingsUpdateRequest, AgentConversationSelection, AgentConversationShellSource } from '@cordisx/protocol/agent-conversation-shell/v3'\ndeclare const shell: AgentConversationShellSource\nconst emptyDescription = { state: 'empty' } satisfies AgentConversationRoomDescription\nconst presentDescription = { state: 'present', text: { key: 'room.description', fallback: 'Registry verifier introduction' } } satisfies AgentConversationRoomDescription\nconst selection = { kind: 'room', roomId: 'registry-room', title: { key: 'room.title', fallback: 'Registry room' }, description: emptyDescription, multiParticipant: true, participantPresentation: 'host-initials', participants: [] } satisfies AgentConversationSelection\nselection.description.state satisfies 'empty'\npresentDescription.text.fallback satisfies string\nconst request = { requestId: 'registry-settings', binding: { bindingId: 'registry-binding', ownerGeneration: 'registry-owner' }, generation: 'registry-shell', roomId: selection.roomId, expectedSnapshotSequence: 4, patch: { description: { state: 'empty' } } } satisfies AgentConversationRoomSettingsUpdateRequest\nconst result = await shell.updateRoomSettings(request)\nif (result.status === 'applied') result.snapshotSequence satisfies number\nelse if (result.status === 'conflict') result.code satisfies 'request-conflict' | 'owner-conflict' | 'generation-conflict' | 'room-conflict' | 'snapshot-conflict'\nelse result.code satisfies 'owner-unavailable' | 'settings-unavailable' | 'disposed'\nvoid presentDescription\n`,
  )
  execFileSync(process.execPath, [
    join(root, 'node_modules/typescript/bin/tsc'),
    '--noEmit',
    '--strict',
    '--module',
    'NodeNext',
    '--moduleResolution',
    'NodeNext',
    '--target',
    'ES2023',
    join(consumer, 'consumer-v3.ts'),
  ], { cwd: consumer, stdio: 'inherit' })
  writeFileSync(
    join(consumer, 'consumer-v3-visual.ts'),
    `import type { AgentAvatarRef } from '@cordisx/protocol/agent-avatar/v1'\nimport type { AgentConversationRoomCollectionLeadingVisual, AgentConversationRoomCollectionParticipantRef } from '@cordisx/protocol/agent-conversation-shell/v3'\nconst avatar = { kind: 'asset', ref: 'registry-avatar:participant' } satisfies AgentAvatarRef\nconst newRoom = { kind: 'semantic-icon', icon: 'host:action.add' } satisfies AgentConversationRoomCollectionLeadingVisual\nnewRoom.icon satisfies \`host:\${string}\`\nconst zeroParticipants = [] as const satisfies readonly AgentConversationRoomCollectionParticipantRef[]\nconst emptyRoom = { kind: 'room-composite-avatar', roomId: 'registry-empty-room', participants: zeroParticipants } satisfies AgentConversationRoomCollectionLeadingVisual\nemptyRoom.roomId satisfies string\nemptyRoom.participants.length satisfies 0\nconst fiveParticipants = [\n  { participantId: 'registry-participant-1', avatar },\n  { participantId: 'registry-participant-2', avatar },\n  { participantId: 'registry-participant-3', avatar },\n  { participantId: 'registry-participant-4', avatar },\n  { participantId: 'registry-participant-5', avatar },\n] as const satisfies readonly AgentConversationRoomCollectionParticipantRef[]\nfiveParticipants.length satisfies 5\nconst populatedRoom = { kind: 'room-composite-avatar', roomId: 'registry-populated-room', participants: fiveParticipants } satisfies AgentConversationRoomCollectionLeadingVisual\npopulatedRoom.roomId satisfies string\nfor (const participant of populatedRoom.participants) { participant.participantId satisfies string; participant.avatar satisfies AgentAvatarRef }\n`,
  )
  execFileSync(process.execPath, [
    join(root, 'node_modules/typescript/bin/tsc'),
    '--noEmit',
    '--strict',
    '--module',
    'NodeNext',
    '--moduleResolution',
    'NodeNext',
    '--target',
    'ES2023',
    join(consumer, 'consumer-v3-visual.ts'),
  ], { cwd: consumer, stdio: 'inherit' })
  writeFileSync(
    join(consumer, 'consumer-shell-approval-v3.ts'),
    `import type { AgentConversationApprovalAction, AgentConversationApprovalItem } from '@cordisx/protocol/agent-conversation-shell/v3'\nconst action = { decision: 'approve', command: { id: 'chatroom.approval.approve', arguments: { approvalId: 'registry-approval' } } } satisfies AgentConversationApprovalAction\nconst item = { kind: 'approval', itemId: 'registry-approval-item', sequence: 6, participantId: 'registry-participant', memberId: 'registry-member', runId: 'registry-run', binding: { bindingId: 'registry-binding', generation: 3 }, turn: 'registry-turn', approvalId: 'registry-approval', approvalKind: 'command', state: 'pending', actions: [action] } satisfies AgentConversationApprovalItem\naction.decision satisfies 'approve' | 'deny' | 'cancel'\naction.command.id satisfies string\nitem.participantId satisfies string\nitem.memberId satisfies string\nitem.runId satisfies string\nitem.binding.generation satisfies number\nitem.turn satisfies string\nitem.approvalId satisfies string\nitem.actions[0].command.id satisfies string\n`,
  )
  execFileSync(process.execPath, [
    join(root, 'node_modules/typescript/bin/tsc'),
    '--noEmit',
    '--strict',
    '--module',
    'NodeNext',
    '--moduleResolution',
    'NodeNext',
    '--target',
    'ES2023',
    join(consumer, 'consumer-shell-approval-v3.ts'),
  ], { cwd: consumer, stdio: 'inherit' })
  writeFileSync(
    join(consumer, 'consumer-shell-approval-context-v3.ts'),
    `import type { AgentConversationShellCommandContext } from '@cordisx/protocol/agent-conversation-shell/v3'\nconst context = { binding: { bindingId: 'registry-shell-binding', ownerGeneration: 'registry-owner' }, generation: 'registry-shell', scope: 'approval', itemId: 'registry-approval-item', command: { id: 'chatroom.approval.approve', arguments: { approvalId: 'registry-approval' } } } satisfies AgentConversationShellCommandContext\ncontext.scope satisfies 'approval'\ncontext.itemId satisfies string\ncontext.command.id satisfies string\n// @ts-expect-error approval command contexts expose no private callback\ncontext.callback\n`,
  )
  execFileSync(process.execPath, [
    join(root, 'node_modules/typescript/bin/tsc'),
    '--noEmit',
    '--strict',
    '--module',
    'NodeNext',
    '--moduleResolution',
    'NodeNext',
    '--target',
    'ES2023',
    join(consumer, 'consumer-shell-approval-context-v3.ts'),
  ], { cwd: consumer, stdio: 'inherit' })
  writeFileSync(
    join(consumer, 'consumer-shell-message-semantic-v3.ts'),
    `import type { AgentConversationMessageItem, AgentConversationMessageSemantic, AgentConversationParticipant } from '@cordisx/protocol/agent-conversation-shell/v3'\nconst agent = { participantId: 'registry-participant', role: 'agent', displayName: { key: 'agent.registry', fallback: 'Registry Agent' }, agentIdentity: { agentId: 'registry-agent', revision: 'definition-1' } } satisfies AgentConversationParticipant\nconst conversation = { purpose: 'conversation', causation: { operationId: 'registry-conversation' } } satisfies AgentConversationMessageSemantic\nconst introduction = { purpose: 'member-self-introduction', causation: { operationId: 'registry-introduction-request' }, participantId: agent.participantId, memberId: 'registry-member', runId: 'registry-run', binding: { bindingId: 'registry-binding', generation: 3 }, turn: 'registry-turn' } satisfies AgentConversationMessageSemantic\nconst acknowledgement = { purpose: 'chatroom-acknowledgement' } satisfies AgentConversationMessageSemantic\nconst base = { kind: 'message', sequence: 12, body: [{ kind: 'text', text: { key: 'message.registry', fallback: 'Registry message' } }], reactions: [], timestamp: '2026-08-31T00:00:00.000Z', deliveryState: 'delivered', runState: 'idle', ariaLive: 'off', actions: [] } as const\nconst conversationMessage = { ...base, itemId: 'registry-conversation-item', messageId: 'registry-conversation-message', source: 'agent-loop', author: agent, semantic: conversation } satisfies AgentConversationMessageItem\nconst introductionMessage = { ...base, itemId: 'registry-introduction-item', messageId: 'registry-introduction-message', source: 'agent-loop', author: agent, semantic: introduction } satisfies AgentConversationMessageItem\nconst acknowledgementMessage = { ...base, itemId: 'registry-ack-item', messageId: 'registry-ack-message', source: 'chatroom-acknowledgement', author: agent, semantic: acknowledgement } satisfies AgentConversationMessageItem\nconversationMessage.semantic.purpose satisfies 'conversation'\nintroductionMessage.semantic.purpose satisfies 'member-self-introduction'\nintroductionMessage.semantic.causation.operationId satisfies string\nintroductionMessage.semantic.participantId satisfies typeof agent.participantId\nintroductionMessage.semantic.memberId satisfies string\nintroductionMessage.semantic.runId satisfies string\nintroductionMessage.semantic.binding.generation satisfies number\nintroductionMessage.semantic.turn satisfies string\nacknowledgementMessage.semantic.purpose satisfies 'chatroom-acknowledgement'\n// @ts-expect-error every Shell v3 message requires semantic metadata\nconst semanticless = { ...conversationMessage, semantic: undefined } satisfies AgentConversationMessageItem\n// @ts-expect-error acknowledgement source cannot impersonate an AgentLoop self-introduction\nconst forgedChatroomMessage = { ...introductionMessage, source: 'chatroom-acknowledgement' } satisfies AgentConversationMessageItem\nvoid semanticless\nvoid forgedChatroomMessage\n`,
  )
  execFileSync(process.execPath, [
    join(root, 'node_modules/typescript/bin/tsc'),
    '--noEmit',
    '--strict',
    '--module',
    'NodeNext',
    '--moduleResolution',
    'NodeNext',
    '--target',
    'ES2023',
    join(consumer, 'consumer-shell-message-semantic-v3.ts'),
  ], { cwd: consumer, stdio: 'inherit' })
  writeFileSync(
    join(consumer, 'consumer-agent-loop-v3.ts'),
    `import type { AgentLoopApprovalDecision, AgentLoopApprovalDecisionConflictCode, AgentLoopApprovalDecisionUnavailableCode, AgentLoopCommand, AgentLoopTaskBinding, BoundAgentLoopClient } from '@cordisx/protocol/agent-loop/v3'\ndeclare const client: BoundAgentLoopClient\ndeclare const binding: AgentLoopTaskBinding\nconst command = { $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/agent-loop-command.v3.schema.json', contract: 'cordisx.agent-loop-command/v3', schemaVersion: 3, commandId: 'registry-approval', type: 'approval-decision', binding, turn: 'registry-turn', approvalId: 'registry-approval', decision: 'approve' } satisfies AgentLoopCommand\ncommand.decision satisfies AgentLoopApprovalDecision\nconst result = await client.decideApproval(command)\nresult.type satisfies 'approval-decision'\nif (result.status === 'accepted') { result.binding satisfies AgentLoopTaskBinding; result.approvalId satisfies string; result.decision satisfies AgentLoopApprovalDecision }\nelse if (result.status === 'conflict') result.code satisfies AgentLoopApprovalDecisionConflictCode\nelse if (result.status === 'denied') result.authorization.state satisfies 'denied'\nelse if ('code' in result) result.code satisfies AgentLoopApprovalDecisionUnavailableCode\nelse result.authorization.state satisfies 'unavailable'\nclient.schemaVersion satisfies 3\n`,
  )
  execFileSync(process.execPath, [
    join(root, 'node_modules/typescript/bin/tsc'),
    '--noEmit',
    '--strict',
    '--module',
    'NodeNext',
    '--moduleResolution',
    'NodeNext',
    '--target',
    'ES2023',
    join(consumer, 'consumer-agent-loop-v3.ts'),
  ], { cwd: consumer, stdio: 'inherit' })
  writeFileSync(
    join(consumer, 'consumer-agent-loop-self-introduction-v3.ts'),
    `import type { AgentLoopCancelMemberSelfIntroductionResult, AgentLoopCommand, AgentLoopEvent, AgentLoopMemberSelfIntroductionConflictCode, AgentLoopMemberSelfIntroductionUnavailableCode, AgentLoopRequestMemberSelfIntroductionResult, AgentLoopTaskBinding, BoundAgentLoopClient } from '@cordisx/protocol/agent-loop/v3'\ndeclare const client: BoundAgentLoopClient\ndeclare const binding: AgentLoopTaskBinding\nconst request = { $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/agent-loop-command.v3.schema.json', contract: 'cordisx.agent-loop-command/v3', schemaVersion: 3, commandId: 'registry-introduction-request', type: 'request-member-self-introduction', binding, participantId: 'registry-participant', memberId: 'registry-member', runId: 'registry-run', intent: { kind: 'member-self-introduction', audience: 'room', output: 'assistant-message' } } satisfies AgentLoopCommand\nconst cancel = { $schema: request.$schema, contract: request.contract, schemaVersion: 3, commandId: 'registry-introduction-cancel', type: 'cancel-member-self-introduction', binding, participantId: request.participantId, memberId: request.memberId, runId: request.runId, requestOperationId: request.commandId } satisfies AgentLoopCommand\n// @ts-expect-error commands never accept consumer time\nconst withIssuedAt = { ...request, issuedAt: '2026-08-31T00:00:00.000Z' } satisfies AgentLoopCommand\n// @ts-expect-error commands never accept prompts\nconst withPrompt = { ...request, prompt: 'Introduce yourself' } satisfies AgentLoopCommand\n// @ts-expect-error commands never accept bodies\nconst withBody = { ...request, body: 'Introduce yourself' } satisfies AgentLoopCommand\n// @ts-expect-error commands never select models\nconst withModel = { ...request, model: 'provider/model' } satisfies AgentLoopCommand\ndeclare const declaredRequest: AgentLoopRequestMemberSelfIntroductionResult\ndeclare const declaredCancel: AgentLoopCancelMemberSelfIntroductionResult\nconst requested = await client.requestMemberSelfIntroduction(request)\nconst cancelled = await client.cancelMemberSelfIntroduction(cancel)\nfor (const result of [declaredRequest, declaredCancel, requested, cancelled]) {\n  result.authorization.capability satisfies 'turns.introduce'\n  if (result.status === 'accepted') { result.binding satisfies AgentLoopTaskBinding; result.participantId satisfies string; result.memberId satisfies string; result.runId satisfies string; result.turn satisfies string; result.messageId satisfies string }\n  else if (result.status === 'conflict') result.code satisfies AgentLoopMemberSelfIntroductionConflictCode\n  else if (result.status === 'denied') result.authorization.state satisfies 'denied'\n  else if ('code' in result) result.code satisfies AgentLoopMemberSelfIntroductionUnavailableCode\n  else result.authorization.state satisfies 'unavailable'\n}\nif (cancelled.status === 'accepted') cancelled.requestOperationId satisfies string\nconst event = { $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/agent-loop-event.v3.schema.json', contract: 'cordisx.agent-loop-event/v3', schemaVersion: 3, eventId: 'registry-introduction-message', binding: binding.binding, sequence: 12, occurredAt: '2026-08-31T00:00:00.000Z', causation: { operationId: request.commandId }, type: 'message', message: { messageId: 'registry-introduction-message', role: 'assistant', purpose: 'member-self-introduction', content: [{ kind: 'text', text: 'Hello from the member.' }] } } satisfies AgentLoopEvent\nevent.message.purpose satisfies 'member-self-introduction'\nevent.causation.operationId satisfies string\nvoid withIssuedAt\nvoid withPrompt\nvoid withBody\nvoid withModel\n`,
  )
  const introductionConsumerPath = join(consumer, 'consumer-agent-loop-self-introduction-v3.ts')
  const introductionConsumerSource = readFileSync(introductionConsumerPath, 'utf8')
  const introductionConsumerWithTurn = introductionConsumerSource.replace(
    "causation: { operationId: request.commandId }, type: 'message'",
    "causation: { operationId: request.commandId }, turn: 'registry-turn', type: 'message'",
  )
  if (introductionConsumerWithTurn === introductionConsumerSource) {
    throw new Error('registry AgentLoop v3 consumer event fixture did not receive its required turn')
  }
  writeFileSync(introductionConsumerPath, `${introductionConsumerWithTurn}\nevent.turn satisfies string\n`)
  execFileSync(process.execPath, [
    join(root, 'node_modules/typescript/bin/tsc'),
    '--noEmit',
    '--strict',
    '--module',
    'NodeNext',
    '--moduleResolution',
    'NodeNext',
    '--target',
    'ES2023',
    join(consumer, 'consumer-agent-loop-self-introduction-v3.ts'),
  ], { cwd: consumer, stdio: 'inherit' })
  writeFileSync(
    join(consumer, 'consumer-agent-loop-private-fields-v3.ts'),
    `import type { AgentLoopCommand, AgentLoopTaskBinding } from '@cordisx/protocol/agent-loop/v3'\ndeclare const binding: AgentLoopTaskBinding\nconst request = { $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/agent-loop-command.v3.schema.json', contract: 'cordisx.agent-loop-command/v3', schemaVersion: 3, commandId: 'registry-private-field-probe', type: 'request-member-self-introduction', binding, participantId: 'registry-participant', memberId: 'registry-member', runId: 'registry-run', intent: { kind: 'member-self-introduction', audience: 'room', output: 'assistant-message' } } satisfies AgentLoopCommand\n// @ts-expect-error consumer time is not public command data\nconst issuedAt = { ...request, issuedAt: '2026-08-31T00:00:00.000Z' } satisfies AgentLoopCommand\n// @ts-expect-error provider observation time is private\nconst firstObservedAt = { ...request, firstObservedAt: '2026-08-31T00:00:00.000Z' } satisfies AgentLoopCommand\n// @ts-expect-error provider closure time is private\nconst closedAt = { ...request, closedAt: '2026-08-31T00:00:00.000Z' } satisfies AgentLoopCommand\n// @ts-expect-error request carries semantic intent, not a prompt\nconst prompt = { ...request, prompt: 'Introduce yourself' } satisfies AgentLoopCommand\n// @ts-expect-error hidden prompts are never public\nconst hiddenPrompt = { ...request, hiddenPrompt: 'Introduce yourself' } satisfies AgentLoopCommand\n// @ts-expect-error canned body is forbidden\nconst body = { ...request, body: 'Introduce yourself' } satisfies AgentLoopCommand\n// @ts-expect-error canned text is forbidden\nconst text = { ...request, text: 'Introduce yourself' } satisfies AgentLoopCommand\n// @ts-expect-error canned content is forbidden\nconst content = { ...request, content: [{ kind: 'text', text: 'Introduce yourself' }] } satisfies AgentLoopCommand\n// @ts-expect-error model selection is provider-owned\nconst model = { ...request, model: 'provider/model' } satisfies AgentLoopCommand\n// @ts-expect-error canned response is forbidden\nconst response = { ...request, response: 'Hello from the member.' } satisfies AgentLoopCommand\nvoid issuedAt\nvoid firstObservedAt\nvoid closedAt\nvoid prompt\nvoid hiddenPrompt\nvoid body\nvoid text\nvoid content\nvoid model\nvoid response\n`,
  )
  execFileSync(process.execPath, [
    join(root, 'node_modules/typescript/bin/tsc'),
    '--noEmit',
    '--strict',
    '--module',
    'NodeNext',
    '--moduleResolution',
    'NodeNext',
    '--target',
    'ES2023',
    join(consumer, 'consumer-agent-loop-private-fields-v3.ts'),
  ], { cwd: consumer, stdio: 'inherit' })
  writeFileSync(
    join(consumer, 'consumer-agent-loop-v4.ts'),
    `import type {
  AgentLoopApprovalDecisionUnavailableCode,
  AgentLoopApprovalDecisionResult,
  AgentLoopCancelMemberSelfIntroductionResult,
  AgentLoopCommand,
  AgentLoopCreateOrBindResult,
  AgentLoopEvent,
  AgentLoopMemberSelfIntroductionUnavailableCode,
  AgentLoopRequestMemberSelfIntroductionResult,
  AgentLoopSendResult,
  AgentLoopTaskBinding,
  BoundAgentLoopClient,
} from '@cordisx/protocol/agent-loop/v4'
declare const client: BoundAgentLoopClient
declare const binding: AgentLoopTaskBinding
const request = {
  $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/agent-loop-command.v4.schema.json',
  contract: 'cordisx.agent-loop-command/v4',
  schemaVersion: 4,
  commandId: 'registry-introduction-request-v4',
  type: 'request-member-self-introduction',
  binding,
  participantId: 'registry-participant-v4',
  memberId: 'registry-member-v4',
  runId: 'registry-run-v4',
  intent: { kind: 'member-self-introduction', audience: 'room', output: 'assistant-message' },
} satisfies AgentLoopCommand
// @ts-expect-error self-introduction requires the full generation-fenced task binding
const identityOnlyRequest = { ...request, binding: binding.binding } satisfies AgentLoopCommand
const cancel = {
  $schema: request.$schema,
  contract: request.contract,
  schemaVersion: request.schemaVersion,
  commandId: 'registry-introduction-cancel-v4',
  type: 'cancel-member-self-introduction',
  binding,
  participantId: request.participantId,
  memberId: request.memberId,
  runId: request.runId,
  requestOperationId: request.commandId,
} satisfies AgentLoopCommand
// @ts-expect-error consumer time is not public command data
const issuedAt = { ...request, issuedAt: '2026-08-31T00:00:00.000Z' } satisfies AgentLoopCommand
// @ts-expect-error provider observation time is private
const firstObservedAt = { ...request, firstObservedAt: '2026-08-31T00:00:00.000Z' } satisfies AgentLoopCommand
// @ts-expect-error provider closure time is private
const closedAt = { ...request, closedAt: '2026-08-31T00:00:00.000Z' } satisfies AgentLoopCommand
// @ts-expect-error request carries semantic intent, not a prompt
const prompt = { ...request, prompt: 'Introduce yourself' } satisfies AgentLoopCommand
// @ts-expect-error hidden prompts are never public
const hiddenPrompt = { ...request, hiddenPrompt: 'Introduce yourself' } satisfies AgentLoopCommand
// @ts-expect-error canned body is forbidden
const body = { ...request, body: 'Introduce yourself' } satisfies AgentLoopCommand
// @ts-expect-error canned text is forbidden
const text = { ...request, text: 'Introduce yourself' } satisfies AgentLoopCommand
// @ts-expect-error canned content is forbidden
const content = { ...request, content: [{ kind: 'text', text: 'Introduce yourself' }] } satisfies AgentLoopCommand
// @ts-expect-error model selection is provider-owned
const model = { ...request, model: 'provider/model' } satisfies AgentLoopCommand
// @ts-expect-error canned response is forbidden
const response = { ...request, response: 'Hello from the member.' } satisfies AgentLoopCommand
const acceptedRequest = {
  $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/agent-loop-result.v4.schema.json',
  contract: 'cordisx.agent-loop-result/v4',
  schemaVersion: 4,
  commandId: request.commandId,
  type: 'request-member-self-introduction',
  status: 'accepted',
  authorization: { capability: 'turns.introduce', state: 'allowed', code: 'allowed' },
  binding,
  participantId: request.participantId,
  memberId: request.memberId,
  runId: request.runId,
  turn: 'registry-turn-v4',
  messageId: 'registry-message-v4',
  causation: { operationId: request.commandId },
  delivery: { disposition: 'executed' },
} satisfies AgentLoopRequestMemberSelfIntroductionResult
const acceptedCancel = {
  ...acceptedRequest,
  commandId: cancel.commandId,
  type: 'cancel-member-self-introduction',
  requestOperationId: cancel.requestOperationId,
  causation: { operationId: cancel.commandId },
  delivery: { disposition: 'reconciled' },
} satisfies AgentLoopCancelMemberSelfIntroductionResult
for (const result of [acceptedRequest, acceptedCancel]) {
  result.binding.task satisfies string
  result.turn satisfies string
  result.messageId satisfies string
  result.delivery.disposition satisfies 'executed' | 'replayed' | 'reconciled'
  result.causation.operationId satisfies string
  if (result.causation.operationId !== result.commandId) throw new Error('accepted result causation must equal commandId')
}
const requested = await client.requestMemberSelfIntroduction(request)
const cancelled = await client.cancelMemberSelfIntroduction(cancel)
for (const result of [requested, cancelled]) {
  if (result.status === 'accepted') {
    result.turn satisfies string
    result.messageId satisfies string
    result.delivery.disposition satisfies 'executed' | 'replayed' | 'reconciled'
    result.causation.operationId satisfies string
  } else {
    // @ts-expect-error non-accepted self-introduction results expose no causation
    result.causation
    if (result.status === 'unavailable' && 'code' in result) result.code satisfies AgentLoopMemberSelfIntroductionUnavailableCode
  }
}
const introductionBindingClosed = 'binding-closed' satisfies AgentLoopMemberSelfIntroductionUnavailableCode
const approval = {
  $schema: request.$schema,
  contract: request.contract,
  schemaVersion: request.schemaVersion,
  commandId: 'registry-approval-v4',
  type: 'approval-decision',
  binding,
  turn: 'registry-approval-turn-v4',
  approvalId: 'registry-approval-v4',
  decision: 'approved',
} satisfies AgentLoopCommand
const acceptedApproval = {
  $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/agent-loop-result.v4.schema.json',
  contract: 'cordisx.agent-loop-result/v4',
  schemaVersion: 4,
  commandId: approval.commandId,
  type: 'approval-decision',
  status: 'accepted',
  authorization: { capability: 'approvals.decide', state: 'allowed', code: 'allowed' },
  binding,
  turn: approval.turn,
  approvalId: approval.approvalId,
  decision: approval.decision,
  causation: { operationId: approval.commandId },
  delivery: { disposition: 'executed' },
} satisfies AgentLoopApprovalDecisionResult
if (acceptedApproval.causation.operationId !== acceptedApproval.commandId) throw new Error('accepted approval causation must equal commandId')
const approvalEvent = {
  $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/agent-loop-event.v4.schema.json',
  contract: 'cordisx.agent-loop-event/v4',
  schemaVersion: 4,
  eventId: 'registry-approval-event-v4',
  binding: binding.binding,
  sequence: 4,
  occurredAt: '2026-08-31T00:00:00.000Z',
  causation: { operationId: approval.commandId },
  type: 'approval',
  turn: approval.turn,
  approval: { approvalId: approval.approvalId, kind: 'command', state: 'resolved', outcome: approval.decision },
} satisfies AgentLoopEvent
approvalEvent.causation.operationId satisfies string
const approvalResult = await client.decideApproval(approval)
if (approvalResult.status === 'accepted') {
  approvalResult.decision satisfies 'approved' | 'denied' | 'cancelled'
  approvalResult.causation.operationId satisfies string
  approvalResult.delivery.disposition satisfies 'executed' | 'replayed' | 'reconciled'
} else {
  // @ts-expect-error non-accepted approval results expose no causation
  approvalResult.causation
  if (approvalResult.status === 'unavailable' && 'code' in approvalResult) approvalResult.code satisfies AgentLoopApprovalDecisionUnavailableCode
}
const bindingClosed = 'binding-closed' satisfies AgentLoopApprovalDecisionUnavailableCode
declare const createResult: AgentLoopCreateOrBindResult
declare const sendResult: AgentLoopSendResult
if (createResult.status === 'accepted') {
  // @ts-expect-error create-or-bind remains v3-shaped
  createResult.causation
}
if (sendResult.status === 'accepted') {
  // @ts-expect-error send remains v3-shaped
  sendResult.causation
}
client.schemaVersion satisfies 4
void issuedAt
void firstObservedAt
void closedAt
void prompt
void hiddenPrompt
void body
void text
void content
void model
void response
void identityOnlyRequest
void introductionBindingClosed
void bindingClosed
`,
  )
  execFileSync(process.execPath, [
    join(root, 'node_modules/typescript/bin/tsc'),
    '--noEmit',
    '--strict',
    '--module',
    'NodeNext',
    '--moduleResolution',
    'NodeNext',
    '--target',
    'ES2023',
    join(consumer, 'consumer-agent-loop-v4.ts'),
  ], { cwd: consumer, stdio: 'inherit' })
  writeFileSync(
    join(consumer, 'consumer.mjs'),
    `import { AGENT_AVATAR_UNKNOWN_SEED, canonicalizeAgentAvatarSeed, cloneAgentAvatarRef, createGeneratedAgentAvatarRef, resolveAgentDefinitionAvatar } from '@cordisx/protocol/agent-avatar/v1'\nimport assert from 'node:assert/strict'\nconst generated = createGeneratedAgentAvatarRef({ namespace: 'agent-definition', agentId: 'registry-verifier' })\nassert.equal(canonicalizeAgentAvatarSeed({ namespace: 'unknown' }), AGENT_AVATAR_UNKNOWN_SEED)\nassert.deepEqual(cloneAgentAvatarRef(generated), generated)\nassert.equal(resolveAgentDefinitionAvatar({ agentId: 'registry-verifier', inherit: 'none' }).seed, generated.seed)\n`,
  )
  execFileSync(process.execPath, [join(consumer, 'consumer.mjs')], { cwd: consumer, stdio: 'inherit' })

  const installedRoot = join(consumer, 'node_modules', ...manifest.name.split('/'))
  if (fileDigest(installedRoot, frozenAgentLoopFiles) !== frozenAgentLoopDigest) {
    throw new Error('registry frozen AgentLoop v1/v2/v3 package bytes drifted')
  }
  const installed = JSON.parse(readFileSync(join(installedRoot, 'package.json'), 'utf8'))
  if (installed.version !== version) {
    throw new Error(`clean consumer installed ${installed.version} instead of ${version}`)
  }
  if (JSON.stringify(installed.exports) !== JSON.stringify(manifest.exports)) {
    throw new Error('registry package public exports differ from the local manifest')
  }
  const localSchemaNames = readdirSync(join(root, 'schemas')).filter(name => name.endsWith('.json')).sort()
  const installedSchemaNames = readdirSync(join(installedRoot, 'schemas')).filter(name => name.endsWith('.json')).sort()
  for (const name of expectedV3Schemas) {
    if (!localSchemaNames.includes(name)) throw new Error(`local package omitted required v3 schema: ${name}`)
    if (!installedSchemaNames.includes(name)) throw new Error(`registry package omitted required v3 schema: ${name}`)
  }
  for (const name of expectedV4Schemas) {
    if (!localSchemaNames.includes(name)) throw new Error(`local package omitted required v4 schema: ${name}`)
    if (!installedSchemaNames.includes(name)) throw new Error(`registry package omitted required v4 schema: ${name}`)
  }
  if (JSON.stringify(installedSchemaNames) !== JSON.stringify(localSchemaNames)) {
    throw new Error('registry package schema inventory differs from the local package')
  }
  if (
    readFileSync(join(installedRoot, 'schemas/README.md'), 'utf8')
      !== readFileSync(join(root, 'schemas/README.md'), 'utf8')
  ) {
    throw new Error('registry schemas/README.md differs from the local package')
  }
  for (const name of localSchemaNames) {
    const localSchema = JSON.parse(readFileSync(join(root, 'schemas', name), 'utf8'))
    const installedSchema = JSON.parse(readFileSync(join(installedRoot, 'schemas', name), 'utf8'))
    if (JSON.stringify(installedSchema) !== JSON.stringify(localSchema)) {
      throw new Error(`registry schema differs from local schema: ${name}`)
    }
  }
  for (const name of ['agent-loop.v1.d.ts', 'agent-loop.v2.d.ts', 'agent-loop.v3.d.ts', 'agent-loop.v4.d.ts']) {
    if (readFileSync(join(installedRoot, 'types', name), 'utf8') !== readFileSync(join(root, 'types', name), 'utf8')) {
      throw new Error(`registry AgentLoop declaration differs from local package: ${name}`)
    }
  }

  const audit = JSON.parse(
    run(['audit', 'signatures', '--json', '--include-attestations', '--registry=https://registry.npmjs.org'], consumer),
  )
  const verified = audit.verified ?? []
  if (!verified.some((entry) => String(entry.name ?? entry.package ?? '').includes(manifest.name))) {
    throw new Error('signature/provenance verification omitted the Protocol package')
  }
  console.log(
    JSON.stringify({
      version,
      beta,
      integrity: published.dist.integrity,
      shasum: published.dist.shasum,
      gitHead: published.gitHead,
      exports: Object.keys(installed.exports),
      schemas: installedSchemaNames.length,
      verified,
    }),
  )
} finally {
  rmSync(temp, { recursive: true, force: true })
}
