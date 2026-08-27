import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const schemaNames = [
  'ui-common.v1.schema.json',
  'surface-contribution.v1.schema.json',
  'surface-contribution.v2.schema.json',
  'surface-contribution.v3.schema.json',
  'surface-contribution.v4.schema.json',
  'surface-contribution.v5.schema.json',
  'surface-contribution.v6.schema.json',
  'extension-point-common.v1.schema.json',
  'host-extension-point-catalog.v6.schema.json',
]
const schemas = new Map()
for (const name of schemaNames) {
  schemas.set(name, JSON.parse(await readFile(path.join(root, 'schemas', name), 'utf8')))
}

const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true })
addFormats(ajv)
for (const schema of schemas.values()) ajv.addSchema(schema)

const contribution = ajv.getSchema(schemas.get('surface-contribution.v6.schema.json').$id)
const catalog = ajv.getSchema(schemas.get('host-extension-point-catalog.v6.schema.json').$id)
if (contribution === undefined || catalog === undefined) throw new Error('reasoning-intensity schemas were not registered')

const text = key => ({ key, fallback: key })
const valid = {
  $schema: schemas.get('surface-contribution.v6.schema.json').$id,
  schemaVersion: 6,
  id: 'imperium',
  surface: 'composer.reasoning-intensity',
  item: {
    variant: 'imperium',
    title: text('intensity.title'),
    motion: 'ascension',
    stages: [
      { label: text('intensity.plastic'), material: 'plastic' },
      { label: text('intensity.bronze'), material: 'bronze' },
      { label: text('intensity.steel'), material: 'steel' },
      { label: text('intensity.silver'), material: 'silver' },
      { label: text('intensity.gold'), material: 'gold' },
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

expect('valid Imperium presentation', contribution, valid, true)
expect('valid reasoning-intensity descriptor', catalog, {
  $schema: schemas.get('host-extension-point-catalog.v6.schema.json').$id,
  schemaVersion: 6,
  points: [{
    id: 'composer.reasoning-intensity',
    kind: 'surface',
    title: text('intensity.point.title'),
    description: text('intensity.point.description'),
    icon: 'host:bolt',
    payloadFamily: 'reasoning-intensity-presentation',
    maturity: 'stable',
    adapterSupport: 'supported',
  }],
}, true)

for (const [label, mutate] of [
  ['raw CSS', value => { value.item.css = '.native { display: none }' }],
  ['native selector', value => { value.item.selector = 'input[type=range]' }],
  ['HTML payload', value => { value.item.html = '<div>replacement</div>' }],
  ['unknown material', value => { value.item.stages[2].material = 'diamond' }],
  ['one stage', value => { value.item.stages = value.item.stages.slice(0, 1) }],
  ['group override', value => { value.group = 'theme' }],
]) {
  const candidate = structuredClone(valid)
  mutate(candidate)
  expect(`reject ${label}`, contribution, candidate, false)
}

if (failures > 0) throw new Error(`${failures} reasoning-intensity conformance case(s) failed`)
console.log('Reasoning intensity presentation conformance: all cases passed')
