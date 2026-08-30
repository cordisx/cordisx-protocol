import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const expectedFiles = [
  'LICENSE',
  'README.md',
  'package.json',
  'schemas/README.md',
  ...readdirSync(join(root, 'schemas'), { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => `schemas/${entry.name}`),
  'types/agent-conversation-shell.v1.d.ts',
  'types/connector-service.v1.d.ts',
].sort()

function run(command, arguments_, cwd = root) {
  const result = spawnSync(command, arguments_, { cwd, encoding: 'utf8' })
  if (result.status !== 0) throw new Error(`${command} ${arguments_.join(' ')} failed:\n${result.stdout}\n${result.stderr}`)
  return result.stdout
}

const temp = mkdtempSync(join(tmpdir(), 'cordisx-protocol-distribution-'))
try {
  const packedJson = JSON.parse(run(process.execPath, [process.env.npm_execpath ?? 'node_modules/npm/bin/npm-cli.js', 'pack', '--dry-run', '--json', '--pack-destination', temp]))
  const packed = Array.isArray(packedJson) ? packedJson : Object.values(packedJson)
  if (packed.length !== 1) throw new Error('expected exactly one packed package')
  const actualFiles = packed[0].files.map((file) => file.path).sort()
  if (JSON.stringify(actualFiles) !== JSON.stringify(expectedFiles)) throw new Error(`unexpected publish contents: ${JSON.stringify(actualFiles)}`)

  const packedArchiveJson = JSON.parse(run(process.execPath, [process.env.npm_execpath ?? 'node_modules/npm/bin/npm-cli.js', 'pack', '--json', '--pack-destination', temp]))
  const packedArchive = Array.isArray(packedArchiveJson) ? packedArchiveJson : Object.values(packedArchiveJson)
  if (packedArchive.length !== 1 || JSON.stringify(packedArchive[0].files.map((file) => file.path).sort()) !== JSON.stringify(expectedFiles)) throw new Error('actual pack contents drifted from dry-run')
  if (!packedArchive[0].integrity || !packedArchive[0].shasum) throw new Error('actual pack omitted integrity or shasum')
  const archive = join(temp, packedArchive[0].filename)
  const consumer = join(temp, 'consumer')
  run(process.execPath, [process.env.npm_execpath ?? 'node_modules/npm/bin/npm-cli.js', 'install', '--ignore-scripts', '--no-package-lock', '--prefix', consumer, archive])
  writeFileSync(join(consumer, 'package.json'), '{"type":"module"}\n')
  writeFileSync(join(consumer, 'consumer.ts'), `import type { BoundConnectorClient } from '@cordisx/protocol/connector-service/v1'\nimport type { AgentConversationShellSource } from '@cordisx/protocol/agent-conversation-shell/v1'\ndeclare const connector: BoundConnectorClient\ndeclare const shell: AgentConversationShellSource\nconst discovered = await connector.discover()\nif (discovered.status === 'accepted') discovered.snapshot.registrations satisfies readonly unknown[]\nvoid shell\n`)
  run(process.execPath, [join(root, 'node_modules/typescript/bin/tsc'), '--noEmit', '--strict', '--module', 'NodeNext', '--moduleResolution', 'NodeNext', '--target', 'ES2023', join(consumer, 'consumer.ts')], consumer)

  const installed = JSON.parse(readFileSync(join(consumer, 'node_modules/@cordisx/protocol/package.json'), 'utf8'))
  if (installed.version !== manifest.version) throw new Error('consumer resolved the wrong package version')
  if (JSON.stringify(installed.exports) !== JSON.stringify(manifest.exports)) throw new Error('consumer resolved different public exports')
  for (const schema of [
    'icon-theme-common.v1.schema.json',
    'icon-theme-provider-registration.v1.schema.json',
    'marketplace-certified-permission-projection.v1.schema.json',
    'permission-capability-catalog.v2.schema.json',
    'ui-common.v1.schema.json',
  ]) JSON.parse(readFileSync(join(consumer, 'node_modules/@cordisx/protocol/schemas', schema), 'utf8'))
  console.log(JSON.stringify({ npmVersion: run(process.execPath, [process.env.npm_execpath ?? 'node_modules/npm/bin/npm-cli.js', '--version']).trim(), files: actualFiles, package: `${manifest.name}@${manifest.version}`, integrity: packedArchive[0].integrity, shasum: packedArchive[0].shasum, consumerImports: Object.keys(manifest.exports) }))
} finally {
  rmSync(temp, { recursive: true, force: true })
}
