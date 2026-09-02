import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const local = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const spec = process.argv[2] ?? `${local.name}@beta`
const work = mkdtempSync(join(tmpdir(), 'cordisx-protocol-registry-'))
const requiredExports = ['./agents/v1', './sessions/v1', './approval/v1']
const requiredEntries = [
  'package/types/agents.v1.d.ts',
  'package/types/sessions.v1.d.ts',
  'package/types/approval.v1.d.ts',
  'package/schemas/session-event.v1.schema.json',
  'package/schemas/session-snapshot.v1.schema.json',
]
const forbiddenName = /(?:agent-loop|agent-event(?:\.|-page)|agent-history|agent-delivery-snapshot)/

try {
  const packed = JSON.parse(execFileSync('npm', ['pack', spec, '--json', '--ignore-scripts', '--pack-destination', work], { cwd: root, encoding: 'utf8' }))
  assert.equal(packed.length, 1)
  const tarball = join(work, packed[0].filename)
  const entries = execFileSync('tar', ['-tf', tarball], { encoding: 'utf8' }).trim().split('\n')
  for (const name of requiredEntries) assert.ok(entries.includes(name), `registry tarball missing ${name}`)
  for (const name of entries) assert.ok(!forbiddenName.test(name), `registry tarball contains legacy artifact: ${name}`)
  const packageJson = JSON.parse(execFileSync('tar', ['-xOf', tarball, 'package/package.json'], { encoding: 'utf8' }))
  for (const name of requiredExports) assert.ok(packageJson.exports[name], `registry package missing export ${name}`)
  for (const name of Object.keys(packageJson.exports)) assert.ok(!forbiddenName.test(name), `registry package contains legacy export ${name}`)
  console.log(`CordisX Protocol registry verification passed for ${spec}`)
} finally {
  rmSync(work, { recursive: true, force: true })
}
