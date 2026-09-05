import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readdir, readFile } from 'node:fs/promises'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const schemaNames = [
  'ui-common.v1.schema.json',
  'extension-point-common.v1.schema.json',
  'route.v2.schema.json',
  'page.v3.schema.json',
  'session-common.v1.schema.json',
  'agents-common.v1.schema.json',
  'agent-avatar.v1.schema.json',
  'plugin-config-common.v1.schema.json',
  'plugin-config-common.v2.schema.json',
  'plugin-config-descriptor.v2.schema.json',
  'plugin-config-mutation.v1.schema.json',
  'plugin-config-result.v2.schema.json',
  'manager-content-navigation.v1.schema.json',
  'manager-content-navigation.v2.schema.json',
  'manager-content-navigation.v3.schema.json',
  'manager-content-navigation.v4.schema.json',
  'manager-content-projection.v1.schema.json',
  'manager-content-projection.v2.schema.json',
  'manager-content-projection.v3.schema.json',
  'manager-content-config-common.v1.schema.json',
  'manager-content-config-command.v1.schema.json',
  'manager-content-config-result.v1.schema.json',
  'manager-content-config-subscription-page.v1.schema.json',
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
const schemaErrors = (validate, value) =>
  validate(value) ? [] : (validate.errors ?? []).map(error => `${error.instancePath || '/'} ${error.message}`)
const equal = (left, right) => JSON.stringify(left) === JSON.stringify(right)

const frozenFiles = [
  'schemas/manager-content-navigation.v1.schema.json',
  'schemas/manager-content-navigation.v2.schema.json',
  'schemas/manager-content-navigation.v3.schema.json',
  'schemas/manager-content-projection.v1.schema.json',
  'schemas/manager-content-projection.v2.schema.json',
  'schemas/plugin-config-common.v1.schema.json',
  'schemas/plugin-config-common.v2.schema.json',
  'schemas/plugin-config-descriptor.v2.schema.json',
  'schemas/plugin-config-mutation.v1.schema.json',
  'schemas/plugin-config-result.v2.schema.json',
  'types/manager-content-navigation.v1.d.ts',
  'types/manager-content-navigation.v2.d.ts',
  'types/manager-content-navigation.v3.d.ts',
].sort()
const frozenDigest = createHash('sha256')
for (const file of frozenFiles) {
  frozenDigest.update(file)
  frozenDigest.update('\0')
  frozenDigest.update(readFileSync(path.join(root, file)))
  frozenDigest.update('\0')
}
assert.equal(
  frozenDigest.digest('hex'),
  '947815ea64ac2b050d3076008950c48b80dcf5860b2065c26d8094d24e44d0ff',
  'navigation v1-v3, projection v1-v2, and reused plugin-config bytes must remain frozen',
)

function hasPath(value, segments) {
  let current = value
  for (const segment of segments) {
    if (current === null || typeof current !== 'object' || !Object.hasOwn(current, segment)) return false
    current = current[segment]
  }
  return true
}

function schemaDefault(envelope, segments) {
  let current = envelope
  for (const segment of segments) {
    current = current?.properties?.[segment]
    if (current === undefined) return { found: false }
  }
  return Object.hasOwn(current, 'default') ? { found: true, value: current.default } : { found: false }
}

function ownsNamespace(pluginId, namespace) {
  return namespace === pluginId || namespace.startsWith(`${pluginId}.`)
}

function applyOperations(value, operations) {
  const next = structuredClone(value)
  for (const operation of operations) {
    let target = next
    for (const segment of operation.path.slice(0, -1)) {
      if (target[segment] === null || typeof target[segment] !== 'object' || Array.isArray(target[segment])) {
        target[segment] = {}
      }
      target = target[segment]
    }
    const leaf = operation.path.at(-1)
    if (operation.op === 'set') target[leaf] = structuredClone(operation.value)
    else delete target[leaf]
  }
  return next
}

function validateSuite(suite) {
  const errors = []
  errors.push(...schemaErrors(validator('route.v2.schema.json'), suite.route?.document).map(error => `route ${error}`))
  errors.push(...schemaErrors(validator('page.v3.schema.json'), suite.page?.document).map(error => `page ${error}`))
  errors.push(
    ...schemaErrors(validator('manager-content-navigation.v4.schema.json'), suite.declaration).map(error =>
      `declaration ${error}`
    ),
  )
  errors.push(
    ...schemaErrors(validator('manager-content-projection.v3.schema.json'), suite.projection).map(error =>
      `projection ${error}`
    ),
  )
  if (suite.route?.owner !== suite.owner || suite.page?.owner !== suite.owner) {
    errors.push('route and page must share the declaration owner')
  }
  if (suite.route?.document?.outlet !== 'manager.content' || suite.route?.document?.page !== suite.page?.document?.id) {
    errors.push('declaration route must resolve to one same-owner manager.content page')
  }
  if (suite.declaration?.route?.id !== suite.route?.document?.id) errors.push('declaration route must resolve exactly')

  const declarationBody = suite.declaration?.body
  const projectionBody = suite.projection?.body
  if ((declarationBody === undefined) !== (projectionBody === undefined)) {
    errors.push('Host config body declaration and projection presence must match')
  }
  if (declarationBody?.kind === 'plugin-config-form' && projectionBody?.kind === 'plugin-config-form') {
    if (!ownsNamespace(suite.owner, declarationBody.namespace)) {
      errors.push('body namespace must be owned by the declaring plugin')
    }
    const defaults = declarationBody.defaultMaterialization?.fields ?? []
    const defaultPaths = new Set()
    for (const field of defaults) {
      const key = JSON.stringify(field.path)
      if (defaultPaths.has(key)) errors.push(`duplicate missing-only default path ${key}`)
      defaultPaths.add(key)
      const declared = schemaDefault(projectionBody.configuration?.schema?.envelope, field.path)
      if (!declared.found) errors.push(`missing-only default ${key} is not declared by the Config schema`)
      else if (!equal(declared.value, field.value)) {
        errors.push(`missing-only default ${key} differs from the Config schema default`)
      }
    }
    const binding = projectionBody.binding
    const descriptor = projectionBody.configuration
    if (binding.declarationId !== suite.declaration.id || binding.namespace !== declarationBody.namespace) {
      errors.push('projection binding must match declaration id and namespace')
    }
    if (binding.identity.pluginId !== suite.owner || !ownsNamespace(binding.identity.pluginId, binding.namespace)) {
      errors.push('projection binding owner is invalid')
    }
    if (
      !equal(binding.identity, descriptor.identity) || !equal(binding.scope, descriptor.scope)
      || binding.namespace !== descriptor.namespace
    ) errors.push('projection binding and plugin configuration descriptor fences must match exactly')
    if (descriptor.schema?.kind !== 'schemastery') {
      errors.push('Host config form requires one renderable Schemastery projection')
    }
    if (projectionBody.draft.baseRevision !== descriptor.revision) {
      errors.push('draft base revision must equal the current descriptor revision')
    }
    for (const secret of descriptor.secrets ?? []) {
      if (
        hasPath(descriptor.value, secret.path) || hasPath(descriptor.user, secret.path)
        || hasPath(projectionBody.draft.value, secret.path)
      ) errors.push(`secret path is exposed: ${secret.path.join('.')}`)
    }
  }

  const binding = projectionBody?.binding
  const commands = suite.commands ?? []
  const results = suite.results ?? []
  if (commands.length !== results.length) errors.push('each command must have one exact result')
  const commandIds = new Set()
  for (const [index, command] of commands.entries()) {
    errors.push(
      ...schemaErrors(validator('manager-content-config-command.v1.schema.json'), command).map(error =>
        `commands[${index}] ${error}`
      ),
    )
    const result = results[index]
    errors.push(
      ...schemaErrors(validator('manager-content-config-result.v1.schema.json'), result).map(error =>
        `results[${index}] ${error}`
      ),
    )
    if (commandIds.has(command.commandId)) errors.push(`duplicate command id ${command.commandId}`)
    commandIds.add(command.commandId)
    if (!equal(command.binding, binding)) errors.push(`commands[${index}] binding is stale or divergent`)
    for (const field of ['commandId', 'binding', 'expectedRevision', 'operation']) {
      if (!equal(result?.[field], command[field])) {
        errors.push(`results[${index}] ${field} must echo the command exactly`)
      }
    }
    if (result?.status === 'validated' && command.operation !== 'draft.validate') {
      errors.push(`results[${index}] validated is only valid for draft.validate`)
    }
    if (result?.status === 'preserved' && command.operation !== 'defaults.materialize') {
      errors.push(`results[${index}] preserved is only valid for defaults.materialize`)
    }
    if (result?.code === 'saved' && command.operation !== 'draft.save') {
      errors.push(`results[${index}] saved must correspond to draft.save`)
    }
    if (result?.code === 'defaults-materialized' && command.operation !== 'defaults.materialize') {
      errors.push(`results[${index}] defaults-materialized must correspond to defaults.materialize`)
    }
  }

  if (declarationBody?.kind === 'plugin-config-form' && projectionBody?.configuration?.schema?.kind === 'schemastery') {
    let revision = 0
    let value = {}
    const validateConfig = ajv.compile(projectionBody.configuration.schema.envelope)
    for (const [index, command] of commands.entries()) {
      const result = results[index]
      if (!equal(command.binding, binding)) continue
      if (command.expectedRevision !== revision) {
        if (result?.status !== 'conflict' || result.currentRevision !== revision) {
          errors.push(`commands[${index}] stale CAS must conflict without retry`)
        }
        continue
      }
      if (command.operation === 'defaults.materialize') {
        let changed = false
        const next = structuredClone(value)
        for (const field of declarationBody.defaultMaterialization?.fields ?? []) {
          if (!hasPath(next, field.path)) {
            let target = next
            for (const segment of field.path.slice(0, -1)) target = target[segment] ??= {}
            target[field.path.at(-1)] = structuredClone(field.value)
            changed = true
          }
        }
        if (changed) {
          value = next
          revision += 1
          if (result?.status !== 'applied' || result.code !== 'defaults-materialized' || result.revision !== revision) {
            errors.push(`commands[${index}] must atomically materialize only missing defaults`)
          }
        } else if (result?.status !== 'preserved' || result.revision !== revision) {
          errors.push(`commands[${index}] must preserve existing values idempotently`)
        }
      } else {
        const candidate = applyOperations(value, command.operations ?? [])
        const valid = validateConfig(candidate)
        if (command.operation === 'draft.validate') {
          if (
            revision !== command.expectedRevision
            || (valid ? result?.status !== 'validated' : result?.status !== 'rejected')
          ) errors.push(`commands[${index}] draft validation result is invalid`)
        } else if (!valid) {
          if (result?.status !== 'rejected' || result.code !== 'validation-failed') {
            errors.push(`commands[${index}] invalid save must be rejected`)
          }
        } else {
          value = candidate
          revision += 1
          if (!['applied', 'staged'].includes(result?.status) || result.revision !== revision) {
            errors.push(`commands[${index}] save must use the same revision ledger`)
          }
        }
      }
    }
    const preexisting = { shortcutPolicy: 'mod-enter' }
    const preserved = structuredClone(preexisting)
    for (const field of declarationBody.defaultMaterialization?.fields ?? []) {
      if (!hasPath(preserved, field.path)) throw new Error('valid vector must exercise an existing default field')
    }
    assert.deepEqual(preserved, preexisting, 'missing-only materialization must never overwrite a present value')
  }

  let lastSequence = -1
  let terminal = false
  let subscription
  for (const [pageIndex, page] of (suite.subscriptionPages ?? []).entries()) {
    errors.push(
      ...schemaErrors(validator('manager-content-config-subscription-page.v1.schema.json'), page).map(error =>
        `subscriptionPages[${pageIndex}] ${error}`
      ),
    )
    if (subscription === undefined) subscription = page.subscription
    else if (!equal(page.subscription, subscription)) errors.push('subscription descriptor must remain exact')
    if (!equal(page.subscription?.binding, binding)) errors.push('subscription binding must match projection')
    for (const update of page.updates ?? []) {
      if (terminal) errors.push('updates after the first terminal disposal are forbidden')
      if (update.sequence <= lastSequence) errors.push('subscription update sequence must increase')
      lastSequence = update.sequence
      if (update.kind === 'snapshot-replaced' && !equal(update.body.binding, binding)) {
        errors.push('subscription snapshot binding must remain exact')
      }
      if (update.kind === 'disposed') terminal = true
    }
  }
  errors.push(
    ...schemaErrors(validator('manager-content-config-subscription-close.v1.schema.json'), suite.subscriptionClose).map(
      error => `subscriptionClose ${error}`,
    ),
  )
  if (
    !equal(suite.subscriptionClose?.binding, binding)
    || suite.subscriptionClose?.subscriptionId !== subscription?.subscriptionId
  ) errors.push('subscription close fence must remain exact')
  if (!terminal) errors.push('valid lifecycle must publish one terminal disposal before closure')
  return errors
}

function mutate(base, vector) {
  const value = structuredClone(base)
  for (const operation of vector.operations ?? []) {
    const parts = operation.path.split('.')
    const property = parts.pop()
    let target = value
    for (const part of parts) target = target[Number.isInteger(Number(part)) ? Number(part) : part]
    if (operation.op === 'set') target[property] = operation.value
    else if (operation.op === 'delete') delete target[property]
    else if (operation.op === 'append') target[property].push(operation.value)
  }
  return value
}

const directory = path.join(root, 'test-vectors/manager-content-navigation-v4')
const valid = JSON.parse(await readFile(path.join(directory, 'valid/host-config-form.json'), 'utf8'))
assert.deepEqual(validateSuite(valid), [])
assert.deepEqual(structuredClone(valid), valid, 'all manager config contracts must be structured-clone safe')
for (const name of (await readdir(path.join(directory, 'invalid'))).filter(name => name.endsWith('.json')).sort()) {
  const vector = JSON.parse(await readFile(path.join(directory, 'invalid', name), 'utf8'))
  assert.notDeepEqual(validateSuite(mutate(valid, vector)), [], `${name} must be invalid`)
}

const publicSchemas = JSON.stringify(
  schemaNames.filter(name => name.startsWith('manager-content-')).map(name => schemas.get(name)),
)
for (
  const forbidden of [
    'homeConfigPath',
    'localPath',
    'rendererCallback',
    'container',
    'electronBridge',
    'pluginMount',
    'rawPath',
  ]
) assert.equal(publicSchemas.includes(forbidden), false, `public schema must not expose ${forbidden}`)

console.log('Manager content navigation v4 Host config form conformance passed')
