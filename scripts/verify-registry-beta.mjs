import { execFileSync, spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const arguments_ = process.argv.slice(2)
if (arguments_.length !== 0 && (arguments_.length !== 2 || arguments_[0] !== '--version')) throw new Error('usage: verify-registry-beta.mjs [--version <exact-prerelease>]')
const version = arguments_.length === 0 ? manifest.version : arguments_[1]
const exactPrereleasePattern = /^(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)$/
const versionMatch = exactPrereleasePattern.exec(version ?? '')
if (versionMatch === null || versionMatch[1].split('.').some(identifier => /^[0-9]+$/.test(identifier) && identifier.length > 1 && identifier.startsWith('0'))) {
  throw new Error('version must be one exact prerelease, not a range, tag, git/file/link/workspace selector, or stable version')
}
if (version !== manifest.version) throw new Error(`local package version ${manifest.version} does not match requested registry version ${version}`)
const npm = [process.execPath, process.env.npm_execpath ?? 'node_modules/npm/bin/npm-cli.js']

function run(arguments_, cwd = root) {
  const result = spawnSync(npm[0], [...npm.slice(1), ...arguments_], { cwd, encoding: 'utf8' })
  if (result.status !== 0) throw new Error(`npm ${arguments_.join(' ')} failed:\n${result.stdout}\n${result.stderr}`)
  return result.stdout
}

const published = JSON.parse(run(['view', `${manifest.name}@${version}`, 'version', 'dist', 'gitHead', 'repository', '--json', '--registry=https://registry.npmjs.org']))
const beta = JSON.parse(run(['view', manifest.name, 'dist-tags.beta', '--json', '--registry=https://registry.npmjs.org']))
const expectedGitHead = process.env.EXPECT_GIT_HEAD ?? execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim()
if (published.version !== version || beta !== version) throw new Error('registry version or beta tag drift')
if (!published.dist?.integrity || !published.dist?.shasum) throw new Error('registry omitted integrity or shasum')
if (published.gitHead !== expectedGitHead) throw new Error(`registry gitHead mismatch: ${published.gitHead}`)
if (!String(published.repository?.url ?? '').includes('github.com/cordisx/cordisx-protocol')) throw new Error('registry repository provenance mismatch')

const temp = mkdtempSync(join(tmpdir(), 'cordisx-protocol-registry-'))
try {
  const packedJson = JSON.parse(run(['pack', '--json', '--pack-destination', temp]))
  const packed = Array.isArray(packedJson) ? packedJson : Object.values(packedJson)
  if (packed.length !== 1) throw new Error('local npm pack did not produce exactly one package')
  const local = packed[0]
  if (!local.integrity || !local.shasum) throw new Error('local npm pack omitted integrity or shasum')
  if (published.dist.integrity !== local.integrity || published.dist.shasum !== local.shasum) {
    throw new Error(`registry archive differs from local npm pack: registry ${published.dist.integrity} ${published.dist.shasum}; local ${local.integrity} ${local.shasum}`)
  }

  const consumer = join(temp, 'consumer')
  mkdirSync(consumer)
  writeFileSync(join(consumer, 'package.json'), JSON.stringify({ private: true, type: 'module', dependencies: { [manifest.name]: version } }) + '\n')
  run(['install', '--ignore-scripts', '--no-package-lock', '--registry=https://registry.npmjs.org'], consumer)
  writeFileSync(join(consumer, 'consumer.ts'), `import { canonicalizeAgentAvatarSeed, cloneAgentAvatarRef, createGeneratedAgentAvatarRef, resolveAgentDefinitionAvatar, type AgentAvatarRef, type AgentAvatarResolutionResult } from '@cordisx/protocol/agent-avatar/v1'\nimport type { BoundConnectorClient } from '@cordisx/protocol/connector-service/v1'\nimport type { AgentConversationParticipant, AgentConversationShellSource } from '@cordisx/protocol/agent-conversation-shell/v1'\nimport type { BoundHostDomClient } from '@cordisx/protocol/host-dom/v1'\nimport type { AgentDefinition, BoundAgentLoopClient } from '@cordisx/protocol/agent-loop/v1'\nconst avatar = createGeneratedAgentAvatarRef({ namespace: 'agent-definition', agentId: 'registry-verifier' })\nconst canonical = canonicalizeAgentAvatarSeed({ namespace: 'agent-definition', agentId: ' registry-verifier ' })\nconst cloned = cloneAgentAvatarRef(avatar)\nconst effective = resolveAgentDefinitionAvatar({ agentId: 'registry-verifier', inherit: 'none' })\navatar satisfies AgentAvatarRef\ndeclare const resolution: AgentAvatarResolutionResult\ndeclare const connector: BoundConnectorClient\ndeclare const participant: AgentConversationParticipant\ndeclare const shell: AgentConversationShellSource\ndeclare const hostDom: BoundHostDomClient\ndeclare const definition: AgentDefinition\ndeclare const agentLoop: BoundAgentLoopClient\nif (resolution.status === 'unsupported') resolution.code satisfies 'unsupported-kind' | 'unsupported-provider' | 'reference-unavailable'\ndefinition.avatar satisfies AgentAvatarRef | undefined\nparticipant.avatar satisfies AgentAvatarRef | undefined\nvoid canonical\nvoid cloned\nvoid effective\nvoid connector\nvoid shell\nvoid hostDom\nvoid agentLoop\n`)
  execFileSync(process.execPath, [join(root, 'node_modules/typescript/bin/tsc'), '--noEmit', '--strict', '--module', 'NodeNext', '--moduleResolution', 'NodeNext', '--target', 'ES2023', join(consumer, 'consumer.ts')], { cwd: consumer, stdio: 'inherit' })
  writeFileSync(join(consumer, 'consumer.mjs'), `import { AGENT_AVATAR_UNKNOWN_SEED, canonicalizeAgentAvatarSeed, cloneAgentAvatarRef, createGeneratedAgentAvatarRef, resolveAgentDefinitionAvatar } from '@cordisx/protocol/agent-avatar/v1'\nimport assert from 'node:assert/strict'\nconst generated = createGeneratedAgentAvatarRef({ namespace: 'agent-definition', agentId: 'registry-verifier' })\nassert.equal(canonicalizeAgentAvatarSeed({ namespace: 'unknown' }), AGENT_AVATAR_UNKNOWN_SEED)\nassert.deepEqual(cloneAgentAvatarRef(generated), generated)\nassert.equal(resolveAgentDefinitionAvatar({ agentId: 'registry-verifier', inherit: 'none' }).seed, generated.seed)\n`)
  execFileSync(process.execPath, [join(consumer, 'consumer.mjs')], { cwd: consumer, stdio: 'inherit' })

  const installedRoot = join(consumer, 'node_modules', ...manifest.name.split('/'))
  const installed = JSON.parse(readFileSync(join(installedRoot, 'package.json'), 'utf8'))
  if (installed.version !== version) throw new Error(`clean consumer installed ${installed.version} instead of ${version}`)
  if (JSON.stringify(installed.exports) !== JSON.stringify(manifest.exports)) throw new Error('registry package public exports differ from the local manifest')
  const localSchemaNames = readdirSync(join(root, 'schemas')).filter(name => name.endsWith('.json')).sort()
  const installedSchemaNames = readdirSync(join(installedRoot, 'schemas')).filter(name => name.endsWith('.json')).sort()
  if (JSON.stringify(installedSchemaNames) !== JSON.stringify(localSchemaNames)) throw new Error('registry package schema inventory differs from the local package')
  if (readFileSync(join(installedRoot, 'schemas/README.md'), 'utf8') !== readFileSync(join(root, 'schemas/README.md'), 'utf8')) {
    throw new Error('registry schemas/README.md differs from the local package')
  }
  for (const name of localSchemaNames) {
    const localSchema = JSON.parse(readFileSync(join(root, 'schemas', name), 'utf8'))
    const installedSchema = JSON.parse(readFileSync(join(installedRoot, 'schemas', name), 'utf8'))
    if (JSON.stringify(installedSchema) !== JSON.stringify(localSchema)) throw new Error(`registry schema differs from local schema: ${name}`)
  }

  const audit = JSON.parse(run(['audit', 'signatures', '--json', '--include-attestations', '--registry=https://registry.npmjs.org'], consumer))
  const verified = audit.verified ?? []
  if (!verified.some((entry) => String(entry.name ?? entry.package ?? '').includes(manifest.name))) throw new Error('signature/provenance verification omitted the Protocol package')
  console.log(JSON.stringify({ version, beta, integrity: published.dist.integrity, shasum: published.dist.shasum, gitHead: published.gitHead, exports: Object.keys(installed.exports), schemas: installedSchemaNames.length, verified }))
} finally {
  rmSync(temp, { recursive: true, force: true })
}
