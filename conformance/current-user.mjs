import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import Ajv from 'ajv/dist/2020.js'
const schema = JSON.parse(await readFile(new URL('../schemas/current-user-result.v1.schema.json', import.meta.url)))
const validate = new Ajv({ strict: false }).compile(schema)
const profile = { subject: 'host:opaque-local-subject', displayName: 'Player' }
const available = { status: 'available', profile }
assert.equal(validate(available), true)
assert.equal(validate({ status: 'available', profile: { subject: profile.subject } }), true)
for (const mediaType of ['png', 'jpeg', 'webp']) {
  assert.equal(validate({ ...available, profile: { ...profile, avatar: `data:image/${mediaType};base64,AA==` } }), true)
}
for (const reason of ['signed-out', 'host-unavailable', 'generation-retired']) {
  assert.equal(validate({ status: 'unavailable', reason }), true)
  assert.equal(validate({ status: 'unavailable', reason, profile }), false)
}
for (const extra of ['accountId', 'userId', 'email', 'accessToken', 'refreshToken', 'planType', 'usage']) {
  assert.equal(validate({ ...available, profile: { ...profile, [extra]: 'private' } }), false)
  assert.equal(validate({ ...available, [extra]: 'private' }), false)
}
for (
  const avatar of [
    'https://example.com/a.png',
    'data:image/svg+xml;base64,AA==',
    'data:image/png;base64,',
    'data:image/png;base64,AA==\n',
    `data:image/png;base64,${'A'.repeat(65536)}`,
  ]
) {
  assert.equal(validate({ ...available, profile: { ...profile, avatar } }), false)
}
assert.equal(validate({ ...available, profile: { ...profile, displayName: '😀'.repeat(128) } }), true)
assert.equal(validate({ ...available, profile: { ...profile, displayName: '😀'.repeat(129) } }), false)
assert.equal(validate({ ...available, profile: { ...profile, displayName: '' } }), false)
assert.equal(validate({ ...available, profile: { ...profile, subject: '' } }), false)
console.log(
  'current-user v1 bounded display-only profile shape passed; privacy, subject scope and lifecycle need Host tests',
)
