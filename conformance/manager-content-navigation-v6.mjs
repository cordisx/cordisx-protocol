import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const digest = createHash('sha256')
const frozen = [
  ...Array.from({ length: 5 }, (_, i) => `schemas/manager-content-navigation.v${i + 1}.schema.json`),
  ...Array.from({ length: 5 }, (_, i) => `types/manager-content-navigation.v${i + 1}.d.ts`),
  ...Array.from({ length: 4 }, (_, i) => `schemas/manager-content-projection.v${i + 1}.schema.json`),
  'types/channel-manager.v6.d.ts',
].sort()
for (const file of frozen) digest.update(file).update('\0').update(readFileSync(path.join(root, file))).update('\0')
assert.equal(
  digest.digest('hex'),
  '7df94120316ff008ed29da1e844be68830ad29369551307cec7b839eb4515fe2',
  'predecessors stay frozen',
)
const ajv = new Ajv2020({ strict: true, allErrors: true, allowUnionTypes: true })
addFormats(ajv)
for (const name of readdirSync(path.join(root, 'schemas')).filter(name => name.endsWith('.schema.json'))) {
  ajv.addSchema(JSON.parse(readFileSync(path.join(root, 'schemas', name), 'utf8')))
}
const base = 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/'
const nav = ajv.getSchema(`${base}manager-content-navigation.v6.schema.json`)
const projection = ajv.getSchema(`${base}manager-content-projection.v5.schema.json`)
const fixture = JSON.parse(
  readFileSync(path.join(root, 'test-vectors/manager-content-navigation-v3/valid/entity-summary.json'), 'utf8'),
)
const declaration = structuredClone(fixture.declarations[1].document)
declaration.$schema = `${base}manager-content-navigation.v6.schema.json`
declaration.schemaVersion = 6
declaration.recordSummary = {
  leadingVisual: { kind: 'identity', icon: 'host:chat' },
  title: { key: 'account.title', fallback: 'Messaging account' },
  statuses: [{
    id: 'state',
    label: { key: 'state.ready', fallback: 'Connected' },
    icon: 'host:success',
    tone: 'success',
  }],
  metrics: [{
    id: 'inbound',
    label: { key: 'inbound', fallback: 'Inbound queued' },
    icon: 'host:chat',
    tone: 'neutral',
    value: 0,
  }],
}
const validate = value => {
  if (!nav(value)) return false
  for (const list of [value.recordSummary?.statuses ?? [], value.recordSummary?.metrics ?? []]) {
    if (new Set(list.map(item => item.id)).size !== list.length) return false
  }
  return !value.recordSummary || value.header.title.kind === 'record'
}
assert.equal(validate(declaration), true)
for (
  const mutate of [
    value => {
      value.recordSummary.metrics[0].value = -1
    },
    value => {
      value.recordSummary.metrics[0].value = 0.5
    },
    value => {
      value.recordSummary.metrics[0].value = Number.MAX_SAFE_INTEGER + 1
    },
    value => {
      value.recordSummary.metrics.push(value.recordSummary.metrics[0])
    },
    value => {
      value.recordSummary.statuses.push(value.recordSummary.statuses[0])
    },
    value => {
      value.recordSummary.secret = 'private'
    },
    value => {
      value.recordSummary.leadingVisual.url = 'https://invalid.example/avatar'
    },
    value => {
      delete value.recordSummary.metrics[0].label.fallback
    },
    value => {
      value.recordSummary.metrics[0].tone = 'invented'
    },
    value => {
      value.header.title = { kind: 'route' }
    },
  ]
) {
  const invalid = structuredClone(declaration)
  mutate(invalid)
  assert.equal(validate(invalid), false)
}
const projected = structuredClone(fixture.projection)
projected.$schema = `${base}manager-content-projection.v5.schema.json`
projected.schemaVersion = 5
projected.recordSummary = structuredClone(declaration.recordSummary)
assert.equal(projection(projected), true, JSON.stringify(projection.errors))
const old = ajv.getSchema(`${base}manager-content-navigation.v5.schema.json`)
assert.equal(
  old({ ...declaration, $schema: `${base}manager-content-navigation.v5.schema.json`, schemaVersion: 5 }),
  false,
)
assert.deepEqual(structuredClone(declaration), declaration)
console.log('Manager record identity/status/count successor: conformance passed; predecessors frozen')
