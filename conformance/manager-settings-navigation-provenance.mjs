import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Ajv2020 from 'ajv/dist/2020.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const surfaceV9Schema =
  'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/surface-contribution.v9.schema.json'
const schemaNames = [
  'ui-common.v1.schema.json',
  ...Array.from({ length: 9 }, (_, index) => `surface-contribution.v${index + 1}.schema.json`),
  'manager-settings-navigation-groups.v1.schema.json',
  'manager-settings-navigation-projection.v2.schema.json',
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

function validateRegistration(registration) {
  const errors = []
  const { options, item } = registration
  const hasSchema = Object.hasOwn(options ?? {}, '$schema')
  const hasVersion = Object.hasOwn(options ?? {}, 'schemaVersion')
  if (hasSchema !== hasVersion) return ['surface schema and version must be present together']
  if (options?.name !== 'manager.settings.navigation-items') errors.push('registration must target Manager navigation')

  if (hasSchema) {
    if (options.$schema !== surfaceV9Schema || options.schemaVersion !== 9) {
      errors.push('versioned registration must use exact surface v9 pair')
    }
    const document = {
      $schema: options.$schema,
      schemaVersion: options.schemaVersion,
      id: options.id,
      surface: options.name,
      group: options.group,
      ...(options.order === undefined ? {} : { order: options.order }),
      ...(options.when === undefined ? {} : { when: options.when }),
      ...(options.disabled === undefined ? {} : { disabled: options.disabled }),
      item,
    }
    errors.push(...schemaErrors(validator('surface-contribution.v9.schema.json'), document))
    return errors
  }

  if (item?.navigationGroup !== undefined) errors.push('legacy-unversioned registration cannot carry navigationGroup')
  const legacyDocument = {
    $schema:
      'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/surface-contribution.v8.schema.json',
    schemaVersion: 8,
    id: options?.id,
    surface: options?.name,
    group: options?.group,
    ...(options?.order === undefined ? {} : { order: options.order }),
    ...(options?.when === undefined ? {} : { when: options.when }),
    ...(options?.disabled === undefined ? {} : { disabled: options.disabled }),
    item,
  }
  errors.push(...schemaErrors(validator('surface-contribution.v8.schema.json'), legacyDocument))
  return errors
}

function expectedProjection(registrations, catalog) {
  const groupOrder = new Map(catalog.groups.map(group => [group.id, group.order]))
  return registrations.map(({ owner, options, item }) => {
    const versioned = Object.hasOwn(options, '$schema') && Object.hasOwn(options, 'schemaVersion')
    const declaredGroup = versioned ? item.navigationGroup?.id : undefined
    return {
      owner,
      id: options.id,
      surfaceProvenance: versioned
        ? { kind: 'versioned', $schema: surfaceV9Schema, schemaVersion: 9 }
        : { kind: 'legacy-unversioned' },
      insertionGroup: options.group,
      ...(declaredGroup === undefined ? {} : { declaredGroup }),
      effectiveGroup: declaredGroup ?? catalog.fallbackGroup,
      assignment: declaredGroup !== undefined
        ? 'declared'
        : versioned
        ? 'unassigned-fallback'
        : 'legacy-fallback',
      order: options.order ?? 0,
    }
  }).sort((left, right) => {
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
  if (!Array.isArray(suite.registrations)) errors.push('registrations must be an array')
  for (const [index, registration] of (suite.registrations ?? []).entries()) {
    errors.push(...validateRegistration(registration).map(error => `registrations[${index}] ${error}`))
  }
  errors.push(
    ...schemaErrors(validator('manager-settings-navigation-projection.v2.schema.json'), suite.projection)
      .map(error => `projection ${error}`),
  )
  if (errors.length > 0) return errors

  const expected = expectedProjection(suite.registrations, suite.projection.catalog)
  if (!equal(suite.projection.contributions, expected)) errors.push('runtime provenance projection drift')
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

const directory = path.join(root, 'test-vectors/manager-settings-navigation-provenance')
const valid = JSON.parse(await readFile(path.join(directory, 'valid/runtime.json'), 'utf8'))
assert.deepEqual(validateSuite(valid), [])
for (const name of (await readdir(path.join(directory, 'invalid'))).filter(name => name.endsWith('.json')).sort()) {
  const vector = JSON.parse(await readFile(path.join(directory, 'invalid', name), 'utf8'))
  assert.notDeepEqual(validateSuite(mutate(valid, vector)), [], `${name} must be invalid`)
}

console.log('Manager Settings navigation runtime provenance: all vectors passed')
