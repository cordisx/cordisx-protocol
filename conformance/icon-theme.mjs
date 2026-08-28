import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Ajv2020 from 'ajv/dist/2020.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const schemaNames = [
  'ui-common.v1.schema.json',
  'icon-theme-common.v1.schema.json',
  'icon-theme-provider-registration.v1.schema.json',
  'icon-theme-selection.v1.schema.json',
  'icon-theme-resolution-request.v1.schema.json',
  'icon-theme-resolution-result.v1.schema.json',
  'icon-theme-lifecycle-operation.v1.schema.json',
  'icon-theme-lifecycle-result.v1.schema.json',
]
const schemas = new Map()
for (const name of schemaNames) {
  schemas.set(name, JSON.parse(await readFile(path.join(root, 'schemas', name), 'utf8')))
}

const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true })
for (const schema of schemas.values()) ajv.addSchema(schema)
const validators = new Map(
  schemaNames.slice(2).map(name => [name, ajv.getSchema(schemas.get(name).$id)]),
)
if ([...validators.values()].some(validator => validator === undefined)) {
  throw new Error('icon-theme schemas were not registered')
}

let failures = 0
function expect(label, condition, detail) {
  if (condition) return
  console.error(`${label}: failed`, detail ?? '')
  failures += 1
}

function schemaNameFor(value) {
  const name = value.$schema?.split('/').at(-1)
  if (!validators.has(name)) throw new Error(`unknown icon-theme schema: ${value.$schema}`)
  return name
}

function providerBindingIsValid(value) {
  const { principal, identity } = value
  if (principal.kind === 'host') {
    return identity.providerId === 'builtin:reicon' && identity.namespace === 'reicon' && value.coverage.kind === 'complete'
  }
  return identity.providerId === `plugin:${principal.pluginId}:${identity.namespace}` && coverageIsValid(value.coverage)
}

function coverageIsValid(coverage) {
  if (coverage.kind === 'complete') return true
  return new Set(coverage.entries.map(entry => entry.key)).size === coverage.entries.length
}

function structuredPathsAreValid(value) {
  if (value.outcome !== 'resolved') return true
  return value.descriptor.paths.every(pathValue => {
    const commands = pathValue.commands
    if (commands[0]?.op !== 'move') return false
    const closeAt = commands.findIndex(command => command.op === 'close')
    return closeAt === -1 || closeAt === commands.length - 1
  })
}

function semanticIsValid(schemaName, value) {
  if (schemaName === 'icon-theme-provider-registration.v1.schema.json') return providerBindingIsValid(value)
  if (schemaName === 'icon-theme-resolution-result.v1.schema.json') return structuredPathsAreValid(value)
  if (schemaName === 'icon-theme-lifecycle-operation.v1.schema.json' && value.operation.kind === 'register') {
    return value.operation.identity.providerId === `plugin:${value.operation.principal.pluginId}:${value.operation.identity.namespace}` && coverageIsValid(value.operation.coverage)
  }
  return true
}

const valid = JSON.parse(await readFile(path.join(root, 'test-vectors/icon-theme/valid/complete.json'), 'utf8'))
for (const [group, values] of [
  ['registration', valid.registrations],
  ['selection', [valid.selection]],
  ['request', valid.requests],
  ['result', valid.results],
  ['operation', valid.operations],
  ['lifecycle result', valid.resultsLifecycle],
]) {
  for (const [index, value] of values.entries()) {
    const schemaName = schemaNameFor(value)
    const validator = validators.get(schemaName)
    expect(`valid ${group} ${index + 1}`, validator(value), validator.errors)
    expect(`valid ${group} ${index + 1} semantics`, semanticIsValid(schemaName, value))
  }
}

const registrations = new Map(valid.registrations.map(value => [value.providerHandle, value]))
const reicon = registrations.get(valid.selection.defaultProvider.providerHandle)
expect('selection default resolves to registered Reicon', reicon?.identity.providerId === 'builtin:reicon')
expect('selection fallback is the exact default generation', JSON.stringify(valid.selection.fallbackProvider) === JSON.stringify(valid.selection.defaultProvider))
expect('selection active provider is registered', registrations.has(valid.selection.selectedProvider.providerHandle))

for (let index = 0; index < valid.requests.length; index += 1) {
  const request = valid.requests[index]
  const result = valid.results[index]
  expect(`resolution ${index + 1} request correlation`, result.requestId === request.requestId)
  expect(`resolution ${index + 1} generation fence`, result.providerGeneration === request.providerGeneration)
}
expect('partial coverage produces an explicit miss', valid.results[1].outcome === 'missing' && valid.results[1].reason === 'not-covered')

const dispose = valid.operations.find(value => value.operation.kind === 'dispose').operation
expect('dispose cannot target the selected exact generation', dispose.providerHandle !== valid.selection.selectedProvider.providerHandle || dispose.providerGeneration !== valid.selection.selectedProvider.providerGeneration)
const rollback = valid.operations.find(value => value.operation.kind === 'rollback').operation
expect('rollback retires the selected failed generation', rollback.failedProviderHandle === valid.selection.selectedProvider.providerHandle && rollback.failedGeneration === valid.selection.selectedProvider.providerGeneration)
expect('rollback restores the pinned fallback generation', rollback.restoreProviderHandle === valid.selection.fallbackProvider.providerHandle && rollback.restoreGeneration === valid.selection.fallbackProvider.providerGeneration)

const invalidDirectory = path.join(root, 'test-vectors/icon-theme/invalid')
for (const name of (await readdir(invalidDirectory)).filter(name => name.endsWith('.json')).sort()) {
  const vector = JSON.parse(await readFile(path.join(invalidDirectory, name), 'utf8'))
  const validator = validators.get(vector.schema)
  if (validator === undefined) throw new Error(`unknown validator in ${name}: ${vector.schema}`)
  const schemaValid = validator(vector.value)
  if (vector.semantic !== undefined) {
    expect(`${vector.case} remains schema-shaped`, schemaValid, validator.errors)
    expect(vector.case, !semanticIsValid(vector.schema, vector.value))
  } else {
    expect(vector.case, !schemaValid, validator.errors)
  }
}

if (failures > 0) throw new Error(`${failures} icon-theme conformance case(s) failed`)
console.log('Icon theme provider conformance: all cases passed')
