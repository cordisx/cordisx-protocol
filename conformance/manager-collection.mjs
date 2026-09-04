import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Ajv2020 from 'ajv/dist/2020.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const schemaNames = [
  'ui-common.v1.schema.json',
  'agent-avatar.v1.schema.json',
  'navigation-collection-actions.v1.schema.json',
  'manager-collection-common.v1.schema.json',
  'manager-collection-registration.v1.schema.json',
  'manager-collection-query.v1.schema.json',
  'manager-collection-snapshot.v1.schema.json',
  'manager-collection-action-result.v1.schema.json',
]

const schemas = new Map()
for (const name of schemaNames) {
  schemas.set(name, JSON.parse(await readFile(path.join(root, 'schemas', name), 'utf8')))
}

const ajv = new Ajv2020({ allErrors: true, strict: true, strictRequired: false, allowUnionTypes: true })
for (const schema of schemas.values()) ajv.addSchema(schema)
const validators = Object.fromEntries([
  ['registration', 'manager-collection-registration.v1.schema.json'],
  ['query', 'manager-collection-query.v1.schema.json'],
  ['snapshot', 'manager-collection-snapshot.v1.schema.json'],
  ['result', 'manager-collection-action-result.v1.schema.json'],
].map(([key, name]) => [key, ajv.getSchema(schemas.get(name).$id)]))

function schemaErrors(validator) {
  return (validator.errors ?? []).map(error => `${error.instancePath || '/'} ${error.message}`)
}

function duplicates(values) {
  const seen = new Set()
  return values.filter(value => seen.has(value) || (seen.add(value), false))
}

function validateSuite(suite) {
  const errors = []
  for (const [key, validator] of Object.entries(validators)) {
    if (!validator(suite[key])) errors.push(...schemaErrors(validator).map(error => `${key}${error}`))
  }
  if (errors.length > 0) return errors

  const { registration, query, snapshot, result } = suite
  const viewIds = registration.views.map(view => view.id)
  if (duplicates(viewIds).length > 0) errors.push('registration view ids must be unique')
  if (!viewIds.includes(registration.defaultView)) errors.push('default view must resolve')
  if (!viewIds.includes(query.view)) errors.push('query view must resolve')

  if (query.collectionId !== registration.id || snapshot.collectionId !== registration.id) errors.push('collection identity drift')
  if (snapshot.queryRevision !== query.queryRevision || snapshot.view !== query.view || snapshot.normalizedSearch !== query.search.normalized) errors.push('snapshot query fence mismatch')

  const itemIds = snapshot.items.map(item => item.id)
  if (duplicates(itemIds).length > 0) errors.push('item ids must be unique')
  for (const item of snapshot.items) {
    const actionIds = item.actions.map(action => action.id)
    if (duplicates(actionIds).length > 0) errors.push(`item ${item.id} action ids must be unique`)
    if (item.leadingVisual.kind === 'avatar-stack' && duplicates(item.leadingVisual.entries.map(entry => entry.id)).length > 0) errors.push(`item ${item.id} avatar ids must be unique`)
    for (const action of item.actions) {
      if (action.kind === 'command' && action.tone === 'danger' && action.confirmation === undefined) errors.push(`item ${item.id} danger command requires confirmation`)
      if (action.kind === 'text-input-command') {
        if (action.input.minLength > action.input.maxLength) errors.push(`item ${item.id} text input bounds are inverted`)
        if (Object.hasOwn(action.command.arguments ?? {}, action.input.argument)) errors.push(`item ${item.id} text input argument already exists`)
        const initial = action.input.trim === 'both' ? action.input.initialValue?.trim() : action.input.initialValue
        if (initial !== undefined && (initial.length < action.input.minLength || initial.length > action.input.maxLength)) errors.push(`item ${item.id} initial text is outside bounds`)
      }
    }
  }

  const resultItem = snapshot.items.find(item => item.id === result.itemId)
  const resultAction = resultItem?.actions.find(action => action.id === result.actionId)
  if (result.collectionId !== registration.id || resultItem === undefined || resultAction === undefined) errors.push('result identity does not resolve')
  if (resultAction?.kind === 'copy-route-link' || resultAction?.kind === 'copy-text') errors.push('Host copy effects do not accept plugin action results')
  if (result.status === 'applied' && result.revision <= snapshot.revision) errors.push('applied result revision must advance the source')
  return errors
}

function clone(value) {
  return structuredClone(value)
}

function applyMutation(base, mutation) {
  const value = clone(base)
  const parts = mutation.target.split('.')
  const property = parts.pop()
  let target = value
  for (const part of parts) target = target[Number.isInteger(Number(part)) ? Number(part) : part]
  if (mutation.op === 'set') target[property] = mutation.value
  else if (mutation.op === 'delete') delete target[property]
  else throw new Error(`unknown mutation ${mutation.op}`)
  return value
}

const complete = JSON.parse(await readFile(path.join(root, 'test-vectors/manager-collection/valid/complete.json'), 'utf8'))
assert.deepEqual(validateSuite(complete), [])

const invalidDir = path.join(root, 'test-vectors/manager-collection/invalid')
for (const name of (await readdir(invalidDir)).filter(name => name.endsWith('.json')).sort()) {
  const mutation = JSON.parse(await readFile(path.join(invalidDir, name), 'utf8'))
  assert.notDeepEqual(validateSuite(applyMutation(complete, mutation)), [], `${name} must be invalid`)
}

console.log('Manager collection conformance: all vectors passed')
