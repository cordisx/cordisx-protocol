import { readFile, readdir } from 'node:fs/promises'
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
  'surface-contribution.v4.schema.json',
  'route.v1.schema.json',
  'page.v1.schema.json',
  'page.v2.schema.json',
  'extension-point-common.v1.schema.json',
  'host-extension-point-catalog.v2.schema.json',
  'host-extension-point-catalog.v3.schema.json',
  'extension-point-access.v2.schema.json',
]
const schemas = new Map()
for (const name of schemaNames) schemas.set(name, JSON.parse(await readFile(path.join(root, 'schemas', name), 'utf8')))

const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true })
addFormats(ajv)
for (const schema of schemas.values()) ajv.addSchema(schema)

const validators = {
  catalog: ajv.getSchema(schemas.get('host-extension-point-catalog.v3.schema.json').$id),
  contribution: ajv.getSchema(schemas.get('surface-contribution.v4.schema.json').$id),
  route: ajv.getSchema(schemas.get('route.v1.schema.json').$id),
  page: ajv.getSchema(schemas.get('page.v2.schema.json').$id),
  access: ajv.getSchema(schemas.get('extension-point-access.v2.schema.json').$id),
  legacyCatalog: ajv.getSchema(schemas.get('host-extension-point-catalog.v2.schema.json').$id),
  legacyContribution: ajv.getSchema(schemas.get('surface-contribution.v3.schema.json').$id),
}
for (const [kind, validator] of Object.entries(validators)) {
  if (validator === undefined) throw new Error(`${kind} schema was not registered`)
}

const BUILT_INS = [
  { id: 'host:marketplace', owner: 'host', order: 100, disabled: false },
  { id: 'host:runtime', owner: 'host', order: 200, disabled: false },
  { id: 'host:launcher', owner: 'host', order: 300, disabled: false },
]
const SETTINGS_SURFACE = 'manager.settings.tabs'
const SETTINGS_OUTLET = 'manager.settings.content'
const LOCAL_ID = /^[a-z0-9][a-z0-9._-]{0,95}$/

function schemaErrors(validator, value) {
  if (validator(value)) return []
  return (validator.errors ?? []).map(error => `${error.instancePath || '/'} ${error.message}`)
}

function codeUnitCompare(left, right) {
  return left < right ? -1 : left > right ? 1 : 0
}

export function compareManagerSettingsTabs(left, right) {
  return left.order - right.order
    || codeUnitCompare(left.owner, right.owner)
    || codeUnitCompare(left.id, right.id)
}

function qualified(owner, localId) {
  return `${owner}:${localId}`
}

function isReservedOwner(owner) {
  return owner === 'host' || owner?.startsWith('cordisx.')
}

function conditionMatches(condition, context) {
  if (condition === undefined) return true
  if ('exists' in condition) return Object.hasOwn(context, condition.key) === condition.exists
  if ('equals' in condition) return Object.is(context[condition.key], condition.equals)
  if ('notEquals' in condition) return !Object.is(context[condition.key], condition.notEquals)
  if ('all' in condition) return condition.all.every(candidate => conditionMatches(candidate, context))
  if ('any' in condition) return condition.any.some(candidate => conditionMatches(candidate, context))
  if ('not' in condition) return !conditionMatches(condition.not, context)
  return false
}

function canonicalSource(value) {
  try {
    const url = new URL(value)
    if (!['file:', 'https:'].includes(url.protocol) || url.username !== '' || url.password !== '' || url.search !== '' || url.hash !== '') return undefined
    if (url.protocol === 'file:' && url.host !== '') return undefined
    if (url.protocol === 'https:' && url.pathname !== '/') url.pathname = url.pathname.replace(/\/+$/, '')
    return url.href
  } catch {
    return undefined
  }
}

function descriptorErrors(catalog) {
  const errors = []
  const points = Array.isArray(catalog?.points) ? catalog.points : []
  const byId = new Map()
  for (const point of points) {
    if (byId.has(point?.id)) errors.push(`duplicate extension point id: ${point?.id}`)
    byId.set(point?.id, point)
  }
  const surface = byId.get(SETTINGS_SURFACE)
  if (surface === undefined) errors.push(`catalog is missing ${SETTINGS_SURFACE}`)
  else {
    if (surface.kind !== 'surface' || surface.payloadFamily !== 'manager-settings-tab') errors.push(`${SETTINGS_SURFACE} has an incompatible kind or payload family`)
    if (surface.stability !== 'stable' || surface.availability !== 'available') errors.push(`${SETTINGS_SURFACE} must be stable and available`)
  }
  const outlet = byId.get(SETTINGS_OUTLET)
  if (outlet === undefined) errors.push(`catalog is missing ${SETTINGS_OUTLET}`)
  else {
    if (outlet.kind !== 'outlet' || outlet.payloadFamily !== 'outlet') errors.push(`${SETTINGS_OUTLET} has an incompatible kind or payload family`)
    if (outlet.stability !== 'stable' || outlet.availability !== 'available') errors.push(`${SETTINGS_OUTLET} must be stable and available`)
    if (outlet.pageChrome?.length !== 1 || outlet.pageChrome[0] !== 'body-only') errors.push(`${SETTINGS_OUTLET} must accept only body-only page chrome`)
    if (outlet.presentationGroup !== 'manager.settings') errors.push(`${SETTINGS_OUTLET} must use the manager.settings presentation group`)
    if (outlet.routePathFamily !== 'manager-settings') errors.push(`${SETTINGS_OUTLET} must use the manager-settings path family`)
  }
  return errors
}

function lifecycleErrors(steps) {
  if (steps === undefined) return []
  if (!Array.isArray(steps)) return ['lifecycle must be an array']
  const errors = []
  const eligible = new Set()
  let active = 'host:marketplace'
  let mounted
  for (const [index, step] of steps.entries()) {
    let cleanup = []
    const cleanMounted = id => {
      if (id !== undefined && mounted === id) {
        cleanup = ['abort', 'dispose']
        mounted = undefined
      }
    }
    switch (step?.action) {
      case 'register':
      case 'restore':
        eligible.add(step.id)
        break
      case 'activate':
        if (!eligible.has(step.id)) errors.push(`lifecycle[${index}] cannot activate ineligible tab ${step.id}`)
        else {
          if (mounted !== undefined) cleanMounted(mounted)
          active = step.id
          mounted = step.id.startsWith('host:') ? undefined : step.id
        }
        break
      case 'hide':
      case 'remove':
      case 'block':
      case 'permission-deny':
      case 'point-deny':
        eligible.delete(step.id)
        cleanMounted(step.id)
        if (active === step.id) active = 'host:marketplace'
        break
      case 'generation-replace':
        cleanMounted(mounted)
        for (const id of [...eligible]) if (!id.startsWith('host:')) eligible.delete(id)
        active = 'host:marketplace'
        break
      case 'close':
        cleanMounted(mounted)
        active = 'host:marketplace'
        break
      case 'reopen':
        active = 'host:marketplace'
        mounted = undefined
        break
      case 'mount-throw':
        if (!eligible.has(step.id)) errors.push(`lifecycle[${index}] cannot mount ineligible tab ${step.id}`)
        else {
          active = step.id
          mounted = step.id
          cleanMounted(step.id)
          active = 'host:marketplace'
        }
        break
      default:
        errors.push(`lifecycle[${index}] has unknown action ${step?.action ?? '<missing>'}`)
    }
    if (step?.expectActive !== active) errors.push(`lifecycle[${index}] expected active ${step?.expectActive}, received ${active}`)
    if (JSON.stringify(step?.expectCleanup ?? []) !== JSON.stringify(cleanup)) {
      errors.push(`lifecycle[${index}] expected cleanup ${JSON.stringify(step?.expectCleanup ?? [])}, received ${JSON.stringify(cleanup)}`)
    }
  }
  return errors
}

function recordDocuments(errors, label, records, validator, owners, target) {
  if (!Array.isArray(records)) {
    errors.push(`${label} must be an array`)
    return
  }
  for (const [index, record] of records.entries()) {
    if (!owners.has(record?.owner)) errors.push(`${label}[${index}] has unknown owner ${record?.owner ?? '<missing>'}`)
    errors.push(...schemaErrors(validator, record?.document).map(error => `${label}[${index}] schema: ${error}`))
    const id = record?.document?.id
    if (typeof record?.owner === 'string' && typeof id === 'string') {
      const key = qualified(record.owner, id)
      if (target.has(key)) errors.push(`duplicate ${label} identity: ${key}`)
      target.set(key, record.document)
    }
  }
}

export function validateManagerSettingsSuite(suite) {
  const errors = []
  if (suite === null || typeof suite !== 'object' || Array.isArray(suite)) return ['suite must be an object']
  errors.push(...schemaErrors(validators.catalog, suite.catalog).map(error => `catalog schema: ${error}`))
  errors.push(...descriptorErrors(suite.catalog))
  if (typeof suite.generation !== 'string' || suite.generation.length === 0) errors.push('generation must be a non-empty string')

  const owners = new Map()
  if (!Array.isArray(suite.owners)) errors.push('owners must be an array')
  for (const [index, owner] of (Array.isArray(suite.owners) ? suite.owners : []).entries()) {
    if (typeof owner?.id !== 'string' || !LOCAL_ID.test(owner.id) || isReservedOwner(owner.id)) errors.push(`owners[${index}] uses a reserved or invalid owner id`)
    if (owners.has(owner?.id)) errors.push(`duplicate owner id: ${owner?.id}`)
    const canonical = typeof owner?.source === 'string' ? canonicalSource(owner.source) : undefined
    if (canonical === undefined || canonical !== owner.source) errors.push(`owners[${index}] source must be canonical`)
    owners.set(owner?.id, owner?.source)
  }

  const contributions = new Map()
  recordDocuments(errors, 'contributions', suite.contributions, validators.contribution, owners, contributions)
  for (const [key, contribution] of contributions) {
    if (contribution.surface !== SETTINGS_SURFACE) errors.push(`contribution ${key} does not target ${SETTINGS_SURFACE}`)
  }

  if (!Array.isArray(suite.updates)) errors.push('updates must be an array')
  for (const [index, update] of (Array.isArray(suite.updates) ? suite.updates : []).entries()) {
    errors.push(...schemaErrors(validators.contribution, update?.document).map(error => `updates[${index}] schema: ${error}`))
    const key = qualified(update?.owner, update?.document?.id)
    const existing = contributions.get(key)
    if (existing === undefined) errors.push(`updates[${index}] references unknown contribution ${key}`)
    else if (update.document.surface !== existing.surface) errors.push(`updates[${index}] cannot change the contribution surface`)
    else contributions.set(key, update.document)
    if (update?.generation !== undefined && update.generation !== suite.generation) errors.push(`updates[${index}] generation is stale or unknown`)
  }

  const routes = new Map()
  recordDocuments(errors, 'routes', suite.routes, validators.route, owners, routes)
  const pages = new Map()
  recordDocuments(errors, 'pages', suite.pages, validators.page, owners, pages)

  const resolvedOutlets = new Set(suite.resolvedOutlets ?? [SETTINGS_OUTLET])
  const pending = new Map()
  for (const [key, contribution] of contributions) {
    const owner = key.slice(0, key.indexOf(':'))
    const routeId = contribution?.item?.route?.id
    const route = routes.get(qualified(owner, routeId))
    if (route === undefined) {
      pending.set(key, 'route')
      continue
    }
    if (route.path === '/manager/settings' || !route.path.startsWith('/manager/settings/')) errors.push(`route ${qualified(owner, route.id)} must be strictly below /manager/settings/`)
    if (route.outlet !== SETTINGS_OUTLET) errors.push(`route ${qualified(owner, route.id)} targets incompatible outlet ${route.outlet}`)
    if (route.page?.includes(':')) errors.push(`route ${qualified(owner, route.id)} must reference a same-owner local page`)
    if (!resolvedOutlets.has(route.outlet)) {
      pending.set(key, 'outlet')
      continue
    }
    const page = pages.get(qualified(owner, route.page))
    if (page === undefined) {
      pending.set(key, 'page')
      continue
    }
    if (page.chrome !== 'body-only') errors.push(`page ${qualified(owner, page.id)} must use body-only chrome`)
  }

  const expectedPending = new Map((suite.expectedPending ?? []).map(record => [record.id, record.reason]))
  if (JSON.stringify([...expectedPending].sort()) !== JSON.stringify([...pending].sort())) {
    errors.push(`pending mismatch: expected ${JSON.stringify([...expectedPending])}, received ${JSON.stringify([...pending])}`)
  }

  const projection = [...BUILT_INS]
  for (const [id, contribution] of contributions) {
    if (pending.has(id) || !conditionMatches(contribution.when, suite.context ?? {})) continue
    projection.push({
      id,
      owner: id.slice(0, id.indexOf(':')),
      order: contribution.order ?? 0,
      disabled: contribution.disabled?.value ?? false,
    })
  }
  projection.sort(compareManagerSettingsTabs)
  const projected = projection.map(({ id, disabled }) => ({ id, disabled }))
  if (JSON.stringify(projected) !== JSON.stringify(suite.expectedProjection ?? [])) {
    errors.push(`projection mismatch: expected ${JSON.stringify(suite.expectedProjection ?? [])}, received ${JSON.stringify(projected)}`)
  }

  if (!Array.isArray(suite.accesses)) errors.push('accesses must be an array')
  const accessByOperation = new Map()
  for (const [index, access] of (Array.isArray(suite.accesses) ? suite.accesses : []).entries()) {
    errors.push(...schemaErrors(validators.access, access).map(error => `accesses[${index}] schema: ${error}`))
    if (access?.generation !== suite.generation) errors.push(`accesses[${index}] generation is stale or unknown`)
    const owner = String(access?.operation).startsWith('surface.')
      ? String(access?.contributionId ?? '').split(':')[0]
      : String(access?.routeId ?? '').split(':')[0]
    if (access?.identity?.pluginId !== owner || access?.identity?.source !== owners.get(owner)) errors.push(`accesses[${index}] identity does not match the launcher-bound owner`)
    if (access?.identity?.pointId !== (String(access?.operation).startsWith('surface.') ? SETTINGS_SURFACE : SETTINGS_OUTLET)) {
      errors.push(`accesses[${index}] point origin does not match its operation`)
    }
    accessByOperation.set(access?.operation, access)
  }

  if (suite.activated !== undefined) {
    const contribution = contributions.get(suite.activated)
    const owner = suite.activated.split(':')[0]
    const route = routes.get(qualified(owner, contribution?.item?.route?.id))
    const pageId = route === undefined ? undefined : qualified(owner, route.page)
    const surfaceAccess = accessByOperation.get('surface.route.navigate')
    const outletRouteAccess = accessByOperation.get('outlet.route.navigate')
    const outletPageAccess = accessByOperation.get('outlet.page.mount')
    if (surfaceAccess?.contributionId !== suite.activated || surfaceAccess?.routeId !== qualified(owner, route?.id)) errors.push('activated tab requires a matching surface.route.navigate origin')
    if (outletRouteAccess?.routeId !== qualified(owner, route?.id) || outletRouteAccess?.pageId !== pageId) errors.push('activated tab requires a matching outlet.route.navigate origin')
    if (outletPageAccess?.routeId !== qualified(owner, route?.id) || outletPageAccess?.pageId !== pageId) errors.push('activated tab requires a matching outlet.page.mount origin')
  }

  errors.push(...lifecycleErrors(suite.lifecycle))
  return errors
}

async function jsonFiles(directory) {
  return (await readdir(directory, { withFileTypes: true }))
    .filter(entry => entry.isFile() && entry.name.endsWith('.json'))
    .map(entry => path.join(directory, entry.name))
    .sort()
}

let failures = 0
for (const file of await jsonFiles(path.join(root, 'test-vectors/manager-settings-tabs/valid'))) {
  const suite = JSON.parse(await readFile(file, 'utf8'))
  const errors = validateManagerSettingsSuite(suite)
  if (errors.length > 0) {
    console.error(`${path.relative(root, file)} should be valid`, errors)
    failures += 1
  }
}
for (const file of await jsonFiles(path.join(root, 'test-vectors/manager-settings-tabs/invalid'))) {
  const suite = JSON.parse(await readFile(file, 'utf8'))
  if (validateManagerSettingsSuite(suite).length === 0) {
    console.error(`${path.relative(root, file)} should be invalid`)
    failures += 1
  }
}

const tied = [
  { id: 'zeta:b', owner: 'zeta', order: 10 },
  { id: 'alpha:z', owner: 'alpha', order: 10 },
  { id: 'alpha:a', owner: 'alpha', order: 10 },
].sort(compareManagerSettingsTabs).map(record => record.id)
if (JSON.stringify(tied) !== JSON.stringify(['alpha:a', 'alpha:z', 'zeta:b'])) {
  console.error('manager settings tie-break must be order, owner, qualified id')
  failures += 1
}

const completeSuite = JSON.parse(await readFile(path.join(root, 'test-vectors/manager-settings-tabs/valid/complete.json'), 'utf8'))
if (validators.legacyCatalog(completeSuite.catalog)) {
  console.error('catalog v2 must reject the explicit catalog v3 document')
  failures += 1
}
const oldVersionSuite = JSON.parse(await readFile(path.join(root, 'test-vectors/manager-settings-tabs/invalid/old-version-manager-surface.json'), 'utf8'))
if (validators.legacyContribution(oldVersionSuite.contributions[0].document)) {
  console.error('surface contribution v3 must reject manager.settings.tabs')
  failures += 1
}

if (failures > 0) throw new Error(`${failures} manager-settings conformance case(s) failed`)
console.log('manager settings tabs conformance: all vectors passed')
