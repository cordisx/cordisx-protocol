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
  'agent-conversation-shell-common.v6.schema.json',
  'agent-conversation-shell-binding.v6.schema.json',
  'agent-conversation-shell-snapshot.v6.schema.json',
  'agent-conversation-shell-subscription.v6.schema.json',
  'agent-conversation-shell-subscription-close.v6.schema.json',
  'agent-conversation-shell-page.v6.schema.json',
  'agent-conversation-shell-result.v6.schema.json',
  'agent-conversation-shell-command-context.v6.schema.json',
  'agent-conversation-shell-room-settings-request.v6.schema.json',
  'agent-conversation-shell-room-settings-result.v6.schema.json',
  'agent-conversation-shell-room-collection-leading-visual.v6.schema.json',
]
const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true })
addFormats(ajv)
const schemas = new Map()
for (const name of schemaNames) {
  const schema = JSON.parse(await readFile(path.join(root, 'schemas', name), 'utf8'))
  schemas.set(name, schema)
  ajv.addSchema(schema)
}
for (const name of schemaNames.filter(name => name.includes('agent-conversation-shell') && name.includes('.v6.'))) {
  assert.ok(ajv.getSchema(schemas.get(name).$id), `${name} must compile under strict AJV`)
}
const validateSnapshot = ajv.getSchema(schemas.get('agent-conversation-shell-snapshot.v6.schema.json').$id)
const validateClose = ajv.getSchema(schemas.get('agent-conversation-shell-subscription-close.v6.schema.json').$id)
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
  lifecycle: { phase: 'running', updatedAt: '2026-09-04T00:00:00.000Z' },
  details: { kind: 'host', ref: 'agent-detail-reviewer' },
}
const pendingApproval = {
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
const snapshot = {
  $schema: schemas.get('agent-conversation-shell-snapshot.v6.schema.json').$id,
  contract: 'cordisx.agent-conversation-shell-snapshot/v6',
  schemaVersion: 6,
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
  items: [pendingApproval],
  composer: {
    availability: 'available',
    placeholder: { key: 'composer.placeholder', fallback: 'Message the room' },
    disabled: { value: false },
    shortcutPolicy: 'enter',
    submit: { id: 'chatroom.message.submit' },
  },
  headerActions: [],
}

assert.deepEqual(errors(validateSnapshot, snapshot), [])
assert.deepEqual(structuredClone(snapshot), snapshot)

const pendingWithoutGeneration = structuredClone(snapshot)
delete pendingWithoutGeneration.items[0].agentGeneration
assert.notDeepEqual(
  errors(validateSnapshot, pendingWithoutGeneration),
  [],
  'pending approval requires exact live Agent generation',
)

const pendingWithoutActions = structuredClone(snapshot)
pendingWithoutActions.items[0].actions = []
assert.notDeepEqual(
  errors(validateSnapshot, pendingWithoutActions),
  [],
  'pending approval cannot degrade to an actionless card',
)

const outcomeToState = new Map([
  ['allowed-once', 'approved'],
  ['rejected', 'denied'],
  ['cancelled', 'cancelled'],
  ['unavailable', 'failed'],
])

export function projectDurableTerminalApproval({ sessionId, approvalId, events, diagnostic }) {
  const matching = events.filter(event =>
    event.sessionId === sessionId && event.data?.id === approvalId
    && (event.type === 'approval/asked' || event.type === 'approval/decided')
  )
  const asked = matching.filter(event => event.type === 'approval/asked')
  const decided = matching.filter(event => event.type === 'approval/decided')
  if (asked.length !== 1 || decided.length !== 1 || asked[0].seq >= decided[0].seq) {
    throw new Error('approval correlation unavailable')
  }
  const state = outcomeToState.get(decided[0].data.outcome)
  if (!state) throw new Error('approval outcome unavailable')
  const item = {
    kind: 'approval',
    itemId: `approval-item-${approvalId}`,
    sequence: decided[0].seq,
    participantId: participant.participantId,
    memberId: activeRun.memberId,
    runId: activeRun.runId,
    sessionId,
    approvalId,
    approvalKind: 'command',
    state,
    actions: [],
  }
  if (state === 'failed') {
    item.diagnostic = diagnostic ?? { key: 'approval.unavailable', fallback: 'Approval unavailable' }
  }
  return item
}

const asked = {
  sessionId: activeRun.sessionId,
  seq: 17,
  type: 'approval/asked',
  data: { id: 'approval-1', toolName: 'shell' },
}
const terminalEvents = [asked, {
  sessionId: activeRun.sessionId,
  seq: 18,
  type: 'approval/decided',
  data: { id: 'approval-1', outcome: 'allowed-once' },
}]
for (const [outcome, state] of outcomeToState) {
  const events = [asked, {
    sessionId: activeRun.sessionId,
    seq: 18,
    type: 'approval/decided',
    data: { id: 'approval-1', outcome },
  }]
  const terminal = projectDurableTerminalApproval({ sessionId: activeRun.sessionId, approvalId: 'approval-1', events })
  assert.equal(terminal.state, state)
  assert.deepEqual(terminal.actions, [])
  assert.equal(
    Object.hasOwn(terminal, 'agentGeneration'),
    false,
    'durable replay must not synthesize an Agent generation',
  )
  const terminalSnapshot = structuredClone(snapshot)
  terminalSnapshot.items = [terminal]
  assert.deepEqual(
    errors(validateSnapshot, terminalSnapshot),
    [],
    `${state} terminal approval without generation must validate`,
  )
  assert.deepEqual(structuredClone(terminalSnapshot), terminalSnapshot)
}

const terminalWithKnownGeneration = projectDurableTerminalApproval({
  sessionId: activeRun.sessionId,
  approvalId: 'approval-1',
  events: terminalEvents,
})
terminalWithKnownGeneration.agentGeneration = 2
const terminalWithKnownGenerationSnapshot = structuredClone(snapshot)
terminalWithKnownGenerationSnapshot.items = [terminalWithKnownGeneration]
assert.deepEqual(
  errors(validateSnapshot, terminalWithKnownGenerationSnapshot),
  [],
  'a separately authoritative terminal generation remains representable',
)

const actionableTerminal = structuredClone(terminalWithKnownGenerationSnapshot)
actionableTerminal.items[0].actions = pendingApproval.actions
assert.notDeepEqual(
  errors(validateSnapshot, actionableTerminal),
  [],
  'terminal approvals are immutable and non-invokable',
)

assert.throws(
  () => projectDurableTerminalApproval({ sessionId: activeRun.sessionId, approvalId: 'approval-1', events: [asked] }),
  /correlation unavailable/u,
  'approval/asked alone cannot create a terminal item',
)
assert.throws(
  () =>
    projectDurableTerminalApproval({
      sessionId: activeRun.sessionId,
      approvalId: 'other-approval',
      events: terminalEvents,
    }),
  /correlation unavailable/u,
  'approval ids must match exactly',
)
assert.throws(
  () =>
    projectDurableTerminalApproval({ sessionId: 'other-session', approvalId: 'approval-1', events: terminalEvents }),
  /correlation unavailable/u,
  'Session ids must match exactly',
)
assert.throws(
  () =>
    projectDurableTerminalApproval({
      sessionId: activeRun.sessionId,
      approvalId: 'approval-1',
      events: [...terminalEvents, terminalEvents[1]],
    }),
  /correlation unavailable/u,
  'duplicate terminal facts fail closed',
)
assert.throws(
  () =>
    projectDurableTerminalApproval({
      sessionId: activeRun.sessionId,
      approvalId: 'approval-1',
      events: [asked, { ...terminalEvents[1], seq: 16 }],
    }),
  /correlation unavailable/u,
  'a decision that does not follow its question fails closed',
)

const unknownSchema = structuredClone(snapshot)
unknownSchema.$schema = 'https://example.invalid/agent-conversation-shell-snapshot.v6.schema.json'
assert.notDeepEqual(errors(validateSnapshot, unknownSchema), [], 'unknown schema identity fails closed')

const close = code => ({
  $schema: schemas.get('agent-conversation-shell-subscription-close.v6.schema.json').$id,
  contract: 'cordisx.agent-conversation-shell-subscription-close/v6',
  schemaVersion: 6,
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

const predecessorDigests = new Map([
  [1, 'aa47bd93ecce47350c9e99baa32c6f68ee0209f2779a28cd5265975fc874495e'],
  [2, '2c3660a4b505732e587b126ca4be4061cd32109257b645a1d0dadd077c749afc'],
  [3, '4513266ec7c5e2a2514556c795a2c20b1fc27127a79b0904f308ac6a52e855f3'],
  [4, '44ba5feba050e5b051ea6b8ec369c96bea0cea3f1a3cf244319e4dd66c22aded'],
  [5, '00ab89073630b92894875b44669b6cc10e09616d1d1dd161ef05334b56986c13'],
])
for (const [version, expected] of predecessorDigests) {
  const files = [
    ...(await readdir(path.join(root, 'schemas'))).filter(name =>
      new RegExp(`^agent-conversation-shell-.*\\.v${version}\\.schema\\.json$`, 'u').test(name)
    ).map(name => `schemas/${name}`),
    `types/agent-conversation-shell.v${version}.d.ts`,
  ].sort()
  const digest = createHash('sha256')
  for (const file of files) {
    digest.update(file)
    digest.update('\0')
    digest.update(await readFile(path.join(root, file)))
    digest.update('\0')
  }
  assert.equal(digest.digest('hex'), expected, `Agent Conversation Shell v${version} public bytes drifted`)
}

for (const v6Name of schemaNames.filter(name => name.includes('agent-conversation-shell') && name.includes('.v6.'))) {
  const v5Name = v6Name.replace('.v6.', '.v5.')
  const v5Schema = JSON.parse(await readFile(path.join(root, 'schemas', v5Name), 'utf8'))
  const normalized = JSON.parse(
    JSON.stringify(schemas.get(v6Name))
      .replaceAll('.v6.schema.json', '.v5.schema.json')
      .replaceAll('/v6', '/v5')
      .replaceAll(' v6', ' v5'),
  )
  if (normalized.properties?.schemaVersion) normalized.properties.schemaVersion.const = 5
  if (v6Name === 'agent-conversation-shell-snapshot.v6.schema.json') {
    normalized.$defs.approvalItem.required.splice(
      normalized.$defs.approvalItem.required.indexOf('sessionId') + 1,
      0,
      'agentGeneration',
    )
    delete normalized.$defs.approvalItem.allOf[0].then.required
    delete normalized.$defs.approvalItem.allOf[0].then.properties.agentGeneration
  }
  assert.deepEqual(
    normalized,
    v5Schema,
    `${v6Name} must preserve the complete v5 shape outside terminal approval generation`,
  )
}

const v6PublicFiles = [
  ...(await readdir(path.join(root, 'schemas'))).filter(name =>
    /^agent-conversation-shell-.*\.v6\.schema\.json$/u.test(name)
  ).map(name => path.join(root, 'schemas', name)),
  path.join(root, 'types', 'agent-conversation-shell.v6.d.ts'),
]
for (const file of v6PublicFiles) {
  const source = await readFile(file, 'utf8')
  assert.ok(
    !/agent-loop|detailsUrl|AgentLoop/u.test(source),
    `${path.basename(file)} leaked the legacy runtime shape into v6`,
  )
  assert.ok(
    !/DeepSeek|Harness|DSH|pi-agent/iu.test(source),
    `${path.basename(file)} leaked an external reference-project name`,
  )
}

console.log('Agent Conversation Shell v6 terminal approval replay and v1-v5 compatibility conformance passed')
