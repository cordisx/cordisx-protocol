import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Ajv2020 from 'ajv/dist/2020.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const names = [
  'ui-common.v1.schema.json', 'surface-contribution.v1.schema.json',
  'surface-contribution.v2.schema.json', 'surface-contribution.v3.schema.json',
  'surface-contribution.v4.schema.json', 'surface-contribution.v5.schema.json',
  'surface-contribution.v6.schema.json', 'surface-contribution.v7.schema.json',
  'host-extension-point-catalog.v6.schema.json', 'host-extension-point-catalog.v7.schema.json',
]
const schemas = new Map()
for (const name of names) schemas.set(name, JSON.parse(await readFile(path.join(root, 'schemas', name), 'utf8')))
const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true })
for (const schema of schemas.values()) ajv.addSchema(schema)
const contribution = ajv.getSchema(schemas.get('surface-contribution.v7.schema.json').$id)
const catalog = ajv.getSchema(schemas.get('host-extension-point-catalog.v7.schema.json').$id)
if (contribution === undefined || catalog === undefined) throw new Error('session backdrop schemas were not registered')

const text = key => ({ key, fallback: key })
const png = Buffer.from('bounded-transparent-png-fixture').toString('base64')
const valid = {
  $schema: schemas.get('surface-contribution.v7.schema.json').$id,
  schemaVersion: 7,
  id: 'imperium-stage',
  surface: 'session.backdrop',
  item: {
    variant: 'imperium', driver: 'reasoning-intensity', motion: 'ascension',
    stages: [
      { material: 'plastic', ambience: 'dormant', portrait: { mediaType: 'image/png', data: png, alt: text('portrait.plastic') } },
      { material: 'gold', ambience: 'imperial', portrait: { mediaType: 'image/png', data: png, alt: text('portrait.gold') } },
    ],
  },
}

let failures = 0
function expect(label, validator, value, expected) {
  const received = validator(value)
  if (received !== expected) {
    console.error(`${label}: expected ${expected ? 'valid' : 'invalid'}`, validator.errors)
    failures += 1
  }
}

expect('valid session backdrop', contribution, valid, true)
expect('valid session backdrop descriptor', catalog, {
  $schema: schemas.get('host-extension-point-catalog.v7.schema.json').$id,
  schemaVersion: 7,
  points: [{
    id: 'session.backdrop', kind: 'surface', title: text('backdrop.title'),
    description: text('backdrop.description'), icon: 'host:layers',
    payloadFamily: 'session-backdrop-presentation', maturity: 'stable', adapterSupport: 'supported',
  }],
}, true)

for (const [label, mutate] of [
  ['network URL', value => { value.item.stages[0].portrait.url = 'https://example.com/tibo.png' }],
  ['raw CSS', value => { value.item.css = 'body { display: none }' }],
  ['unknown ambience', value => { value.item.stages[0].ambience = 'custom' }],
  ['non-PNG media', value => { value.item.stages[0].portrait.mediaType = 'image/svg+xml' }],
  ['group override', value => { value.group = 'layered' }],
]) {
  const candidate = structuredClone(valid)
  mutate(candidate)
  expect(`reject ${label}`, contribution, candidate, false)
}

if (failures > 0) throw new Error(`${failures} session backdrop conformance case(s) failed`)
console.log('Session backdrop presentation conformance: all cases passed')
