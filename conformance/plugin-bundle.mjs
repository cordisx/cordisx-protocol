import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const schemaNames = [
  'ui-common.v1.schema.json',
  'plugin-lifecycle-common.v1.schema.json',
  'plugin-package-source.v1.schema.json',
  'plugin-bundle-common.v1.schema.json',
  'plugin-bundle.v1.schema.json',
  'plugin-bundle-lifecycle-operation.v1.schema.json',
  'plugin-bundle-lifecycle-result.v1.schema.json',
  'plugin-bundle-manager-snapshot.v1.schema.json',
]
const schemas = new Map()
for (const name of schemaNames) schemas.set(name, JSON.parse(await readFile(path.join(root, 'schemas', name), 'utf8')))

const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true })
addFormats(ajv)
for (const schema of schemas.values()) ajv.addSchema(schema)

function validator(name) {
  const validate = ajv.getSchema(schemas.get(name).$id)
  if (validate === undefined) throw new Error(`${name} was not registered`)
  return validate
}

const validators = {
  bundle: validator('plugin-bundle.v1.schema.json'),
  operation: validator('plugin-bundle-lifecycle-operation.v1.schema.json'),
  result: validator('plugin-bundle-lifecycle-result.v1.schema.json'),
  snapshot: validator('plugin-bundle-manager-snapshot.v1.schema.json'),
}

function schemaErrors(validate) {
  return (validate.errors ?? []).map(error => `${error.instancePath || '/'} ${error.message}`)
}

function duplicates(values) {
  const seen = new Set()
  const duplicate = new Set()
  for (const value of values) {
    if (seen.has(value)) duplicate.add(value)
    seen.add(value)
  }
  return [...duplicate]
}

function validateBundle(value) {
  if (!validators.bundle(value)) return schemaErrors(validators.bundle)
  const errors = []
  for (const id of duplicates(value.members.map(member => member.id))) errors.push(`duplicate member id: ${id}`)
  for (const memberPath of duplicates(value.members.map(member => member.path))) errors.push(`duplicate member path: ${memberPath}`)
  for (const member of value.members) {
    if (member.required && !member.enabledByDefault) errors.push(`required member is not enabled by default: ${member.id}`)
  }
  return errors
}

function validateOperation(value) {
  if (!validators.operation(value)) return schemaErrors(validators.operation)
  const operation = value.operation
  const errors = []
  if ('bundlePermissions' in operation) {
    for (const id of duplicates(operation.bundlePermissions.map(item => item.permissionId))) errors.push(`duplicate bundle permission: ${id}`)
  }
  if ('pluginOverrides' in operation) {
    for (const key of duplicates(operation.pluginOverrides.map(item => `${item.pluginId}\0${item.permissionId}`))) errors.push(`duplicate plugin override: ${key}`)
  }
  if ('clearPluginOverrides' in operation) {
    const clearKeys = operation.clearPluginOverrides.map(item => `${item.pluginId}\0${item.permissionId}`)
    for (const key of duplicates(clearKeys)) errors.push(`duplicate cleared plugin override: ${key}`)
    const assigned = new Set(operation.pluginOverrides.map(item => `${item.pluginId}\0${item.permissionId}`))
    for (const key of clearKeys) if (assigned.has(key)) errors.push(`plugin override is both assigned and cleared: ${key}`)
  }
  return errors
}

function validateResult(value) {
  if (!validators.result(value)) return schemaErrors(validators.result)
  if (value.plan === undefined) return []
  const errors = []
  for (const id of duplicates(value.plan.permissionRequests.map(item => item.permissionId))) errors.push(`duplicate permission request: ${id}`)
  return errors
}

function validateSnapshot(value) {
  if (!validators.snapshot(value)) return schemaErrors(validators.snapshot)
  const errors = []
  const bundleIds = new Set(value.bundles.map(bundle => bundle.id))
  for (const id of duplicates(value.bundles.map(bundle => bundle.id))) errors.push(`duplicate bundle id: ${id}`)
  for (const bundle of value.bundles) {
    const memberIds = new Set(bundle.members.map(member => member.pluginId))
    for (const id of duplicates(bundle.members.map(member => member.pluginId))) errors.push(`duplicate member ${id} in ${bundle.id}`)
    for (const member of bundle.members) {
      if (member.installedViaBundle !== (member.bundleIds.length > 0)) errors.push(`installedViaBundle differs from claims for ${member.pluginId}`)
      if (member.state === 'version-conflict' && member.conflict === undefined) errors.push(`version conflict lacks details for ${member.pluginId}`)
      for (const owner of member.bundleIds) if (!bundleIds.has(owner)) errors.push(`unknown bundle claim ${owner}`)
    }
    for (const permission of bundle.permissions) {
      if (!memberIds.has(permission.pluginId)) errors.push(`permission references non-member ${permission.pluginId}`)
      if (permission.pluginOverride !== undefined && permission.effectiveSource !== 'plugin-override') errors.push(`override source mismatch for ${permission.permissionId}`)
      for (const affected of permission.affectedBundleIds) if (!bundleIds.has(affected)) errors.push(`unknown affected bundle ${affected}`)
    }
    for (const claim of bundle.claims) {
      if (!memberIds.has(claim.pluginId)) errors.push(`claim references non-member ${claim.pluginId}`)
      if (claim.kind === 'bundle' && !bundleIds.has(claim.claimantId)) errors.push(`claim references unknown bundle ${claim.claimantId}`)
    }
    if (bundle.enabled && bundle.availableOperations.includes('enable')) errors.push(`enabled bundle ${bundle.id} exposes enable`)
    if (!bundle.enabled && bundle.availableOperations.includes('disable')) errors.push(`disabled bundle ${bundle.id} exposes disable`)
  }
  return errors
}

const caseValidators = { bundle: validateBundle, operation: validateOperation, result: validateResult, snapshot: validateSnapshot }

async function files(directory) {
  return (await readdir(directory, { withFileTypes: true }))
    .filter(entry => entry.isFile() && entry.name.endsWith('.json'))
    .map(entry => path.join(directory, entry.name))
    .sort()
}

let failures = 0
for (const expected of ['valid', 'invalid']) {
  for (const file of await files(path.join(root, 'test-vectors/plugin-bundle', expected))) {
    const vector = JSON.parse(await readFile(file, 'utf8'))
    const validate = caseValidators[vector.case]
    const errors = validate === undefined ? [`unknown case ${String(vector.case)}`] : validate(vector.value)
    const failed = expected === 'valid' ? errors.length > 0 : errors.length === 0
    if (failed) {
      console.error(`${path.relative(root, file)} should be ${expected}`, errors)
      failures += 1
    }
  }
}

if (failures > 0) process.exitCode = 1
else console.log('plugin bundle conformance passed')
