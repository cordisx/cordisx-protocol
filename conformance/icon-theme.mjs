import { readdir, readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
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

const common = schemas.get('icon-theme-common.v1.schema.json').$defs
const catalogDigest = `sha256:${createHash('sha256').update(JSON.stringify(common.semanticIconKey.enum)).digest('hex')}`
expect('closed catalog proof digest matches canonical key serialization', common.completeCoverageProof.properties.catalogDigest.const === catalogDigest)
expect('complete proof tuple count matches catalog Cartesian product', common.completeCoverageProof.properties.tupleCount.const === common.semanticIconKey.enum.length * common.variant.enum.length * common.state.enum.length)

function schemaNameFor(value) {
  const name = value.$schema?.split('/').at(-1)
  if (!validators.has(name)) throw new Error(`unknown icon-theme schema: ${value.$schema}`)
  return name
}

function providerBindingIsValid(value) {
  const { principal, identity } = value
  if (principal.kind === 'host') {
    return identity.providerId === 'builtin:reicon' && identity.namespace === 'reicon' && completeCoverageIsValid(value.coverage, value.providerGeneration, identity)
  }
  return identity.providerId === `plugin:${principal.pluginId}:${identity.namespace}` && coverageIsValid(value.coverage, value.providerGeneration, identity)
}

function completeCoverageIsValid(coverage, providerGeneration, identity) {
  return coverage.kind === 'complete' && coverage.proof.providerId === identity.providerId && coverage.proof.namespace === identity.namespace && coverage.proof.providerVersion === identity.providerVersion && coverage.proof.providerGeneration === providerGeneration && coverage.proof.rawDataExported === false && coverage.proof.tupleCount === 1176
}

function coverageIsValid(coverage, providerGeneration, identity) {
  if (coverage.kind === 'complete') return completeCoverageIsValid(coverage, providerGeneration, identity)
  const tuples = coverage.entries.map(entry => `${entry.key}\u0000${entry.variant}\u0000${entry.state}`)
  return new Set(tuples).size === tuples.length
}

function coverageIncludes(coverage, request) {
  if (coverage.kind === 'complete') return true
  return coverage.entries.some(entry => entry.key === request.key && entry.variant === request.variant && entry.state === request.state)
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

function sameProvider(left, right) {
  return left.providerHandle === right.providerHandle && left.providerId === right.providerId && left.namespace === right.namespace && left.protocolVersion === right.protocolVersion && left.providerVersion === right.providerVersion && left.providerGeneration === right.providerGeneration
}

function registrationMatches(reference, registration) {
  return registration !== undefined && reference.providerHandle === registration.providerHandle && reference.providerId === registration.identity.providerId && reference.namespace === registration.identity.namespace && reference.protocolVersion === registration.identity.protocolVersion && reference.providerVersion === registration.identity.providerVersion && reference.providerGeneration === registration.providerGeneration
}

function selectionIsValid(value) {
  const pinsMatch = [value.defaultProvider, value.selectedProvider, value.fallbackProvider]
    .every(provider => provider.profileRevision === value.profileRevision)
  if (!pinsMatch || !sameProvider(value.defaultProvider, value.fallbackProvider)) return false
  if (value.outcome === 'default') return sameProvider(value.selectedProvider, value.defaultProvider)
  if (value.outcome === 'selected') return value.requestedProviderHandle === value.selectedProvider.providerHandle
  return value.requestedProviderHandle !== value.selectedProvider.providerHandle && sameProvider(value.selectedProvider, value.fallbackProvider)
}

function resolutionExchangeIsValid(context, result) {
  const { registration, request } = context
  if (request.requestId !== result.requestId || request.providerGeneration !== result.providerGeneration) return false
  if (request.providerHandle !== registration.providerHandle || request.providerGeneration !== registration.providerGeneration) return false
  if (result.outcome === 'resolved' && !coverageIncludes(registration.coverage, request)) return false
  if (result.outcome === 'missing' && coverageIncludes(registration.coverage, request)) return false
  return structuredPathsAreValid(result)
}

function lifecycleTransitionIsValid(context, result) {
  const { selection, operation, registrations = [] } = context
  const action = operation.operation
  if (operation.requestId !== result.requestId || operation.profileId !== result.profileId || operation.hostGeneration !== result.hostGeneration) return false
  if (operation.expectedProfileRevision !== selection.profileRevision || result.operation !== action.kind) return false
  const unchanged = result.profileRevision === selection.profileRevision && sameProvider(result.activeProvider, selection.selectedProvider)
  if (result.outcome === 'conflict' || result.outcome === 'rejected' || result.outcome === 'rollback-failed') return unchanged
  if (result.profileRevision !== selection.profileRevision + 1) return false
  if (action.kind === 'register') {
    return result.affectedProviderHandle === action.providerHandle && sameProvider(result.activeProvider, selection.selectedProvider)
  }
  if (action.kind === 'select') {
    const registration = registrations.find(value => value.providerHandle === action.providerHandle && value.providerGeneration === action.providerGeneration)
    if (result.outcome === 'rolled-back') return result.affectedProviderHandle === action.providerHandle && sameProvider(result.activeProvider, selection.selectedProvider)
    return registration !== undefined && result.affectedProviderHandle === action.providerHandle && registrationMatches(result.activeProvider, registration)
  }
  if (action.kind === 'dispose') {
    const targetsSelected = action.providerHandle === selection.selectedProvider.providerHandle && action.providerGeneration === selection.selectedProvider.providerGeneration
    return !targetsSelected && result.affectedProviderHandle === action.providerHandle && result.disposedGeneration === action.providerGeneration && sameProvider(result.activeProvider, selection.selectedProvider)
  }
  return action.failedProviderHandle === selection.selectedProvider.providerHandle && action.failedGeneration === selection.selectedProvider.providerGeneration && action.restoreProviderHandle === selection.fallbackProvider.providerHandle && action.restoreGeneration === selection.fallbackProvider.providerGeneration && result.affectedProviderHandle === action.failedProviderHandle && sameProvider(result.activeProvider, selection.fallbackProvider)
}

function semanticIsValid(schemaName, value, context, semantic) {
  if (semantic === 'resolution-exchange') return resolutionExchangeIsValid(context, value)
  if (semantic === 'lifecycle-transition') return lifecycleTransitionIsValid(context, value)
  if (semantic === 'selection-registration-pins') {
    return selectionIsValid(value) && registrationMatches(value.defaultProvider, context.registrations.find(registration => registration.providerHandle === value.defaultProvider.providerHandle)) && registrationMatches(value.fallbackProvider, context.registrations.find(registration => registration.providerHandle === value.fallbackProvider.providerHandle)) && registrationMatches(value.selectedProvider, context.registrations.find(registration => registration.providerHandle === value.selectedProvider.providerHandle))
  }
  if (schemaName === 'icon-theme-provider-registration.v1.schema.json') return providerBindingIsValid(value)
  if (schemaName === 'icon-theme-selection.v1.schema.json') return selectionIsValid(value)
  if (schemaName === 'icon-theme-resolution-result.v1.schema.json') return structuredPathsAreValid(value)
  if (schemaName === 'icon-theme-lifecycle-operation.v1.schema.json' && value.operation.kind === 'register') {
    return value.operation.identity.providerId === `plugin:${value.operation.principal.pluginId}:${value.operation.identity.namespace}` && coverageIsValid(value.operation.coverage, value.operation.providerGeneration, value.operation.identity)
  }
  return true
}

const valid = JSON.parse(await readFile(path.join(root, 'test-vectors/icon-theme/valid/complete.json'), 'utf8'))
for (const [group, values] of [
  ['registration', valid.registrations],
  ['selection', [valid.initialSelection, valid.selection]],
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
expect('selection default exact generation and version resolve to registration', registrationMatches(valid.selection.defaultProvider, reicon))
expect('selection pins default, selected, and fallback to the profile revision', selectionIsValid(valid.selection))
expect('selection fallback is the exact default generation and version', sameProvider(valid.selection.fallbackProvider, valid.selection.defaultProvider))
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

const lifecycleResults = new Map(valid.resultsLifecycle.map(value => [value.requestId, value]))
const currentSelection = structuredClone(valid.initialSelection)
const transitionContexts = new Map()
for (const operation of valid.operations) {
  const result = lifecycleResults.get(operation.requestId)
  transitionContexts.set(operation.requestId, { selection: structuredClone(currentSelection), operation, registrations: valid.registrations })
  expect(`${operation.operation.kind} has a correlated lifecycle result`, result !== undefined)
  expect(`${operation.operation.kind} transition preserves exact pins`, lifecycleTransitionIsValid({ selection: currentSelection, operation, registrations: valid.registrations }, result))
  currentSelection.profileRevision = result.profileRevision
  currentSelection.selectedProvider.profileRevision = result.profileRevision
  currentSelection.defaultProvider.profileRevision = result.profileRevision
  currentSelection.fallbackProvider.profileRevision = result.profileRevision
  if (operation.operation.kind === 'select' || operation.operation.kind === 'rollback') {
    currentSelection.selectedProvider = { ...result.activeProvider, profileRevision: result.profileRevision }
  }
  if (operation.operation.kind === 'select') {
    currentSelection.outcome = 'selected'
    currentSelection.requestedProviderHandle = operation.operation.providerHandle
    currentSelection.reason = 'user-selection'
  }
  if (operation.operation.kind === 'rollback') {
    currentSelection.outcome = 'rolled-back'
    currentSelection.requestedProviderHandle = operation.operation.failedProviderHandle
    currentSelection.reason = operation.operation.reason
  }
}

const boundary = JSON.parse(await readFile(path.join(root, 'test-vectors/icon-theme/valid/normalized-vector.json'), 'utf8'))
const boundaryValidator = validators.get('icon-theme-resolution-result.v1.schema.json')
expect('normalized command descriptor is valid public data', boundaryValidator(boundary.value), boundaryValidator.errors)
expect('normalized command descriptor has no raw path or SVG payload', JSON.stringify(boundary.value).includes('"d"') === false && JSON.stringify(boundary.value).includes('<svg') === false)

function vectorContext(reference) {
  if (reference?.baseOperationRequestId !== undefined) {
    const base = structuredClone(transitionContexts.get(reference.baseOperationRequestId))
    if (base === undefined) throw new Error(`unknown lifecycle context: ${reference.baseOperationRequestId}`)
    if (reference.operationOverride !== undefined) {
      base.operation = {
        ...base.operation,
        ...reference.operationOverride,
        operation: { ...base.operation.operation, ...reference.operationOverride.operation },
      }
    }
    return base
  }
  if (reference?.baseResolutionRequestId !== undefined) {
    const request = structuredClone(valid.requests.find(value => value.requestId === reference.baseResolutionRequestId))
    if (request === undefined) throw new Error(`unknown resolution context: ${reference.baseResolutionRequestId}`)
    Object.assign(request, reference.requestOverride)
    const registration = valid.registrations.find(value => value.providerHandle === request.providerHandle)
    return { request, registration }
  }
  if (reference?.baseRegistrations === true) return { registrations: valid.registrations }
  return reference
}

function contextIsValid(context) {
  if (context?.selection !== undefined && context?.operation !== undefined) {
    const selectionValidator = validators.get('icon-theme-selection.v1.schema.json')
    const operationValidator = validators.get('icon-theme-lifecycle-operation.v1.schema.json')
    return selectionValidator(context.selection) && selectionIsValid(context.selection) && operationValidator(context.operation)
  }
  if (context?.registration !== undefined && context?.request !== undefined) {
    const registrationValidator = validators.get('icon-theme-provider-registration.v1.schema.json')
    const requestValidator = validators.get('icon-theme-resolution-request.v1.schema.json')
    return registrationValidator(context.registration) && providerBindingIsValid(context.registration) && requestValidator(context.request)
  }
  if (context?.registrations !== undefined) {
    const registrationValidator = validators.get('icon-theme-provider-registration.v1.schema.json')
    return context.registrations.every(registration => registrationValidator(registration) && providerBindingIsValid(registration))
  }
  return true
}

const invalidDirectory = path.join(root, 'test-vectors/icon-theme/invalid')
for (const name of (await readdir(invalidDirectory)).filter(name => name.endsWith('.json')).sort()) {
  const vector = JSON.parse(await readFile(path.join(invalidDirectory, name), 'utf8'))
  const validator = validators.get(vector.schema)
  if (validator === undefined) throw new Error(`unknown validator in ${name}: ${vector.schema}`)
  const schemaValid = validator(vector.value)
  if (vector.semantic !== undefined) {
    const context = vectorContext(vector.context)
    expect(`${vector.case} remains schema-shaped`, schemaValid, validator.errors)
    expect(`${vector.case} has valid context`, contextIsValid(context))
    expect(vector.case, !semanticIsValid(vector.schema, vector.value, context, vector.semantic))
  } else {
    expect(vector.case, !schemaValid, validator.errors)
  }
}

if (failures > 0) throw new Error(`${failures} icon-theme conformance case(s) failed`)
console.log('Icon theme provider conformance: all cases passed')
