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
  'approval-common.v2.schema.json',
  'agent-conversation-shell-common.v2.schema.json',
  ...[
    'common',
    'binding',
    'snapshot',
    'subscription',
    'subscription-close',
    'page',
    'result',
    'command-context',
    'room-settings-request',
    'room-settings-result',
    'room-collection-leading-visual',
  ].map(name => `agent-conversation-shell-${name}.v7.schema.json`),
]
const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true })
addFormats(ajv)
const schemas = new Map()
for (const name of schemaNames) {
  const schema = JSON.parse(await readFile(path.join(root, 'schemas', name), 'utf8'))
  schemas.set(name, schema)
  ajv.addSchema(schema)
}
for (const name of schemaNames.filter(name => name.includes('.v7.'))) {
  assert.ok(ajv.getSchema(schemas.get(name).$id), `${name} must compile under strict AJV`)
}
const validateSnapshot = ajv.getSchema(schemas.get('agent-conversation-shell-snapshot.v7.schema.json').$id)
const validateCommandContext = ajv.getSchema(schemas.get('agent-conversation-shell-command-context.v7.schema.json').$id)
const errors = (validate, value) =>
  validate(value) ? [] : (validate.errors ?? []).map(error => `${error.instancePath || '/'} ${error.message}`)

const reviewer = {
  participantId: 'participant-reviewer',
  role: 'agent',
  displayName: { key: 'agent.reviewer', fallback: 'Reviewer' },
  agentIdentity: { agentId: 'reviewer', revision: 'reviewer-r4' },
}
const lead = {
  participantId: 'participant-lead',
  role: 'agent',
  displayName: { key: 'agent.lead', fallback: 'Lead' },
  agentIdentity: { agentId: 'lead', revision: 'lead-r2' },
}
const reviewerRun = {
  participantId: reviewer.participantId,
  memberId: 'member-reviewer',
  runId: 'run-reviewer',
  sessionId: 'session-reviewer',
  lifecycle: { phase: 'waiting' },
}
const leadRun = {
  participantId: lead.participantId,
  memberId: 'member-lead',
  runId: 'run-lead',
  sessionId: 'session-lead',
  lifecycle: { phase: 'running' },
}
const authorityBinding = {
  agentId: leadRun.sessionId,
  sessionId: leadRun.sessionId,
  agentGeneration: 7,
  definition: lead.agentIdentity,
}
const pending = {
  kind: 'approval',
  itemId: 'approval-item-1',
  sequence: 9,
  participantId: reviewer.participantId,
  memberId: reviewerRun.memberId,
  runId: reviewerRun.runId,
  sessionId: reviewerRun.sessionId,
  agentGeneration: 4,
  approvalId: 'approval-1',
  approvalKind: 'command',
  requester: reviewer.agentIdentity,
  authority: { participantId: lead.participantId, memberId: leadRun.memberId, identity: lead.agentIdentity },
  authorityBinding,
  reason: { kind: 'plain-text', text: 'Please review the proposed change.' },
  state: 'pending',
  actions: [
    { decision: 'approve', command: { id: 'chatroom.approval.approve' } },
    { decision: 'reject', command: { id: 'chatroom.approval.reject' } },
  ],
}
const snapshot = {
  $schema: schemas.get('agent-conversation-shell-snapshot.v7.schema.json').$id,
  contract: 'cordisx.agent-conversation-shell-snapshot/v7',
  schemaVersion: 7,
  binding: { bindingId: 'binding-1', ownerGeneration: 'owner-1' },
  generation: 'shell-1',
  snapshotSequence: 9,
  selection: {
    kind: 'room',
    roomId: 'room-1',
    title: { key: 'room.title', fallback: 'Review room' },
    multiParticipant: true,
    participantPresentation: 'host-initials',
    participants: [reviewer, lead],
    activeRuns: [reviewerRun, leadRun],
  },
  items: [pending],
  composer: {
    availability: 'available',
    placeholder: { key: 'composer.placeholder', fallback: 'Message the room' },
    disabled: { value: false },
    shortcutPolicy: 'enter',
    submit: { id: 'chatroom.message.submit' },
  },
  headerActions: [],
}

export function approvalBubbleErrors(value) {
  const issues = []
  if (value.selection?.kind !== 'room') return issues
  const participants = new Map(
    value.selection.participants.map(participant => [participant.participantId, participant]),
  )
  for (const item of value.items.filter(item => item.kind === 'approval')) {
    const requester = participants.get(item.participantId)
    const authority = participants.get(item.authority.participantId)
    if (requester?.role !== 'agent' || JSON.stringify(requester.agentIdentity) !== JSON.stringify(item.requester)) {
      issues.push('requester participant identity mismatch')
    }
    if (
      authority?.role !== 'agent' || JSON.stringify(authority.agentIdentity) !== JSON.stringify(item.authority.identity)
    ) issues.push('authority participant identity mismatch')
    if (item.state === 'pending') {
      if (item.authorityBinding.agentId !== item.authorityBinding.sessionId) {
        issues.push('authority AgentId must equal SessionId')
      }
      if (JSON.stringify(item.authorityBinding.definition) !== JSON.stringify(item.authority.identity)) {
        issues.push('live authority definition mismatch')
      }
    }
  }
  return issues
}

assert.deepEqual(errors(validateSnapshot, snapshot), [])
assert.deepEqual(approvalBubbleErrors(snapshot), [])
assert.deepEqual(structuredClone(snapshot), snapshot)

for (
  const [label, mutate] of [
    ['missing authority binding', value => {
      delete value.items[0].authorityBinding
    }],
    ['missing requester generation', value => {
      delete value.items[0].agentGeneration
    }],
    ['cancel action', value => {
      value.items[0].actions[1].decision = 'cancel'
    }],
    ['reversed actions', value => {
      value.items[0].actions.reverse()
    }],
    ['single action', value => {
      value.items[0].actions.pop()
    }],
    ['localized rationale', value => {
      value.items[0].rationale = { key: 'scenario.label', fallback: 'Scenario' }
    }],
    ['display-name authority', value => {
      value.items[0].authorityName = 'Lead'
    }],
    ['wildcard authority', value => {
      value.items[0].authority.identity.revision = '*'
    }],
  ]
) {
  const invalid = structuredClone(snapshot)
  mutate(invalid)
  assert.notDeepEqual(errors(validateSnapshot, invalid), [], `${label} must fail closed`)
}

const mismatchedAuthority = structuredClone(snapshot)
mismatchedAuthority.items[0].authorityBinding.definition = reviewer.agentIdentity
assert.deepEqual(errors(validateSnapshot, mismatchedAuthority), [])
assert.notDeepEqual(
  approvalBubbleErrors(mismatchedAuthority),
  [],
  'live authority must equal the durable exact identity',
)

const terminal = { ...structuredClone(pending), state: 'approved', actions: [] }
delete terminal.agentGeneration
delete terminal.authorityBinding
const terminalSnapshot = structuredClone(snapshot)
terminalSnapshot.items = [terminal]
assert.deepEqual(errors(validateSnapshot, terminalSnapshot), [])
assert.deepEqual(approvalBubbleErrors(terminalSnapshot), [])
assert.equal(terminal.itemId, pending.itemId, 'terminal update preserves the item identity')
assert.equal(terminal.authority.identity.agentId, 'lead')
assert.equal(Object.hasOwn(terminal, 'authorityBinding'), false, 'terminal replay never reconstructs live authority')

const actionableTerminal = structuredClone(terminalSnapshot)
actionableTerminal.items[0].actions = pending.actions
assert.notDeepEqual(errors(validateSnapshot, actionableTerminal), [], 'terminal approval is actionless')

const commandContext = {
  $schema: schemas.get('agent-conversation-shell-command-context.v7.schema.json').$id,
  contract: 'cordisx.agent-conversation-shell-command-context/v7',
  schemaVersion: 7,
  binding: snapshot.binding,
  generation: snapshot.generation,
  scope: 'approval',
  itemId: pending.itemId,
  command: pending.actions[0].command,
  approval: {
    sessionId: pending.sessionId,
    approvalId: pending.approvalId,
    requester: pending.requester,
    authority: pending.authorityBinding,
    decision: 'approve',
  },
}
assert.deepEqual(errors(validateCommandContext, commandContext), [])
export function commandContextErrors(item, context) {
  const issues = []
  if (
    context.scope !== 'approval' || context.itemId !== item.itemId || context.approval.sessionId !== item.sessionId
    || context.approval.approvalId !== item.approvalId
  ) issues.push('approval item identity mismatch')
  if (JSON.stringify(context.approval.requester) !== JSON.stringify(item.requester)) {
    issues.push('requester identity mismatch')
  }
  if (JSON.stringify(context.approval.authority) !== JSON.stringify(item.authorityBinding)) {
    issues.push('live authority binding mismatch')
  }
  const action = item.actions.find(value => value.decision === context.approval.decision)
  if (!action || JSON.stringify(action.command) !== JSON.stringify(context.command)) {
    issues.push('approval decision command mismatch')
  }
  return issues
}
assert.deepEqual(commandContextErrors(pending, commandContext), [])
for (
  const mutate of [
    value => {
      delete value.approval
    },
    value => {
      value.approval.authority.agentGeneration += 1
    },
    value => {
      value.approval.decision = 'cancel'
    },
  ]
) {
  const invalid = structuredClone(commandContext)
  mutate(invalid)
  if (errors(validateCommandContext, invalid).length === 0) {
    assert.notDeepEqual(
      commandContextErrors(pending, invalid),
      [],
      'well-shaped but stale authority must fail semantic fencing',
    )
  } else assert.notDeepEqual(errors(validateCommandContext, invalid), [])
}

const predecessorDigests = new Map([
  [1, 'aa47bd93ecce47350c9e99baa32c6f68ee0209f2779a28cd5265975fc874495e'],
  [2, '2c3660a4b505732e587b126ca4be4061cd32109257b645a1d0dadd077c749afc'],
  [3, '4513266ec7c5e2a2514556c795a2c20b1fc27127a79b0904f308ac6a52e855f3'],
  [4, '44ba5feba050e5b051ea6b8ec369c96bea0cea3f1a3cf244319e4dd66c22aded'],
  [5, '00ab89073630b92894875b44669b6cc10e09616d1d1dd161ef05334b56986c13'],
  [6, '2f8838319a24440446b8e3e9b6ac1fc6749551b54210d472c24d9fb54cb531c8'],
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

for (const v7Name of schemaNames.filter(name => name.includes('agent-conversation-shell') && name.includes('.v7.'))) {
  if (v7Name.endsWith('snapshot.v7.schema.json') || v7Name.endsWith('command-context.v7.schema.json')) continue
  const v6Name = v7Name.replace('.v7.', '.v6.')
  const v6Schema = JSON.parse(await readFile(path.join(root, 'schemas', v6Name), 'utf8'))
  const normalized = JSON.parse(
    JSON.stringify(schemas.get(v7Name)).replaceAll('.v7.schema.json', '.v6.schema.json').replaceAll('/v7', '/v6')
      .replaceAll(' v7', ' v6'),
  )
  if (normalized.properties?.schemaVersion) normalized.properties.schemaVersion.const = 6
  assert.deepEqual(normalized, v6Schema, `${v7Name} must preserve its complete v6 shape`)
}

const v7PublicFiles = [
  ...(await readdir(path.join(root, 'schemas'))).filter(name =>
    /^agent-conversation-shell-.*\.v7\.schema\.json$/u.test(name)
  ).map(name => path.join(root, 'schemas', name)),
  path.join(root, 'types', 'agent-conversation-shell.v7.d.ts'),
]
for (const file of v7PublicFiles) {
  const source = await readFile(file, 'utf8')
  assert.ok(
    !/DeepSeek|Harness|DSH|pi-agent/iu.test(source),
    `${path.basename(file)} leaked an external reference-project name`,
  )
}

console.log('Agent Conversation Shell v7 exact requester-authority approval bubble conformance passed')
