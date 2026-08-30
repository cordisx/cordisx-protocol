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
  './agent-loop/v1',
  './agent-loop/v2',
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
  'types/agent-loop.v1.d.ts',
  'types/agent-loop.v2.d.ts',
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
import type { AgentLoopCommand as AgentLoopCommandV1, BoundAgentLoopClient as BoundAgentLoopClientV1 } from '@cordisx/protocol/agent-loop/v1'
import type { AgentDefinition, AgentLoopCreateOrBindUnavailableCode, AgentLoopDelivery, AgentLoopDeliveryDisposition, AgentLoopEvent, AgentLoopOperationId, AgentLoopOperationUnavailableCode, BoundAgentLoopClient } from '@cordisx/protocol/agent-loop/v2'
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
declare const agentLoop: BoundAgentLoopClient
declare const legacyAgentLoop: BoundAgentLoopClientV1
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
} satisfies AgentLoopEvent
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
const legacyCreated = await legacyAgentLoop.createOrBind(legacyCreate)
if (legacyCreated.status === 'accepted') legacyCreated.binding.task satisfies string
// @ts-expect-error v1 intentionally has no durable cross-client ledger descriptor
legacyAgentLoop.durableLedger
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
void legacyParticipant
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
