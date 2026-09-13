import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import Ajv from 'ajv/dist/2020.js'
const load = async name =>
  JSON.parse(await readFile(new URL(`../schemas/${name}.schema.json`, import.meta.url), 'utf8'))
const ajv = new Ajv({ strict: true, allErrors: true, allowUnionTypes: true })
ajv.addSchema(await load('ui-common.v1'))
const validate = ajv.compile(await load('page.v4'))
const old = ajv.compile(await load('page.v3'))
const label = { key: 'action', fallback: 'Action' }
const command = { id: 'profile', label, command: { id: 'profile' } }
const page = {
  $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/page.v4.schema.json',
  schemaVersion: 4,
  id: 'lobby',
  title: label,
  description: label,
  headerActions: [{ id: 'guest', label, visual: { kind: 'avatar' }, menu: [command] }],
}
assert.equal(validate(page), true, JSON.stringify(validate.errors))
assert.equal(old(page), false)
for (
  const action of [
    { ...page.headerActions[0], command: { id: 'profile' } },
    { ...page.headerActions[0], menu: [] },
    { ...page.headerActions[0], menu: Array(13).fill(command) },
    { ...page.headerActions[0], menu: [page.headerActions[0]] },
    { ...command, visual: { kind: 'image' } },
    { ...command, visual: { kind: 'avatar', src: 'https://example.test/avatar.png' } },
    { ...command, visual: { kind: 'image', src: 'data:image/svg+xml;base64,AAAA' } },
    { ...command, icon: 'host:more', visual: { kind: 'avatar' } },
    { ...command, visual: { kind: 'image', src: `data:image/png;base64,${'A'.repeat(262144)}` } },
  ]
) assert.equal(validate({ ...page, headerActions: [action] }), false, JSON.stringify(action).slice(0, 200))
for (const kind of ['image', 'avatar']) {
  assert.equal(
    validate({ ...page, headerActions: [{ ...command, visual: { kind, src: 'data:image/png;base64,AAAA' } }] }),
    true,
  )
}
assert.equal(validate({ ...page, chrome: 'body-only' }), false)
assert.equal(old({ ...page, schemaVersion: 3, $schema: page.$schema.replace('v4', 'v3') }), false)
console.log('page v4: image/menu shape, bounds, old-version and body-only rejection passed')

assert.equal(validate({ ...page, headerActions: [{ ...command, presentation: 'primary' }] }), true)
assert.equal(validate({ ...page, headerActions: [{ ...command, presentation: 'icon' }] }), true)
for (
  const actions of [
    [{ ...page.headerActions[0], presentation: 'primary' }],
    [{ ...command, presentation: 'primary', visual: { kind: 'avatar' } }],
    ['a', 'b'].map(id => ({ ...command, id, presentation: 'primary' })),
    [{ ...command, presentation: 'huge' }],
  ]
) assert.equal(validate({ ...page, headerActions: actions }), false)
console.log('page v4 primary: optional command label, single primary, no identity/menu promotion passed')

for (const contentInset of ['standard', 'none']) {
  assert.equal(validate({ ...page, contentInset }), true)
  assert.equal(
    old({
      ...page,
      schemaVersion: 3,
      $schema: page.$schema.replace('v4', 'v3'),
      headerActions: [command],
      contentInset,
    }),
    false,
  )
}
for (const contentInset of ['16px', 0, null, {}, 'full-bleed']) {
  assert.equal(validate({ ...page, contentInset }), false)
}
console.log('page v4 content inset: bounded layout opt-in and old-version rejection passed')

assert.equal(validate({ ...page, headerActions: [{ ...command, presentation: 'primary', variant: 'outlined' }] }), true)
for (
  const action of [
    { ...command, variant: 'outlined' },
    { ...command, presentation: 'icon', variant: 'outlined' },
    { ...command, presentation: 'primary', variant: 'filled' },
    { ...page.headerActions[0], variant: 'outlined' },
    { ...page.headerActions[0], presentation: 'primary', variant: 'outlined' },
    { ...page.headerActions[0], menu: [{ ...command, presentation: 'primary', variant: 'outlined' }] },
  ]
) assert.equal(validate({ ...page, headerActions: [action] }), false)
console.log('page v4 outlined: explicit primary command opt-in and invalid variants rejected')

assert.equal(
  validate({
    ...page,
    headerActions: [
      { ...command, id: 'create', presentation: 'primary' },
      { ...command, id: 'balance', presentation: 'text' },
      { ...command, id: 'status', presentation: 'text' },
    ],
  }),
  true,
)
for (
  const action of [
    { ...command, presentation: 'text', visual: { kind: 'avatar' } },
    { ...command, presentation: 'text', variant: 'outlined' },
    { ...page.headerActions[0], presentation: 'text' },
    { ...page.headerActions[0], menu: [{ ...command, presentation: 'text' }] },
  ]
) assert.equal(validate({ ...page, headerActions: [action] }), false)
assert.equal(
  old({
    ...page,
    schemaVersion: 3,
    $schema: page.$schema.replace('v4', 'v3'),
    headerActions: [{ ...command, presentation: 'text' }],
  }),
  false,
)
console.log('page v4 text: ordinary labeled commands alongside one primary; identity/menu/variant and v3 rejected')

for (const format of ['png', 'jpeg', 'webp']) {
  assert.equal(
    validate({
      ...page,
      headerActions: [{
        ...command,
        presentation: 'text',
        visual: { kind: 'image', src: `data:image/${format};base64,AAAA` },
      }],
    }),
    true,
  )
}
for (
  const action of [
    { ...command, presentation: 'text', visual: { kind: 'image' } },
    { ...command, presentation: 'text', visual: { kind: 'image', src: 'https://example.test/coin.png' } },
    { ...command, presentation: 'text', visual: { kind: 'image', src: 'data:image/svg+xml;base64,AAAA' } },
    { ...command, presentation: 'text', visual: { kind: 'image', src: `data:image/png;base64,${'A'.repeat(262144)}` } },
    {
      ...command,
      presentation: 'text',
      icon: 'host:more',
      visual: { kind: 'image', src: 'data:image/png;base64,AAAA' },
    },
    { ...command, presentation: 'primary', visual: { kind: 'image', src: 'data:image/png;base64,AAAA' } },
  ]
) assert.equal(validate({ ...page, headerActions: [action] }), false)
console.log('page v4 text leading image: bounded raster-only, no icon/avatar/primary promotion passed')
