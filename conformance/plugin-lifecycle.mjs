import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const schemaNames = [
  'ui-common.v1.schema.json',
  'extension-point-common.v1.schema.json',
  'platform-model.v1.schema.json',
  'platform-session.v1.schema.json',
  'plugin-manifest.v1.schema.json',
  'permission-common.v1.schema.json',
  'permission-authorization-plan.v1.schema.json',
  'permission-authorization-decision.v1.schema.json',
  'plugin-lifecycle-common.v1.schema.json',
  'plugin-package.v1.schema.json',
  'plugin-activation.v1.schema.json',
  'plugin-lifecycle-operation.v1.schema.json',
  'plugin-lifecycle-result.v1.schema.json',
  'plugin-runtime-snapshot.v1.schema.json',
]
const schemas = new Map()
for (const name of schemaNames) {
  schemas.set(name, JSON.parse(await readFile(path.join(root, 'schemas', name), 'utf8')))
}

const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true })
addFormats(ajv)
for (const schema of schemas.values()) ajv.addSchema(schema)

function schemaValidator(name) {
  const validator = ajv.getSchema(schemas.get(name).$id)
  if (validator === undefined) throw new Error(`${name} was not registered`)
  return validator
}

const validators = {
  package: schemaValidator('plugin-package.v1.schema.json'),
  activation: schemaValidator('plugin-activation.v1.schema.json'),
  operation: schemaValidator('plugin-lifecycle-operation.v1.schema.json'),
  result: schemaValidator('plugin-lifecycle-result.v1.schema.json'),
  snapshot: schemaValidator('plugin-runtime-snapshot.v1.schema.json'),
}

function validatorErrors(validator) {
  return (validator.errors ?? []).map(error => `${error.instancePath || '/'} ${error.message}`)
}

function duplicates(values) {
  const seen = new Set()
  const repeated = new Set()
  for (const value of values) {
    if (seen.has(value)) repeated.add(value)
    seen.add(value)
  }
  return [...repeated]
}

export function validatePackage(value) {
  if (!validators.package(value)) return validatorErrors(validators.package)
  const errors = []
  if (value.runtimeManifest.id !== value.id) errors.push('runtime manifest id differs from package id')
  const dependencyIds = value.dependencies.map(item => item.id)
  for (const id of duplicates(dependencyIds)) errors.push(`duplicate dependency: ${id}`)
  if (dependencyIds.includes(value.id)) errors.push('package depends on itself')
  return errors
}

function graphErrors(plugins) {
  const errors = []
  const byId = new Map()
  for (const plugin of plugins) {
    if (byId.has(plugin.id)) errors.push(`duplicate active plugin: ${plugin.id}`)
    byId.set(plugin.id, plugin)
    for (const id of duplicates(plugin.dependencies.map(item => item.id))) {
      errors.push(`duplicate dependency on ${id} from ${plugin.id}`)
    }
  }
  for (const plugin of plugins) {
    for (const dependency of plugin.dependencies) {
      const installed = byId.get(dependency.id)
      if (installed === undefined) errors.push(`missing dependency ${dependency.id} for ${plugin.id}`)
      else if (installed.version !== dependency.version) errors.push(`dependency version mismatch ${dependency.id} for ${plugin.id}`)
      else if (plugin.enabled && !installed.enabled) errors.push(`enabled plugin ${plugin.id} depends on disabled ${dependency.id}`)
    }
  }
  const visiting = new Set()
  const visited = new Set()
  const visit = (id) => {
    if (visiting.has(id)) {
      errors.push(`dependency cycle at ${id}`)
      return
    }
    if (visited.has(id)) return
    visiting.add(id)
    for (const dependency of byId.get(id)?.dependencies ?? []) {
      if (byId.has(dependency.id)) visit(dependency.id)
    }
    visiting.delete(id)
    visited.add(id)
  }
  for (const id of byId.keys()) visit(id)
  return errors
}

export function validateActivation(value) {
  if (!validators.activation(value)) return validatorErrors(validators.activation)
  const errors = []
  if (value.lastGoodRevision > value.revision) errors.push('lastGoodRevision exceeds revision')
  errors.push(...graphErrors(value.plugins))
  return errors
}

export function validateOperation(value) {
  if (!validators.operation(value)) return validatorErrors(validators.operation)
  const errors = []
  if (value.operation.kind === 'inspect-local' && !path.isAbsolute(value.operation.sourceDirectory)) {
    errors.push('local package source must be absolute')
  }
  const decision = value.operation.authorizationDecision
  if (decision !== undefined) {
    if (decision.profileId !== value.profileId) errors.push('authorization decision profile differs from operation profile')
    if (decision.operation !== value.operation.kind) errors.push('authorization decision operation differs from lifecycle operation')
  }
  return errors
}

export function validateResult(value) {
  if (!validators.result(value)) return validatorErrors(validators.result)
  const errors = []
  for (const id of duplicates(value.affectedPluginIds)) errors.push(`duplicate affected plugin: ${id}`)
  if (value.operation === 'reload' && value.scope !== 'plugin-restart') errors.push('reload must use plugin-restart scope')
  if (['install', 'update', 'enable', 'disable', 'uninstall'].includes(value.operation) && value.scope !== 'plugin-generation') {
    errors.push(`${value.operation} must use plugin-generation scope`)
  }
  if (value.authorizationPlan !== undefined) {
    if (value.authorizationPlan.profileId !== value.profileId) errors.push('authorization plan profile differs from result profile')
    const expected = value.operation === 'inspect-local' ? 'install' : value.operation
    if (value.authorizationPlan.operation !== expected) errors.push('authorization plan operation differs from lifecycle result')
  }
  return errors
}

export function validateSnapshot(value) {
  if (!validators.snapshot(value)) return validatorErrors(validators.snapshot)
  const errors = []
  const ids = value.plugins.map(plugin => plugin.id)
  for (const id of duplicates(ids)) errors.push(`duplicate snapshot plugin: ${id}`)
  const known = new Set(ids)
  for (const plugin of value.plugins) {
    for (const id of duplicates(plugin.dependencies)) errors.push(`duplicate dependency ${id} in snapshot ${plugin.id}`)
    for (const id of duplicates(plugin.dependents)) errors.push(`duplicate dependent ${id} in snapshot ${plugin.id}`)
    for (const id of [...plugin.dependencies, ...plugin.dependents]) {
      if (!known.has(id)) errors.push(`snapshot ${plugin.id} references unknown plugin ${id}`)
    }
    if (plugin.availableOperations.includes('share') && plugin.canonicalSource === undefined) {
      errors.push(`snapshot ${plugin.id} exposes share without a canonical public source`)
    }
    if (plugin.enabled && plugin.availableOperations.includes('enable')) errors.push(`enabled plugin ${plugin.id} exposes enable`)
    if (!plugin.enabled && plugin.availableOperations.includes('disable')) errors.push(`disabled plugin ${plugin.id} exposes disable`)
  }
  return errors
}

const caseValidators = {
  package: validatePackage,
  activation: validateActivation,
  operation: validateOperation,
  result: validateResult,
  snapshot: validateSnapshot,
}

function validateVector(vector) {
  const validate = caseValidators[vector?.case]
  if (validate === undefined) return [`unknown vector case: ${String(vector?.case)}`]
  return validate(vector.value)
}

async function jsonFiles(directory) {
  return (await readdir(directory, { withFileTypes: true }))
    .filter(entry => entry.isFile() && entry.name.endsWith('.json'))
    .map(entry => path.join(directory, entry.name))
    .sort()
}

let failures = 0
for (const file of await jsonFiles(path.join(root, 'test-vectors/plugin-lifecycle/valid'))) {
  const vector = JSON.parse(await readFile(file, 'utf8'))
  const errors = validateVector(vector)
  if (errors.length > 0) {
    console.error(`${path.relative(root, file)} should be valid`, errors)
    failures += 1
  }
}
for (const file of await jsonFiles(path.join(root, 'test-vectors/plugin-lifecycle/invalid'))) {
  const vector = JSON.parse(await readFile(file, 'utf8'))
  if (validateVector(vector).length === 0) {
    console.error(`${path.relative(root, file)} should be invalid`)
    failures += 1
  }
}

const publicSnapshots = JSON.stringify([
  schemas.get('plugin-lifecycle-result.v1.schema.json'),
  schemas.get('plugin-runtime-snapshot.v1.schema.json'),
])
for (const forbidden of [
  'sourceDirectory',
  'localPath',
  'storePath',
  'configValue',
  'secretValue',
  'credential',
  'rendererCallback',
  'electronBridge',
]) {
  if (publicSnapshots.includes(forbidden)) {
    console.error(`Plugin lifecycle public output schemas must not expose ${forbidden}`)
    failures += 1
  }
}

if (failures > 0) throw new Error(`${failures} plugin lifecycle conformance case(s) failed`)
console.log('Plugin lifecycle conformance: all vectors passed')
