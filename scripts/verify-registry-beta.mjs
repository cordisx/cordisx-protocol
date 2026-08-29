import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const versionIndex = process.argv.indexOf('--version')
const version = versionIndex === -1 ? manifest.version : process.argv[versionIndex + 1]
if (!version) throw new Error('usage: verify-registry-beta.mjs --version <exact-version>')
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
  writeFileSync(join(temp, 'package.json'), JSON.stringify({ private: true, type: 'module', dependencies: { [manifest.name]: version } }) + '\n')
  run(['install', '--ignore-scripts', '--no-package-lock', '--registry=https://registry.npmjs.org'], temp)
  writeFileSync(join(temp, 'consumer.ts'), `import type { BoundConnectorClient } from '@cordisx/protocol/connector-service/v1'\nimport type { AgentConversationShellSource } from '@cordisx/protocol/agent-conversation-shell/v1'\ndeclare const connector: BoundConnectorClient\ndeclare const shell: AgentConversationShellSource\nvoid connector\nvoid shell\n`)
  execFileSync(process.execPath, [join(root, 'node_modules/typescript/bin/tsc'), '--noEmit', '--strict', '--module', 'NodeNext', '--moduleResolution', 'NodeNext', '--target', 'ES2023', join(temp, 'consumer.ts')], { cwd: temp, stdio: 'inherit' })
  const audit = JSON.parse(run(['audit', 'signatures', '--json', '--include-attestations', '--registry=https://registry.npmjs.org'], temp))
  const verified = audit.verified ?? []
  if (!verified.some((entry) => String(entry.name ?? entry.package ?? '').includes(manifest.name))) throw new Error('signature/provenance verification omitted the Protocol package')
  console.log(JSON.stringify({ version, beta, integrity: published.dist.integrity, shasum: published.dist.shasum, gitHead: published.gitHead, verified }))
} finally {
  rmSync(temp, { recursive: true, force: true })
}
