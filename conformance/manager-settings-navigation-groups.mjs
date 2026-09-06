import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Ajv2020 from 'ajv/dist/2020.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const schemaNames = [
  'ui-common.v1.schema.json',
  ...Array.from({ length: 9 }, (_, index) => `surface-contribution.v${index + 1}.schema.json`),
  'host-extension-point-catalog.v6.schema.json',
  'host-extension-point-catalog.v7.schema.json',
  'host-extension-point-catalog.v8.schema.json',
  'host-extension-point-catalog.v9.schema.json',
  'manager-settings-navigation-groups.v1.schema.json',
  'manager-settings-navigation-projection.v1.schema.json',
]

const schemas = new Map()
for (const name of schemaNames) {
  schemas.set(name, JSON.parse(await readFile(path.join(root, 'schemas', name), 'utf8')))
}
const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true })
for (const schema of schemas.values()) ajv.addSchema(schema)
const validator = name => ajv.getSchema(schemas.get(name).$id)
const schemaErrors = (validate, value) =>
  validate(value)
    ? []
    : (validate.errors ?? []).map(error => `${error.instancePath || '/'} ${error.message}`)
const equal = (left, right) => JSON.stringify(left) === JSON.stringify(right)
const codeUnitOrder = (left, right) => left < right ? -1 : left > right ? 1 : 0

function expectedProjection(catalog, contributions) {
  const groupOrder = new Map(catalog.groups.map(group => [group.id, group.order]))
  const entries = contributions.map(({ owner, document }) => {
    const declaredGroup = document.schemaVersion === 9 ? document.item.navigationGroup?.id : undefined
    const assignment = declaredGroup !== undefined
      ? 'declared'
      : document.schemaVersion === 9
      ? 'unassigned-fallback'
      : 'legacy-fallback'
    return {
      owner,
      id: document.id,
      surfaceSchemaVersion: document.schemaVersion,
      insertionGroup: document.group,
      ...(declaredGroup === undefined ? {} : { declaredGroup }),
      effectiveGroup: declaredGroup ?? catalog.fallbackGroup,
      assignment,
      order: document.order ?? 0,
    }
  })
  return entries.sort((left, right) => {
    const group = groupOrder.get(left.effectiveGroup) - groupOrder.get(right.effectiveGroup)
    if (group !== 0) return group
    const seam = (left.insertionGroup === 'before-settings' ? 0 : 1)
      - (right.insertionGroup === 'before-settings' ? 0 : 1)
    if (seam !== 0) return seam
    if (left.order !== right.order) return left.order - right.order
    const owner = codeUnitOrder(left.owner, right.owner)
    return owner !== 0 ? owner : codeUnitOrder(`${left.owner}:${left.id}`, `${right.owner}:${right.id}`)
  })
}

function validateSuite(suite) {
  const errors = []
  errors.push(
    ...schemaErrors(validator('manager-settings-navigation-groups.v1.schema.json'), suite.catalog)
      .map(error => `catalog ${error}`),
  )
  errors.push(
    ...schemaErrors(validator('host-extension-point-catalog.v9.schema.json'), suite.extensionCatalog)
      .map(error => `extensionCatalog ${error}`),
  )
  errors.push(
    ...schemaErrors(validator('manager-settings-navigation-projection.v1.schema.json'), suite.projection)
      .map(error => `projection ${error}`),
  )

  if (!Array.isArray(suite.contributions)) errors.push('contributions must be an array')
  for (const [index, contribution] of (suite.contributions ?? []).entries()) {
    const version = contribution.document?.schemaVersion
    const validate = validator(`surface-contribution.v${version}.schema.json`)
    if (validate === undefined) errors.push(`contributions[${index}] has unsupported surface version`)
    else errors.push(...schemaErrors(validate, contribution.document).map(error => `contributions[${index}] ${error}`))
    if (contribution.document?.surface !== 'manager.settings.navigation-items') {
      errors.push(`contributions[${index}] must target manager.settings.navigation-items`)
    }
  }
  if (errors.length > 0) return errors

  const descriptor = suite.extensionCatalog.points.find(point => point.id === 'manager.settings.navigation-items')
  if (descriptor === undefined) errors.push('extension catalog must declare manager.settings.navigation-items')
  else if (!equal(descriptor.navigationGroups, suite.catalog)) errors.push('extension catalog group catalog drift')
  if (!equal(suite.projection.catalog, suite.catalog)) errors.push('projection group catalog drift')

  const identities = new Set()
  for (const contribution of suite.contributions) {
    const identity = `${contribution.owner}:${contribution.document.id}`
    if (identities.has(identity)) errors.push(`duplicate contribution identity ${identity}`)
    identities.add(identity)
  }

  const expected = expectedProjection(suite.catalog, suite.contributions)
  if (!equal(suite.projection.contributions, expected)) errors.push('contribution group projection drift')
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
    else throw new Error(`unknown mutation ${operation.op}`)
  }
  return value
}

const directory = path.join(root, 'test-vectors/manager-settings-navigation-groups')
const valid = JSON.parse(await readFile(path.join(directory, 'valid/grouped.json'), 'utf8'))
assert.deepEqual(validateSuite(valid), [])
for (const name of (await readdir(path.join(directory, 'invalid'))).filter(name => name.endsWith('.json')).sort()) {
  const vector = JSON.parse(await readFile(path.join(directory, 'invalid', name), 'utf8'))
  assert.notDeepEqual(validateSuite(mutate(valid, vector)), [], `${name} must be invalid`)
}

console.log('Manager Settings navigation groups: all vectors passed')
