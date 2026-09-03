import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const schemaNames = [
  'ui-common.v1.schema.json',
  'extension-point-common.v1.schema.json',
  'session-common.v1.schema.json',
  'agents-common.v1.schema.json',
  'agent-avatar.v1.schema.json',
  'plugin-config-common.v1.schema.json',
  'plugin-config-common.v2.schema.json',
  'plugin-config-common.v3.schema.json',
  'plugin-config-descriptor.v2.schema.json',
  'plugin-config-descriptor.v3.schema.json',
  'manager-content-navigation.v1.schema.json',
  'manager-content-navigation.v2.schema.json',
  'manager-content-navigation.v3.schema.json',
  'manager-content-navigation.v4.schema.json',
  'manager-content-navigation.v5.schema.json',
  'manager-content-projection.v1.schema.json',
  'manager-content-projection.v2.schema.json',
  'manager-content-projection.v3.schema.json',
  'manager-content-projection.v4.schema.json',
  'manager-content-config-common.v1.schema.json',
  'manager-content-config-command.v1.schema.json',
  'manager-content-config-result.v1.schema.json',
  'manager-content-config-subscription-page.v1.schema.json',
  'manager-content-config-subscription-page.v2.schema.json',
  'manager-content-config-subscription-close.v1.schema.json',
]
const schemas = new Map()
for (const name of schemaNames) schemas.set(name, JSON.parse(await readFile(path.join(root, 'schemas', name), 'utf8')))
const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true })
addFormats(ajv)
for (const schema of schemas.values()) ajv.addSchema(schema)
const validator = name => {
  const result = ajv.getSchema(schemas.get(name).$id)
  if (result === undefined) throw new Error(`${name} was not registered`)
  return result
}
const schemaErrors = (validate, value) => validate(value) ? [] : (validate.errors ?? []).map(error => `${error.instancePath || '/'} ${error.message}`)
const scalarKey = value => JSON.stringify([value === null ? 'null' : typeof value, value])

const frozenFiles = [
  'schemas/manager-content-navigation.v1.schema.json',
  'schemas/manager-content-navigation.v2.schema.json',
  'schemas/manager-content-navigation.v3.schema.json',
  'schemas/manager-content-navigation.v4.schema.json',
  'schemas/manager-content-projection.v1.schema.json',
  'schemas/manager-content-projection.v2.schema.json',
  'schemas/manager-content-projection.v3.schema.json',
  'schemas/plugin-config-common.v1.schema.json',
  'schemas/plugin-config-common.v2.schema.json',
  'schemas/plugin-config-descriptor.v2.schema.json',
  'schemas/manager-content-config-command.v1.schema.json',
  'schemas/manager-content-config-result.v1.schema.json',
  'schemas/manager-content-config-subscription-page.v1.schema.json',
  'schemas/manager-content-config-subscription-close.v1.schema.json',
  'types/manager-content-navigation.v1.d.ts',
  'types/manager-content-navigation.v2.d.ts',
  'types/manager-content-navigation.v3.d.ts',
  'types/manager-content-navigation.v4.d.ts',
].sort()
const frozenDigest = createHash('sha256')
for (const file of frozenFiles) {
  frozenDigest.update(file)
  frozenDigest.update('\0')
  frozenDigest.update(readFileSync(path.join(root, file)))
  frozenDigest.update('\0')
}
assert.equal(frozenDigest.digest('hex'), 'dc29d3120dc9acaf941357f0da6df2031cedecc70e031b981140ed856ddebb1a', 'manager navigation v1-v4 and reused config contracts must remain byte-frozen')

function fieldSchema(envelope, segments) {
  let current = envelope
  for (const segment of segments) {
    current = current?.properties?.[segment]
    if (current === undefined) return undefined
  }
  return current
}

function finiteScalars(schema) {
  if (Array.isArray(schema?.enum) && schema.enum.every(value => value === null || ['string', 'number', 'boolean'].includes(typeof value))) return schema.enum
  if (Array.isArray(schema?.oneOf)) {
    const values = schema.oneOf.map(branch => branch?.const)
    if (schema.oneOf.every((branch, index) => Object.hasOwn(branch ?? {}, 'const') && (values[index] === null || ['string', 'number', 'boolean'].includes(typeof values[index])))) return values
  }
  return undefined
}

function validateChoiceProjection(projection) {
  const errors = schemaErrors(validator('manager-content-projection.v4.schema.json'), projection)
  const schema = projection?.body?.configuration?.schema
  if (schema?.kind !== 'schemastery') return errors
  const seenPaths = new Set()
  for (const field of schema.form?.fields ?? []) {
    const pathKey = JSON.stringify(field.path)
    if (seenPaths.has(pathKey)) errors.push(`duplicate form field path ${pathKey}`)
    seenPaths.add(pathKey)
    if (field.choices === undefined) continue
    const finite = finiteScalars(fieldSchema(schema.envelope, field.path))
    if (finite === undefined) {
      errors.push(`localized choices require a finite scalar field at ${pathKey}`)
      continue
    }
    const expected = new Set(finite.map(scalarKey))
    if (expected.size !== finite.length) errors.push(`finite schema values must be unique at ${pathKey}`)
    const actual = new Set()
    for (const choice of field.choices) {
      const key = scalarKey(choice.value)
      if (actual.has(key)) errors.push(`duplicate localized choice value ${key}`)
      actual.add(key)
      if (!expected.has(key)) errors.push(`localized choice value is not declared by schema: ${key}`)
    }
    for (const key of expected) if (!actual.has(key)) errors.push(`localized choice is missing schema value ${key}`)
  }
  return errors
}

function resolveLabel(label, locale, catalogs) {
  return catalogs[locale]?.[label.namespace ?? 'chatroom']?.[label.key] ?? label.fallback
}

const base = JSON.parse(await readFile(path.join(root, 'test-vectors/manager-content-navigation-v4/valid/host-config-form.json'), 'utf8'))
const valid = structuredClone(base)
valid.declaration.$schema = 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/manager-content-navigation.v5.schema.json'
valid.declaration.schemaVersion = 5
valid.projection.$schema = 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/manager-content-projection.v4.schema.json'
valid.projection.schemaVersion = 4
valid.projection.body.configuration.version = 3
valid.projection.body.configuration.schema.form = {
  version: 2,
  fields: [{
    path: ['shortcutPolicy'],
    presenter: { version: 1, kind: 'choice.select' },
    choices: [
      { value: 'enter', label: { key: 'composer.shortcut.enter', fallback: 'Enter sends' } },
      { value: 'mod-enter', label: { key: 'composer.shortcut.mod-enter', fallback: 'Command/Ctrl+Enter sends' } },
    ],
  }],
}
const sourceAnnotation = {
  meta: {
    extra: {
      cordisxForm: structuredClone(valid.projection.body.configuration.schema.form),
    },
  },
}
for (const page of valid.subscriptionPages) {
  page.$schema = 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/manager-content-config-subscription-page.v2.schema.json'
  page.contract = 'cordisx.manager-content-config-subscription-page/v2'
  page.schemaVersion = 2
  for (const update of page.updates) if (update.kind === 'snapshot-replaced') update.body = structuredClone(valid.projection.body)
}

assert.deepEqual(schemaErrors(validator('manager-content-navigation.v5.schema.json'), valid.declaration), [])
assert.deepEqual(validateChoiceProjection(valid.projection), [])
const validateFormPresentation = ajv.getSchema(`${schemas.get('plugin-config-common.v3.schema.json').$id}#/$defs/formPresentation`)
assert.ok(validateFormPresentation)
assert.deepEqual(schemaErrors(validateFormPresentation, sourceAnnotation.meta.extra.cordisxForm), [], 'the public Schemastery annotation must normalize to form presentation v2')
assert.deepEqual(structuredClone(sourceAnnotation.meta.extra.cordisxForm), valid.projection.body.configuration.schema.form)
for (const page of valid.subscriptionPages) assert.deepEqual(schemaErrors(validator('manager-content-config-subscription-page.v2.schema.json'), page), [])
assert.deepEqual(structuredClone(valid), valid, 'v5 choice labels and lifecycle documents must be structured-clone safe')

const catalogs = {
  en: { chatroom: { 'composer.shortcut.enter': 'Enter sends', 'composer.shortcut.mod-enter': 'Command/Ctrl+Enter sends' } },
  'zh-CN': { chatroom: { 'composer.shortcut.enter': 'Enter 发送', 'composer.shortcut.mod-enter': 'Command/Ctrl+Enter 发送' } },
}
const choices = valid.projection.body.configuration.schema.form.fields[0].choices
assert.deepEqual(choices.map(choice => resolveLabel(choice.label, 'en', catalogs)), ['Enter sends', 'Command/Ctrl+Enter sends'])
assert.deepEqual(choices.map(choice => resolveLabel(choice.label, 'zh-CN', catalogs)), ['Enter 发送', 'Command/Ctrl+Enter 发送'])
assert.deepEqual(choices.map(choice => resolveLabel(choice.label, 'fr', catalogs)), ['Enter sends', 'Command/Ctrl+Enter sends'])
assert.deepEqual(choices.map(choice => choice.value), ['enter', 'mod-enter'])

const saveValues = valid.commands
  .filter(command => command.operation === 'draft.save')
  .flatMap(command => command.operations.filter(operation => operation.op === 'set').map(operation => operation.value))
assert.deepEqual(saveValues, ['mod-enter'], 'localized display labels must never replace persisted command values')
assert.equal(saveValues.some(value => choices.some(choice => value === choice.label.fallback)), false)

function invalid(mutator, message) {
  const candidate = structuredClone(valid.projection)
  mutator(candidate.body.configuration.schema)
  assert.notDeepEqual(validateChoiceProjection(candidate), [], message)
}
invalid(schema => schema.form.fields[0].choices[1].value = 'enter', 'duplicate values with divergent labels must fail closed')
invalid(schema => schema.form.fields[0].choices.pop(), 'missing finite values must fail closed')
invalid(schema => schema.form.fields[0].choices.push({ value: 'shift-enter', label: { key: 'composer.shortcut.shift-enter', fallback: 'Shift+Enter sends' } }), 'additional values must fail closed')
invalid(schema => delete schema.form.fields[0].choices[0].label.fallback, 'labels without fallback must fail closed')
invalid(schema => schema.form.fields[0].choices[0].label.html = '<b>Enter</b>', 'unknown label fields must fail closed')
invalid(schema => schema.envelope.properties.shortcutPolicy = { type: 'string' }, 'choice metadata on a non-finite field must fail closed')
invalid(schema => schema.form.version = 3, 'unknown form presentation versions must fail closed')

const divergentOneOf = structuredClone(valid.projection)
divergentOneOf.body.configuration.schema.envelope.properties.shortcutPolicy = { oneOf: [{ const: 1 }, { const: '1' }], default: 1 }
divergentOneOf.body.configuration.schema.form.fields[0].choices = [
  { value: 1, label: { key: 'numeric.one', fallback: 'Numeric one' } },
  { value: '1', label: { key: 'string.one', fallback: 'String one' } },
]
assert.deepEqual(validateChoiceProjection(divergentOneOf), [], 'JSON scalar types must remain distinct')

const v4Smuggle = structuredClone(base.projection)
v4Smuggle.body.configuration.schema.form = structuredClone(valid.projection.body.configuration.schema.form)
assert.notDeepEqual(schemaErrors(validator('manager-content-projection.v3.schema.json'), v4Smuggle), [], 'frozen projection v3 must reject v5 choice metadata')

const publicSchemas = JSON.stringify([...schemas.values()].filter(schema => schema.$id.includes('manager-content') || schema.$id.includes('plugin-config')))
for (const forbidden of ['homeConfigPath', 'localPath', 'rendererCallback', 'container', 'electronBridge', 'pluginMount', 'rawPath', 'html']) assert.equal(publicSchemas.includes(forbidden), false, `public schemas must not expose ${forbidden}`)

console.log('Manager content navigation v5 localized choice labels conformance passed')
