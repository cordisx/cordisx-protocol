import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import Ajv from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'
const root = new URL('../schemas/', import.meta.url)
const ajv = new Ajv({ strict: true, allErrors: true, allowUnionTypes: true })
addFormats(ajv)
for (const file of await readdir(root)) {
  if (file.endsWith('.json')) ajv.addSchema(JSON.parse(await readFile(new URL(file, root), 'utf8')))
}
const prefix = 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/'
const validate = ajv.compile({ $ref: prefix + 'agent-conversation-shell-snapshot.v12.schema.json#/$defs/selection' })
const association = {
  participantId: 'agent',
  memberId: 'member-1',
  runId: 'run-1',
  sessionId: 'cx-session.original',
  state: 'unloaded',
  details: { kind: 'host', ref: 'opaque-original' },
}
const selection = {
  kind: 'room',
  roomId: 'room-1',
  title: { key: 'room', fallback: 'Room' },
  multiParticipant: true,
  participantPresentation: 'host-initials',
  participants: [{
    participantId: 'agent',
    role: 'agent',
    displayName: { key: 'agent', fallback: 'Agent' },
    agentIdentity: { agentId: 'agent', revision: 'original' },
  }],
  associatedSessions: [association],
}
assert.equal(validate(selection), true, JSON.stringify(validate.errors))
assert.equal(validate({ ...selection, associatedSessions: [{ ...association, state: 'active' }] }), false)
assert.equal(validate({ ...selection, associatedSessions: [{ ...association, threadId: 'forged' }] }), false)
assert.equal(validate({ kind: 'no-room', associatedSessions: [association] }), false)
assert.equal(
  ajv.compile({ $ref: prefix + 'agent-conversation-shell-snapshot.v11.schema.json#/properties/selection' })(selection),
  false,
)
assert.ok(ajv.getSchema(prefix + 'agent-conversation-shell-snapshot.v12.schema.json'))
assert.ok(ajv.getSchema(prefix + 'agent-conversation-shell-page.v12.schema.json'))
console.log('Shell v12 persisted Session association conformance passed')
