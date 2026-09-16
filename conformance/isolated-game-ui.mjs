import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import Ajv from 'ajv/dist/2020.js'
const schema = JSON.parse(
  await readFile(new URL('../schemas/isolated-game-ui-request.v1.schema.json', import.meta.url), 'utf8'),
)
const ajv = new Ajv({ strict: false }).addSchema(schema)
const validate = ajv.getSchema(schema.$id)
const request = {
  version: 1,
  type: 'request',
  requestId: 'frame-1',
  matchId: 'match-1',
  sequence: 5,
  kind: 'action',
  payload: { type: 'place', x: 0, y: 1 },
}
assert.equal(validate(request), true)
assert.equal(
  validate({
    ...request,
    requestId: 'frame-room-ready',
    kind: 'room-action',
    payload: { operation: 'ready' },
  }),
  true,
)
for (
  const invalid of [
    { ...request, sequence: -1 },
    { ...request, sequence: 0.5 },
    { ...request, version: 2 },
    { ...request, requestId: '../foreign' },
    { ...request, kind: 'declare-winner' },
    { ...request, kind: 'room-action', payload: { operation: 'play' } },
    { ...request, kind: 'room-action', payload: { operation: 'ready', roomId: 'forged' } },
    { ...request, accountToken: 'forged' },
    { ...request, payload: JSON.parse('{"constructor":1}') },
  ]
) assert.equal(validate(invalid), false)
const snapshotSchema = JSON.parse(
  await readFile(new URL('../schemas/isolated-game-ui-snapshot.v1.schema.json', import.meta.url), 'utf8'),
)
const validateSnapshot = ajv.compile(snapshotSchema)
const snapshot = {
  matchId: 'match-1',
  sequence: 5,
  observation: {},
  status: 'waiting',
  canAct: false,
  readOnly: false,
  theme: 'light',
}
const participant = { seatIndex: 0, name: 'Player', kind: 'human', isOwner: true }
assert.equal(validateSnapshot(snapshot), true)
assert.equal(validateSnapshot({ ...snapshot, participants: [] }), true)
for (const kind of ['human', 'agent', 'bot']) {
  for (const mediaType of ['png', 'jpeg', 'webp']) {
    assert.equal(
      validateSnapshot({
        ...snapshot,
        participants: [{ ...participant, kind, avatar: `data:image/${mediaType};base64,AA==` }],
      }),
      true,
    )
  }
}
assert.equal(validateSnapshot({ ...snapshot, participants: [{ ...participant, name: '😀'.repeat(128) }] }), true)
for (
  const invalid of [
    { ...participant, seat: 0 },
    { ...participant, accountId: 'private' },
    { ...participant, token: 'private' },
    { ...participant, seatIndex: -1 },
    { ...participant, seatIndex: 32 },
    { ...participant, seatIndex: 0.5 },
    { ...participant, name: '' },
    { ...participant, name: '😀'.repeat(129) },
    { ...participant, kind: 'owner' },
    { ...participant, isOwner: 'yes' },
    { seatIndex: 0, name: 'Player', kind: 'human' },
    { ...participant, avatar: 'https://example.com/avatar.png' },
    { ...participant, avatar: 'data:image/svg+xml;base64,AA==' },
    { ...participant, avatar: 'data:image/png;base64,' },
    { ...participant, avatar: 'data:image/png;base64,invalid' },
    { ...participant, avatar: 'data:image/png;base64,AA==\n' },
    { ...participant, avatar: `data:image/png;base64,${'A'.repeat(65536)}` },
  ]
) assert.equal(validateSnapshot({ ...snapshot, participants: [invalid] }), false)
assert.equal(validateSnapshot({ ...snapshot, participants: Array(33).fill(participant) }), false)
assert.equal(validateSnapshot({ ...snapshot, accountId: 'private' }), false)
console.log(
  'isolated-game-ui request/snapshot shape conformance passed; unique seats, bytes, identity and lifecycle require Host tests',
)
