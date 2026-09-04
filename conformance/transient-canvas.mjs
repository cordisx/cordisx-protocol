import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const schemaDirectory = path.join(root, 'schemas')
const names = (await readdir(schemaDirectory)).filter(name => name.endsWith('.schema.json')).sort()
const schemas = new Map()
for (const name of names) schemas.set(name, JSON.parse(await readFile(path.join(schemaDirectory, name), 'utf8')))
const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true })
addFormats(ajv)
for (const schema of schemas.values()) ajv.addSchema(schema)

function validator(name) {
  const validate = ajv.getSchema(schemas.get(name).$id)
  if (validate === undefined) throw new Error(`${name} was not registered`)
  return validate
}

const registration = validator('transient-canvas-registration.v1.schema.json')
const contribution = validator('surface-contribution.v8.schema.json')
const catalog = validator('host-extension-point-catalog.v8.schema.json')
const manifest = validator('plugin-manifest.v7.schema.json')
const packageManifest = validator('plugin-package.v7.schema.json')
const schema = name => schemas.get(name).$id

const validRegistration = {
  $schema: schema('transient-canvas-registration.v1.schema.json'),
  schemaVersion: 1,
  id: 'confetti',
  pointId: 'composer.submit.effects',
  durationMs: 2400,
  reducedMotion: 'static',
}
const validContribution = {
  $schema: schema('surface-contribution.v8.schema.json'),
  schemaVersion: 8,
  id: 'confetti',
  surface: 'composer.submit.effects',
  item: { kind: 'isolated-canvas', durationMs: 2400, reducedMotion: 'static' },
}
const text = key => ({ key, fallback: key })
const validManifest = {
  $schema: schema('plugin-manifest.v7.schema.json'),
  schemaVersion: 7,
  id: 'confetti',
  capabilities: [],
  services: [],
  execution: { realm: 'isolated-worker', interfaces: ['ui.transient-canvas/v1'] },
}
const validPackage = {
  $schema: schema('plugin-package.v7.schema.json'),
  schemaVersion: 7,
  id: 'confetti',
  version: '1.0.0',
  entry: './src/index.js',
  distribution: { mode: 'explicit-local-v1', signature: 'unsupported' },
  compatibility: { runtimeAbi: 1, protocolSchemas: [schema('plugin-manifest.v7.schema.json'), schema('surface-contribution.v8.schema.json')] },
  dependencies: [],
  runtimeManifest: { path: './runtime/manifest.json', schema: schema('plugin-manifest.v7.schema.json'), digest: `sha256:${'a'.repeat(64)}` },
}

let failures = 0
function expect(label, validate, value, expected) {
  const received = validate(value)
  if (received === expected) return
  console.error(`${label}: expected ${expected ? 'valid' : 'invalid'}`, validate.errors)
  failures += 1
}

expect('transient canvas registration', registration, validRegistration, true)
expect('transient canvas surface', contribution, validContribution, true)
expect('transient canvas descriptor', catalog, {
  $schema: schema('host-extension-point-catalog.v8.schema.json'),
  schemaVersion: 8,
  points: [{
    id: 'composer.submit.effects', kind: 'surface', title: text('submit-effects.title'),
    description: text('submit-effects.description'), icon: 'host:layers',
    payloadFamily: 'transient-canvas-presentation', maturity: 'experimental', adapterSupport: 'supported',
  }],
}, true)
expect('isolated canvas manifest', manifest, validManifest, true)
expect('isolated canvas package', packageManifest, validPackage, true)

for (const [label, value, validate] of [
  ['raw DOM callback', { ...validRegistration, element: 'document.body' }, registration],
  ['unbounded duration', { ...validRegistration, durationMs: 6000 }, registration],
  ['unknown reduced motion', { ...validRegistration, reducedMotion: 'animate' }, registration],
  ['raw script in contribution', { ...validContribution, item: { ...validContribution.item, script: 'draw()' } }, contribution],
  ['main-realm execution', { ...validManifest, execution: { ...validManifest.execution, realm: 'renderer-main' } }, manifest],
  ['unknown isolated interface', { ...validManifest, execution: { ...validManifest.execution, interfaces: ['ui.dom/v1'] } }, manifest],
]) expect(label, validate, value, false)

if (failures > 0) throw new Error(`${failures} transient canvas conformance case(s) failed`)
console.log('Transient canvas conformance: all cases passed')
