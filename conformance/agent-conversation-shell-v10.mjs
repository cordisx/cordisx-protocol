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
const validate = ajv.getSchema(prefix + 'agent-conversation-plugin-command-message.v1.schema.json')
const item = {
  kind: 'message',
  itemId: 'item-one',
  messageId: 'room-message-one',
  sequence: 2,
  source: {
    kind: 'plugin-command',
    roomId: 'room-one',
    messageId: 'room-message-one',
    participantId: 'agent-one',
    memberId: 'member-one',
    runId: 'run-one',
    sessionId: 'session-one',
    operationId: 'operation-one',
    sequence: 1,
  },
  semantic: { purpose: 'conversation' },
  author: { participantId: 'agent-one', role: 'agent', displayName: { key: 'agent.one', fallback: 'Agent' } },
  body: [{ kind: 'text', text: { key: 'message.one', fallback: 'CLI report' } }],
  reactions: [],
  timestamp: '2026-09-07T00:00:00Z',
  deliveryState: 'sent',
  runState: 'idle',
  ariaLive: 'off',
  actions: [],
}
assert.equal(validate(item), true, JSON.stringify(validate.errors))
for (
  const source of [{ ...item.source, eventSeq: 1 }, { ...item.source, sequence: 0 }, {
    ...item.source,
    kind: 'session-event',
  }]
) {
  assert.equal(validate({ ...item, source }), false)
}
const old = ajv.compile({ $ref: prefix + 'agent-conversation-shell-snapshot.v7.schema.json#/$defs/messageItem' })
assert.equal(old(item), false)
assert.ok(ajv.getSchema(prefix + 'agent-conversation-shell-snapshot.v10.schema.json'))
assert.ok(ajv.getSchema(prefix + 'agent-conversation-shell-page.v10.schema.json'))
console.log('Shell v10 plugin command message conformance passed')
