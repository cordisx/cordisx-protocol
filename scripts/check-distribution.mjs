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
  './agent-loop/v1',
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
  'types/agent-loop.v1.d.ts',
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
  writeFileSync(join(consumer, 'consumer.ts'), `import { canonicalizeAgentAvatarSeed, cloneAgentAvatarRef, createGeneratedAgentAvatarRef, resolveAgentDefinitionAvatar, type AgentAvatarRef, type AgentAvatarResolutionResult } from '@cordisx/protocol/agent-avatar/v1'\nimport type { BoundConnectorClient } from '@cordisx/protocol/connector-service/v1'\nimport type { AgentConversationParticipant, AgentConversationShellSource } from '@cordisx/protocol/agent-conversation-shell/v1'\nimport type { AgentDefinition, BoundAgentLoopClient } from '@cordisx/protocol/agent-loop/v1'\nimport type { BoundHostDomClient } from '@cordisx/protocol/host-dom/v1'\nconst avatar = createGeneratedAgentAvatarRef({ namespace: 'agent-definition', agentId: 'reviewer' })\nconst canonical = canonicalizeAgentAvatarSeed({ namespace: 'agent-definition', agentId: ' reviewer ' })\nconst cloned = cloneAgentAvatarRef(avatar)\nconst effective = resolveAgentDefinitionAvatar({ agentId: 'reviewer', inherit: 'none' })\navatar satisfies AgentAvatarRef\ndeclare const resolution: AgentAvatarResolutionResult\ndeclare const definition: AgentDefinition\ndeclare const participant: AgentConversationParticipant\ndeclare const connector: BoundConnectorClient\ndeclare const shell: AgentConversationShellSource\ndeclare const agentLoop: BoundAgentLoopClient\ndeclare const hostDom: BoundHostDomClient\nconst discovered = await connector.discover()\nif (discovered.status === 'accepted') discovered.snapshot.registrations satisfies readonly unknown[]\nif (resolution.status === 'unsupported') resolution.code satisfies 'unsupported-kind' | 'unsupported-provider' | 'reference-unavailable'\ndefinition.avatar satisfies AgentAvatarRef | undefined\nparticipant.avatar satisfies AgentAvatarRef | undefined\nconst roots = await hostDom.catalog()\nroots.authority satisfies 'host'\nvoid canonical\nvoid cloned\nvoid effective\nvoid shell\nvoid agentLoop\n`)
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
