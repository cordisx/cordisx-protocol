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
const validate = ajv.getSchema(prefix + 'agent-conversation-room-user-message.v1.schema.json')
const item = {
  kind: 'message',
  itemId: 'message-1',
  messageId: 'message-2',
  sequence: 2,
  source: { kind: 'room-user-message', roomId: 'room-1', messageId: 'message-2', sequence: 2 },
  author: { participantId: 'user', role: 'human', displayName: { key: 'user', fallback: 'You' } },
  semantic: { purpose: 'conversation' },
  body: [{ kind: 'text', text: { key: 'message', fallback: 'hi' } }],
  reactions: [],
  timestamp: '2026-09-07T00:00:00Z',
  deliveryState: 'sent',
  runState: 'idle',
  ariaLive: 'off',
  actions: [],
}
assert.equal(validate(item), true, JSON.stringify(validate.errors))
assert.equal(validate({ ...item, author: { ...item.author, role: 'agent' } }), false)
assert.equal(validate({ ...item, source: { ...item.source, eventSeq: 1 } }), false)
assert.equal(validate({ ...item, semantic: { purpose: 'chatroom-acknowledgement' } }), false)
assert.equal(
  ajv.compile({ $ref: prefix + 'agent-conversation-shell-snapshot.v10.schema.json#/$defs/item' })(item),
  false,
)
assert.ok(ajv.getSchema(prefix + 'agent-conversation-shell-snapshot.v11.schema.json'))
assert.ok(ajv.getSchema(prefix + 'agent-conversation-shell-page.v11.schema.json'))
console.log('Shell v11 persisted Room human message conformance passed')
