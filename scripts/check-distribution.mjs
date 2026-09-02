import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const requiredExports = ['./agents/v1', './sessions/v1', './approval/v1']
const requiredTypes = ['types/agents.v1.d.ts', 'types/sessions.v1.d.ts', 'types/approval.v1.d.ts']
const requiredSchemas = [
  'schemas/agent-acquire-request.v1.schema.json',
  'schemas/agent-acquire-result.v1.schema.json',
  'schemas/agent-admission.v1.schema.json',
  'schemas/agent-live-event.v1.schema.json',
  'schemas/agent-mutation-result.v1.schema.json',
  'schemas/approval-question.v1.schema.json',
  'schemas/approval-decision.v1.schema.json',
  'schemas/session-snapshot.v1.schema.json',
  'schemas/session-read-request.v1.schema.json',
  'schemas/session-event.v1.schema.json',
  'schemas/session-event-page.v1.schema.json',
  'schemas/session-subscribe-request.v1.schema.json',
  'schemas/session-subscription-page.v1.schema.json',
]
const forbiddenName = /(?:agent-loop|agent-event(?:\.|-page)|agent-history|agent-delivery-snapshot)/

for (const name of requiredExports) assert.ok(pkg.exports[name], `missing export ${name}`)
for (const name of Object.keys(pkg.exports)) assert.ok(!forbiddenName.test(name), `legacy export remains: ${name}`)
for (const name of requiredTypes) assert.ok(pkg.files.includes(name), `missing package file ${name}`)
for (const name of [...readdirSync(join(root, 'types')), ...readdirSync(join(root, 'schemas'))]) {
  assert.ok(!forbiddenName.test(name), `legacy public artifact remains: ${name}`)
}

const work = mkdtempSync(join(tmpdir(), 'cordisx-protocol-distribution-'))
try {
  const packed = JSON.parse(execFileSync('npm', ['pack', '--json', '--ignore-scripts', '--pack-destination', work], { cwd: root, encoding: 'utf8' }))
  assert.equal(packed.length, 1)
  const tarball = join(work, packed[0].filename)
  const entries = execFileSync('tar', ['-tf', tarball], { encoding: 'utf8' }).trim().split('\n')
  for (const name of [...requiredTypes, ...requiredSchemas]) assert.ok(entries.includes(`package/${name}`), `tarball missing ${name}`)
  for (const name of entries) assert.ok(!forbiddenName.test(name), `tarball contains legacy artifact: ${name}`)

  const consumer = join(work, 'consumer')
  execFileSync('mkdir', ['-p', consumer])
  writeFileSync(join(consumer, 'package.json'), JSON.stringify({ name: 'protocol-consumer', private: true, type: 'module' }))
  execFileSync('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', '--no-package-lock', tarball], { cwd: consumer, stdio: 'inherit' })
  writeFileSync(join(consumer, 'consumer.ts'), `
import type { Agent, AgentAcquireResultProjection, AgentAdmission, AgentRegistry, AgentRuntimeCapability } from '@cordisx/protocol/agents/v1'
import type { Session, SessionEvent, SessionRegistry, UserMessage } from '@cordisx/protocol/sessions/v1'
import type { ApprovalService } from '@cordisx/protocol/approval/v1'
import type { AgentConversationShellSnapshot } from '@cordisx/protocol/agent-conversation-shell/v3'

declare const agents: AgentRegistry
declare const sessions: SessionRegistry
declare const agent: Agent
declare const session: Session
declare const message: UserMessage
declare const admission: AgentAdmission
declare const projected: AgentAcquireResultProjection
declare const approvals: ApprovalService
declare const shell: AgentConversationShellSnapshot
const capability: AgentRuntimeCapability = 'sessions.subscribe'
agents.create({ mutationId: 'create-retry' })
agents.resume({ sessionId: session.id, mutationId: 'resume-retry' })
sessions.get(agent.session.id)
session.snapshot().then(result => { if (result.status === 'available') void session.read({ afterSeq: -1, snapshotSeq: result.snapshot.snapshotSeq }) })
session.subscribe({ afterSeq: -1 }, page => { page.events satisfies readonly SessionEvent[] })
agent.followup(message)
agent.discard(message.id)
approvals.request({ agent, toolName: 'shell' })
void [admission, projected, shell, capability]
`)
  execFileSync(process.execPath, [join(root, 'node_modules/typescript/bin/tsc'), '--noEmit', '--strict', '--module', 'NodeNext', '--moduleResolution', 'NodeNext', '--target', 'ES2023', join(consumer, 'consumer.ts')], { cwd: consumer, stdio: 'inherit' })
} finally {
  rmSync(work, { recursive: true, force: true })
}

console.log('CordisX Protocol distribution check passed')
