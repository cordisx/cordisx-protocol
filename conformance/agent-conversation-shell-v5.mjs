import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const schemaNames = [
  'ui-common.v1.schema.json',
  'agent-avatar.v1.schema.json',
  'session-common.v1.schema.json',
  'agents-common.v1.schema.json',
  'agent-loop-common.v1.schema.json',
  'platform-model.v1.schema.json',
  'agent-definition.v1.schema.json',
  'agent-conversation-shell-common.v2.schema.json',
  'agent-conversation-shell-common.v5.schema.json',
  'agent-conversation-shell-binding.v5.schema.json',
  'agent-conversation-shell-snapshot.v5.schema.json',
  'agent-conversation-shell-subscription.v5.schema.json',
  'agent-conversation-shell-subscription-close.v5.schema.json',
  'agent-conversation-shell-page.v5.schema.json',
  'agent-conversation-shell-result.v5.schema.json',
  'agent-conversation-shell-command-context.v5.schema.json',
  'agent-conversation-shell-room-settings-request.v5.schema.json',
  'agent-conversation-shell-room-settings-result.v5.schema.json',
  'agent-conversation-shell-room-collection-leading-visual.v5.schema.json',
]
const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true })
addFormats(ajv)
const schemas = new Map()
for (const name of schemaNames) {
  const schema = JSON.parse(await readFile(path.join(root, 'schemas', name), 'utf8'))
  schemas.set(name, schema)
  ajv.addSchema(schema)
}
for (const name of schemaNames.filter(name => name.includes('agent-conversation-shell') && name.includes('.v4.'))) {
  assert.ok(ajv.getSchema(schemas.get(name).$id), `${name} must compile under strict AJV`)
}
const validateSnapshot = ajv.getSchema(schemas.get('agent-conversation-shell-snapshot.v5.schema.json').$id)
const validateClose = ajv.getSchema(schemas.get('agent-conversation-shell-subscription-close.v5.schema.json').$id)
assert.ok(validateSnapshot)
assert.ok(validateClose)
const errors = (validate, value) =>
  validate(value) ? [] : (validate.errors ?? []).map(error => `${error.instancePath || '/'} ${error.message}`)

const participant = {
  participantId: 'participant-reviewer',
  role: 'agent',
  displayName: { key: 'agent.reviewer', fallback: 'Reviewer' },
  agentIdentity: { agentId: 'reviewer', revision: '1' },
}
const activeRun = {
  participantId: participant.participantId,
  memberId: 'member-reviewer',
  runId: 'run-reviewer',
  sessionId: 'session-reviewer',
  lifecycle: { phase: 'running', updatedAt: '2026-09-03T00:00:00.000Z' },
  details: { kind: 'host', ref: 'agent-detail-reviewer' },
}
const approval = {
  kind: 'approval',
  itemId: 'approval-item-1',
  sequence: 1,
  participantId: participant.participantId,
  memberId: activeRun.memberId,
  runId: activeRun.runId,
  sessionId: activeRun.sessionId,
  agentGeneration: 2,
  approvalId: 'approval-1',
  approvalKind: 'command',
  state: 'pending',
  actions: [{
    decision: 'approve',
    command: { id: 'chatroom.approval.approve', arguments: { approvalId: 'approval-1' } },
  }],
}
const introduction = {
  kind: 'message',
  itemId: 'message-item-introduction-1',
  messageId: 'message-output-1',
  sequence: 2,
  source: { kind: 'session-event', sessionId: activeRun.sessionId, eventSeq: 17 },
  semantic: {
    purpose: 'member-self-introduction',
    correlation: { sessionId: activeRun.sessionId, requestMessageId: 'message-request-1' },
    participantId: participant.participantId,
    memberId: activeRun.memberId,
    runId: activeRun.runId,
  },
  author: participant,
  body: [{ kind: 'text', text: { key: 'message.introduction', fallback: 'Hello.' } }],
  reactions: [],
  timestamp: '2026-09-03T00:00:01.000Z',
  deliveryState: 'delivered',
  runState: 'idle',
  ariaLive: 'off',
  actions: [],
}
const snapshot = {
  $schema: schemas.get('agent-conversation-shell-snapshot.v5.schema.json').$id,
  contract: 'cordisx.agent-conversation-shell-snapshot/v5',
  schemaVersion: 5,
  binding: { bindingId: 'shell-binding-1', ownerGeneration: 'owner-1' },
  generation: 'shell-1',
  snapshotSequence: 2,
  selection: {
    kind: 'room',
    roomId: 'room-1',
    title: { key: 'room.title', fallback: 'Review room' },
    multiParticipant: true,
    participantPresentation: 'host-initials',
    participants: [participant],
    activeRuns: [activeRun],
  },
  items: [approval, introduction],
  composer: {
    availability: 'available',
    placeholder: { key: 'composer.placeholder', fallback: 'Message the room' },
    disabled: { value: false },
    shortcutPolicy: 'enter',
    submit: { id: 'chatroom.message.submit' },
  },
  headerActions: [],
}

export function semanticErrors(value) {
  const issues = []
  if (value.selection?.kind !== 'room') return issues
  const runs = new Set(
    (value.selection.activeRuns ?? []).map(run =>
      [run.participantId, run.memberId, run.runId, run.sessionId].join('\u0000')
    ),
  )
  for (const item of value.items ?? []) {
    if (item.kind === 'approval') {
      const key = [item.participantId, item.memberId, item.runId, item.sessionId].join('\u0000')
      if (!runs.has(key)) issues.push('approval must match one exact active Session run')
    }
    if (item.kind === 'message' && item.semantic?.purpose === 'member-self-introduction') {
      const key = [
        item.semantic.participantId,
        item.semantic.memberId,
        item.semantic.runId,
        item.semantic.correlation.sessionId,
      ].join('\u0000')
      if (!runs.has(key)) issues.push('self-introduction must match one exact active Session run')
      if (item.source?.kind !== 'session-event' || item.source.sessionId !== item.semantic.correlation.sessionId) {
        issues.push('self-introduction correlation must match its SessionEvent source')
      }
    }
  }
  return issues
}

assert.deepEqual(errors(validateSnapshot, snapshot), [])
assert.deepEqual(semanticErrors(snapshot), [])
assert.deepEqual(structuredClone(snapshot), snapshot)

const missingShortcut = structuredClone(snapshot)
delete missingShortcut.composer.shortcutPolicy
assert.notDeepEqual(errors(validateSnapshot, missingShortcut), [], 'v5 requires an explicit shortcut policy')

const unknownShortcut = structuredClone(snapshot)
unknownShortcut.composer.shortcutPolicy = 'shift-enter'
assert.notDeepEqual(errors(validateSnapshot, unknownShortcut), [], 'unknown shortcut policies fail closed')

const secondSubmitCommand = structuredClone(snapshot)
secondSubmitCommand.composer.submitWithModifier = { id: 'chatroom.message.submit-with-modifier' }
assert.notDeepEqual(errors(validateSnapshot, secondSubmitCommand), [], 'shortcut policy is not a second submit command')

const unknownSchema = structuredClone(snapshot)
unknownSchema.$schema = 'https://example.invalid/agent-conversation-shell-snapshot.v5.schema.json'
assert.notDeepEqual(errors(validateSnapshot, unknownSchema), [], 'unknown schema identity fails closed')

export function migrateV4ComposerToV5(value) {
  return {
    ...structuredClone(value),
    $schema: schemas.get('agent-conversation-shell-snapshot.v5.schema.json').$id,
    contract: 'cordisx.agent-conversation-shell-snapshot/v5',
    schemaVersion: 5,
    composer: { ...structuredClone(value.composer), shortcutPolicy: 'enter' },
  }
}
const v4Snapshot = structuredClone(snapshot)
v4Snapshot.$schema =
  'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/agent-conversation-shell-snapshot.v4.schema.json'
v4Snapshot.contract = 'cordisx.agent-conversation-shell-snapshot/v4'
v4Snapshot.schemaVersion = 4
delete v4Snapshot.composer.shortcutPolicy
const migratedSnapshot = migrateV4ComposerToV5(v4Snapshot)
assert.equal(migratedSnapshot.composer.shortcutPolicy, 'enter')
assert.deepEqual(errors(validateSnapshot, migratedSnapshot), [])

export function shouldSubmitComposerKey(shortcutPolicy, event) {
  if (event.isComposing || event.key !== 'Enter') return false
  if (shortcutPolicy === 'enter') return event.shiftKey !== true
  if (shortcutPolicy === 'mod-enter') return event.metaKey === true || event.ctrlKey === true
  return false
}
assert.equal(shouldSubmitComposerKey('enter', { key: 'Enter' }), true)
assert.equal(shouldSubmitComposerKey('enter', { key: 'Enter', shiftKey: true }), false)
assert.equal(shouldSubmitComposerKey('mod-enter', { key: 'Enter' }), false)
assert.equal(shouldSubmitComposerKey('mod-enter', { key: 'Enter', metaKey: true }), true)
assert.equal(shouldSubmitComposerKey('mod-enter', { key: 'Enter', ctrlKey: true }), true)
assert.equal(shouldSubmitComposerKey('enter', { key: 'Enter', isComposing: true }), false)
assert.equal(shouldSubmitComposerKey('mod-enter', { key: 'Enter', metaKey: true, isComposing: true }), false)
assert.equal(shouldSubmitComposerKey('shift-enter', { key: 'Enter' }), false)

for (
  const [label, mutate] of [
    ['details URL', value => {
      value.selection.activeRuns[0].detailsUrl = { target: 'host', url: 'app://-/agent' }
    }],
    ['raw navigation URL', value => {
      value.selection.activeRuns[0].details.ref = 'https://example.test/agent'
    }],
    ['AgentLoop approval binding', value => {
      value.items[0].binding = { bindingId: 'legacy', generation: 1 }
    }],
    ['AgentLoop approval turn', value => {
      value.items[0].turn = 'turn-1'
    }],
    ['legacy message source', value => {
      value.items[1].source = 'agent-loop'
    }],
    ['AgentLoop introduction binding', value => {
      value.items[1].semantic.binding = { bindingId: 'legacy', generation: 1 }
    }],
  ]
) {
  const invalid = structuredClone(snapshot)
  mutate(invalid)
  assert.notDeepEqual(errors(validateSnapshot, invalid), [], `${label} must fail closed`)
}

const mismatched = structuredClone(snapshot)
mismatched.items[1].semantic.correlation.sessionId = 'other-session'
assert.deepEqual(errors(validateSnapshot, mismatched), [])
assert.notDeepEqual(
  semanticErrors(mismatched),
  [],
  'cross-Session self-introduction correlation must fail semantic conformance',
)

const close = code => ({
  $schema: schemas.get('agent-conversation-shell-subscription-close.v5.schema.json').$id,
  contract: 'cordisx.agent-conversation-shell-subscription-close/v5',
  schemaVersion: 5,
  subscriptionId: 'subscription-1',
  binding: snapshot.binding,
  generation: snapshot.generation,
  status: 'closed',
  code,
})
for (
  const code of [
    'unsubscribed',
    'explicit',
    'owner-disposed',
    'generation-replaced',
    'permission-revoked',
    'connection-replaced',
    'observer-failed',
  ]
) assert.deepEqual(errors(validateClose, close(code)), [])
assert.notDeepEqual(errors(validateClose, close('silently-disposed')), [])

export function subscriptionLifecycleErrors(deliveries) {
  const issues = []
  let closed = false
  for (const delivery of deliveries) {
    if (delivery.kind === 'closed') {
      if (closed) issues.push('second terminal close')
      closed = true
    } else if (closed) issues.push('page began after terminal close')
  }
  return issues
}
assert.deepEqual(subscriptionLifecycleErrors([{ kind: 'page' }, { kind: 'closed', value: close('unsubscribed') }]), [])
assert.notDeepEqual(
  subscriptionLifecycleErrors([{ kind: 'closed', value: close('connection-replaced') }, { kind: 'page' }]),
  [],
)
assert.notDeepEqual(
  subscriptionLifecycleErrors([{ kind: 'closed', value: close('connection-replaced') }, {
    kind: 'closed',
    value: close('unsubscribed'),
  }]),
  [],
)

const frozenV3Files = [
  ...(await readdir(path.join(root, 'schemas'))).filter(name =>
    /^agent-conversation-shell-.*\.v3\.schema\.json$/u.test(name)
  ).map(name => `schemas/${name}`),
  'types/agent-conversation-shell.v3.d.ts',
].sort()
const digest = createHash('sha256')
for (const file of frozenV3Files) {
  digest.update(file)
  digest.update('\0')
  digest.update(await readFile(path.join(root, file)))
  digest.update('\0')
}
assert.equal(
  digest.digest('hex'),
  '4513266ec7c5e2a2514556c795a2c20b1fc27127a79b0904f308ac6a52e855f3',
  'Agent Conversation Shell v3 public bytes drifted',
)

const frozenV4Files = [
  ...(await readdir(path.join(root, 'schemas'))).filter(name =>
    /^agent-conversation-shell-.*\.v4\.schema\.json$/u.test(name)
  ).map(name => `schemas/${name}`),
  'types/agent-conversation-shell.v4.d.ts',
].sort()
const v4Digest = createHash('sha256')
for (const file of frozenV4Files) {
  v4Digest.update(file)
  v4Digest.update('\0')
  v4Digest.update(await readFile(path.join(root, file)))
  v4Digest.update('\0')
}
assert.equal(
  v4Digest.digest('hex'),
  '44ba5feba050e5b051ea6b8ec369c96bea0cea3f1a3cf244319e4dd66c22aded',
  'Agent Conversation Shell v4 public bytes drifted',
)

for (const v5Name of schemaNames.filter(name => name.includes('agent-conversation-shell') && name.includes('.v5.'))) {
  const v4Name = v5Name.replace('.v5.', '.v4.')
  const v4Schema = JSON.parse(await readFile(path.join(root, 'schemas', v4Name), 'utf8'))
  const v5Schema = structuredClone(schemas.get(v5Name))
  if (v5Name === 'agent-conversation-shell-snapshot.v5.schema.json') {
    v5Schema.$defs.composer.required = v5Schema.$defs.composer.required.filter(name => name !== 'shortcutPolicy')
    delete v5Schema.$defs.composer.properties.shortcutPolicy
  }
  const normalized = JSON.parse(
    JSON.stringify(v5Schema)
      .replaceAll('.v5.schema.json', '.v4.schema.json')
      .replaceAll('/v5', '/v4')
      .replaceAll(' v5', ' v4'),
  )
  if (normalized.properties?.schemaVersion) normalized.properties.schemaVersion.const = 4
  assert.deepEqual(normalized, v4Schema, `${v5Name} must preserve the complete v4 shape outside shortcutPolicy`)
}

const v5PublicFiles = [
  ...(await readdir(path.join(root, 'schemas'))).filter(name =>
    /^agent-conversation-shell-.*\.v5\.schema\.json$/u.test(name)
  ).map(name => path.join(root, 'schemas', name)),
  path.join(root, 'types', 'agent-conversation-shell.v5.d.ts'),
]
for (const file of v5PublicFiles) {
  const source = await readFile(file, 'utf8')
  assert.ok(
    !/agent-loop|detailsUrl|AgentLoop/u.test(source),
    `${path.basename(file)} leaked the legacy runtime shape into v5`,
  )
  assert.ok(
    !/DeepSeek|Harness|DSH|pi-agent/iu.test(source),
    `${path.basename(file)} leaked an external reference-project name`,
  )
}

console.log('Agent Conversation Shell v5 composer shortcut and v4 compatibility conformance passed')
