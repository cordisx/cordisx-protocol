import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const schemaNames = [
  'ui-common.v1.schema.json',
  'surface-contribution.v1.schema.json',
  'surface-contribution.v2.schema.json',
  'surface-contribution.v3.schema.json',
  'extension-point-common.v1.schema.json',
  'host-extension-point-catalog.v2.schema.json',
  'extension-point-access.v2.schema.json',
  'surface-invocation-context.v1.schema.json',
]
const schemas = new Map()
for (const name of schemaNames) schemas.set(name, JSON.parse(await readFile(path.join(root, 'schemas', name), 'utf8')))

const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true })
addFormats(ajv)
for (const schema of schemas.values()) ajv.addSchema(schema)
const compatibleContributionSchema = {
  $id: 'urn:cordisx:compatible-surface-contribution',
  oneOf: [
    { $ref: schemas.get('surface-contribution.v2.schema.json').$id },
    { $ref: schemas.get('surface-contribution.v3.schema.json').$id },
  ],
}
ajv.addSchema(compatibleContributionSchema)

const validators = {
  catalog: ajv.getSchema(schemas.get('host-extension-point-catalog.v2.schema.json').$id),
  contribution: ajv.getSchema(compatibleContributionSchema.$id),
  access: ajv.getSchema(schemas.get('extension-point-access.v2.schema.json').$id),
  context: ajv.getSchema(schemas.get('surface-invocation-context.v1.schema.json').$id),
}
for (const [kind, validator] of Object.entries(validators)) {
  if (validator === undefined) throw new Error(`${kind} schema was not registered`)
}

const pointFamilies = new Map([
  ['sidebar.footer.before-control', 'action'],
  ['sidebar.footer.after-control', 'action'],
  ['sidebar.footer.menu', 'menu-item'],
  ['sidebar.account.menu', 'menu-item'],
  ['sidebar.navigation.items', 'navigation-item'],
  ['sidebar.workspace.menu', 'menu-item'],
  ['sidebar.session.actions', 'contextual-action'],
  ['sidebar.session.menu', 'contextual-action'],
  ['workspace.toolbar.items', 'action'],
  ['session.header.actions', 'contextual-action'],
  ['session.tabs', 'tab'],
  ['session.banner.items', 'presenter'],
  ['session.message.actions', 'contextual-action'],
  ['session.turn.footer', 'presenter'],
  ['session.tool.actions', 'contextual-action'],
  ['composer.toolbar.items', 'contextual-action'],
  ['composer.command-menu.items', 'contextual-action'],
  ['composer.dock.above', 'presenter'],
  ['composer.dock.below', 'presenter'],
  ['panel.right.header-actions', 'contextual-action'],
  ['panel.right.tabs', 'tab'],
  ['panel.bottom.header-actions', 'contextual-action'],
  ['panel.bottom.tabs', 'tab'],
  ['environment.panel.header-actions', 'action'],
  ['environment.panel.sections', 'environment-section'],
  ['environment.section.actions', 'action'],
  ['environment.section.rows', 'environment-row'],
  ['environment.row.trailing-actions', 'action'],
  ['app', 'outlet'],
  ['main', 'outlet'],
  ['session.content', 'outlet'],
  ['panel.right.content', 'outlet'],
  ['panel.bottom.content', 'outlet'],
])

const legacyFreeDom = new Set([
  'header.actions',
  'composer.before',
  'composer.after',
  'sidebar.footer',
  'shell.overlay',
])

function schemaErrors(validator, value) {
  if (validator(value)) return []
  return (validator.errors ?? []).map(error => `${error.instancePath || '/'} ${error.message}`)
}

function codeUnitCompare(left, right) {
  return left < right ? -1 : left > right ? 1 : 0
}

export function compareContributionsV2(left, right) {
  return codeUnitCompare(left.group ?? 'default', right.group ?? 'default')
    || (left.order ?? 0) - (right.order ?? 0)
    || codeUnitCompare(left.id, right.id)
}

function referenceId(contribution, key) {
  return contribution?.item?.[key]?.id
}

function requiredKind(operation) {
  return operation?.startsWith('surface.')
    ? 'surface'
    : operation?.startsWith('outlet.')
    ? 'outlet'
    : undefined
}

export function validateCatalogSuite(suite) {
  const errors = []
  if (suite === null || typeof suite !== 'object' || Array.isArray(suite)) return ['suite must be an object']
  errors.push(...schemaErrors(validators.catalog, suite.catalog).map(error => `catalog schema: ${error}`))

  const points = Array.isArray(suite.catalog?.points) ? suite.catalog.points : []
  const byId = new Map()
  for (const point of points) {
    if (typeof point?.id !== 'string') continue
    if (byId.has(point.id)) errors.push(`duplicate extension point id: ${point.id}`)
    byId.set(point.id, point)
    const family = pointFamilies.get(point.id)
    if (family === undefined) errors.push(`unknown catalog point: ${point.id}`)
    else if (point.payloadFamily !== family) errors.push(`point ${point.id} requires payload family ${family}`)
    if (legacyFreeDom.has(point.id)) errors.push(`retired free-DOM point is forbidden: ${point.id}`)
  }
  if (suite.complete === true) {
    for (const id of pointFamilies.keys()) if (!byId.has(id)) errors.push(`complete catalog is missing point: ${id}`)
  }

  const contributions = Array.isArray(suite.contributions) ? suite.contributions : []
  const contributionsById = new Map()
  for (const [index, contribution] of contributions.entries()) {
    errors.push(
      ...schemaErrors(validators.contribution, contribution).map(error => `contributions[${index}] schema: ${error}`),
    )
    const key = `${contribution?.surface}\0${contribution?.id}`
    if (contributionsById.has(key)) errors.push(`duplicate contribution identity: ${key}`)
    contributionsById.set(key, contribution)
    if (!byId.has(contribution?.surface)) errors.push(`contribution references unknown point: ${contribution?.surface}`)
  }

  const accesses = Array.isArray(suite.accesses) ? suite.accesses : []
  for (const [index, access] of accesses.entries()) {
    errors.push(...schemaErrors(validators.access, access).map(error => `accesses[${index}] schema: ${error}`))
    const point = byId.get(access?.identity?.pointId)
    if (point === undefined) {
      errors.push(`access references unknown point: ${access?.identity?.pointId ?? '<missing>'}`)
      continue
    }
    const kind = requiredKind(access.operation)
    if (kind !== undefined && point.kind !== kind) errors.push(`access ${access.operation} requires ${kind} point`)
    if (point.availability !== 'available') errors.push(`access point ${point.id} is not available`)
    if (access.operation.startsWith('surface.')) {
      const localContribution = String(access.contributionId ?? '').split(':').at(-1)
      const contribution = contributionsById.get(`${point.id}\0${localContribution}`)
      if (contribution === undefined) {
        errors.push(`surface access references unknown contribution: ${access.contributionId}`)
      } else if (access.operation === 'surface.command.invoke') {
        const commandId = referenceId(contribution, 'command')
        if (commandId !== undefined && !access.commandId.endsWith(`:${commandId}`) && access.commandId !== commandId) {
          errors.push('surface command access does not match contribution command')
        }
      } else if (access.operation === 'surface.route.navigate') {
        const routeId = referenceId(contribution, 'route')
        if (routeId !== undefined && !access.routeId.endsWith(`:${routeId}`) && access.routeId !== routeId) {
          errors.push('surface route access does not match contribution route')
        }
      }
    }
  }

  const contexts = Array.isArray(suite.contexts) ? suite.contexts : []
  for (const [index, context] of contexts.entries()) {
    errors.push(...schemaErrors(validators.context, context).map(error => `contexts[${index}] schema: ${error}`))
    const localContribution = String(context?.contributionId ?? '').split(':').at(-1)
    const contribution = contributionsById.get(`${context?.pointId}\0${localContribution}`)
    if (contribution === undefined) errors.push(`context references unknown contribution: ${context?.contributionId}`)
    if (context?.generation !== suite.generation) errors.push('context generation is stale or unknown')
    const commandId = referenceId(contribution, 'command')
    if (commandId !== undefined && !context.commandId.endsWith(`:${commandId}`) && context.commandId !== commandId) {
      errors.push('context command does not match contribution command')
    }
  }
  return errors
}

async function jsonFiles(directory) {
  return (await readdir(directory, { withFileTypes: true }))
    .filter(entry => entry.isFile() && entry.name.endsWith('.json'))
    .map(entry => path.join(directory, entry.name))
    .sort()
}

let failures = 0
for (const file of await jsonFiles(path.join(root, 'test-vectors/ui-extension-catalog/valid'))) {
  const suite = JSON.parse(await readFile(file, 'utf8'))
  const errors = validateCatalogSuite(suite)
  if (errors.length > 0) {
    console.error(`${path.relative(root, file)} should be valid`, errors)
    failures += 1
  }
}
for (const file of await jsonFiles(path.join(root, 'test-vectors/ui-extension-catalog/invalid'))) {
  const suite = JSON.parse(await readFile(file, 'utf8'))
  if (validateCatalogSuite(suite).length === 0) {
    console.error(`${path.relative(root, file)} should be invalid`)
    failures += 1
  }
}

const order = [
  { id: 'z', group: 'utility', order: 0 },
  { id: 'b', group: 'action', order: 0 },
  { id: 'a', group: 'action', order: 0 },
].sort(compareContributionsV2).map(item => item.id)
if (JSON.stringify(order) !== JSON.stringify(['a', 'b', 'z'])) {
  console.error('version-2 code-unit ordering is not deterministic', order)
  failures += 1
}

if (failures > 0) throw new Error(`${failures} UI extension catalog conformance case(s) failed`)
console.log('UI extension catalog conformance: all vectors passed')
