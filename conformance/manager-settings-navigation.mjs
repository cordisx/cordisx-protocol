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
  'surface-contribution.v5.schema.json',
  'route.v1.schema.json',
  'route.v2.schema.json',
  'page.v1.schema.json',
  'page.v2.schema.json',
  'page.v3.schema.json',
  'extension-point-common.v1.schema.json',
  'host-extension-point-catalog.v3.schema.json',
  'host-extension-point-catalog.v4.schema.json',
  'extension-point-access.v2.schema.json',
]
const schemas = new Map()
for (const name of schemaNames) schemas.set(name, JSON.parse(await readFile(path.join(root, 'schemas', name), 'utf8')))

const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true })
addFormats(ajv)
for (const schema of schemas.values()) ajv.addSchema(schema)

const validators = {
  catalog: ajv.getSchema(schemas.get('host-extension-point-catalog.v4.schema.json').$id),
  contribution: ajv.getSchema(schemas.get('surface-contribution.v5.schema.json').$id),
  route: ajv.getSchema(schemas.get('route.v2.schema.json').$id),
  page: ajv.getSchema(schemas.get('page.v3.schema.json').$id),
  access: ajv.getSchema(schemas.get('extension-point-access.v2.schema.json').$id),
  legacyCatalog: ajv.getSchema(schemas.get('host-extension-point-catalog.v3.schema.json').$id),
  legacyContribution: ajv.getSchema(schemas.get('surface-contribution.v4.schema.json').$id),
}
for (const [kind, validator] of Object.entries(validators)) {
  if (validator === undefined) throw new Error(`${kind} schema was not registered`)
}

const NAVIGATION_SURFACE = 'manager.settings.navigation-items'
const MANAGER_OUTLET = 'manager.content'
const CONTENT_TAB_SURFACE = 'manager.settings.tabs'
const CONTENT_OUTLET = 'manager.settings.content'
const LOCAL_ID = /^[a-z0-9][a-z0-9._-]{0,95}$/
const HOST_BEFORE = ['host:plugins', 'host:extensions', 'host:routes', 'host:marketplace']
const HOST_SETTINGS = 'host:settings'
const HOST_ABOUT = 'host:about'

function schemaErrors(validator, value) {
  if (validator(value)) return []
  return (validator.errors ?? []).map(error => `${error.instancePath || '/'} ${error.message}`)
}

function codeUnitCompare(left, right) {
  return left < right ? -1 : left > right ? 1 : 0
}

export function compareManagerSettingsNavigationItems(left, right) {
  return (left.order ?? 0) - (right.order ?? 0)
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
  const byId = new Map()
  for (const point of Array.isArray(catalog?.points) ? catalog.points : []) {
    if (byId.has(point?.id)) errors.push(`duplicate extension point id: ${point?.id}`)
    byId.set(point?.id, point)
  }
  const expected = [
    [CONTENT_TAB_SURFACE, 'surface', 'manager-settings-content-tab'],
    [CONTENT_OUTLET, 'outlet', 'outlet'],
    [NAVIGATION_SURFACE, 'surface', 'manager-settings-navigation-item'],
    [MANAGER_OUTLET, 'outlet', 'outlet'],
  ]
  for (const [id, kind, family] of expected) {
    const point = byId.get(id)
    if (point === undefined) errors.push(`catalog is missing ${id}`)
    else {
      if (point.kind !== kind || point.payloadFamily !== family) errors.push(`${id} has an incompatible kind or payload family`)
      if (point.stability !== 'stable' || point.availability !== 'available') errors.push(`${id} must be stable and available`)
    }
  }
  const contentOutlet = byId.get(CONTENT_OUTLET)
  if (contentOutlet !== undefined) {
    if (JSON.stringify(contentOutlet.pageChrome) !== JSON.stringify(['body-only'])) errors.push(`${CONTENT_OUTLET} must accept only body-only page chrome`)
    if (contentOutlet.presentationGroup !== 'manager.settings' || contentOutlet.routePathFamily !== 'manager-settings') errors.push(`${CONTENT_OUTLET} has incompatible presentation routing`)
  }
  const managerOutlet = byId.get(MANAGER_OUTLET)
  if (managerOutlet !== undefined) {
    if (JSON.stringify(managerOutlet.pageChrome) !== JSON.stringify(['standard'])) errors.push(`${MANAGER_OUTLET} must accept only standard page chrome`)
    if (managerOutlet.presentationGroup !== 'manager' || managerOutlet.routePathFamily !== 'manager') errors.push(`${MANAGER_OUTLET} has incompatible presentation routing`)
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

function lifecycleErrors(steps) {
  if (steps === undefined) return []
  if (!Array.isArray(steps)) return ['lifecycle must be an array']
  const errors = []
  const eligible = new Set()
  let active = HOST_SETTINGS
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
      case 'reorder':
        break
      case 'activate':
        if (!eligible.has(step.id)) errors.push(`lifecycle[${index}] cannot activate ineligible navigation item ${step.id}`)
        else {
          cleanMounted(mounted)
          active = step.id
          mounted = step.id
        }
        break
      case 'hide':
      case 'remove':
      case 'block':
      case 'disable':
      case 'uninstall':
      case 'permission-deny':
      case 'point-deny':
      case 'stale-route':
        eligible.delete(step.id)
        cleanMounted(step.id)
        if (active === step.id) active = HOST_SETTINGS
        break
      case 'generation-replace':
        cleanMounted(mounted)
        eligible.clear()
        active = HOST_SETTINGS
        break
      case 'close':
        cleanMounted(mounted)
        break
      case 'reopen':
        if (!active.startsWith('host:') && eligible.has(active)) mounted = active
        else active = HOST_SETTINGS
        break
      case 'mount-throw':
        if (!eligible.has(step.id)) errors.push(`lifecycle[${index}] cannot mount ineligible navigation item ${step.id}`)
        else {
          active = step.id
          mounted = step.id
          cleanMounted(step.id)
          active = HOST_SETTINGS
        }
        break
      default:
        errors.push(`lifecycle[${index}] has unknown action ${step?.action ?? '<missing>'}`)
    }
    if (step?.expectActive !== active) errors.push(`lifecycle[${index}] expected active ${step?.expectActive}, received ${active}`)
    if (JSON.stringify(step?.expectCleanup ?? []) !== JSON.stringify(cleanup)) {
      errors.push(`lifecycle[${index}] expected cleanup ${JSON.stringify(step?.expectCleanup ?? [])}, received ${JSON.stringify(cleanup)}`)
    }
    if (Object.hasOwn(step ?? {}, 'expectMounted') && step.expectMounted !== (mounted ?? null)) {
      errors.push(`lifecycle[${index}] expected mounted ${step.expectMounted}, received ${mounted ?? null}`)
    }
  }
  return errors
}

export function validateManagerSettingsNavigationSuite(suite) {
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
    if (contribution.surface !== NAVIGATION_SURFACE) errors.push(`contribution ${key} does not target ${NAVIGATION_SURFACE}`)
  }

  const routes = new Map()
  recordDocuments(errors, 'routes', suite.routes, validators.route, owners, routes)
  const pages = new Map()
  recordDocuments(errors, 'pages', suite.pages, validators.page, owners, pages)

  const resolvedOutlets = new Set(suite.resolvedOutlets ?? [MANAGER_OUTLET])
  const pending = new Map()
  const pathOwner = new Map()
  for (const [key, contribution] of contributions) {
    const owner = key.slice(0, key.indexOf(':'))
    const routeId = contribution?.item?.route?.id
    const route = routes.get(qualified(owner, routeId))
    if (route === undefined) {
      pending.set(key, 'route')
      continue
    }
    if (!route.path.startsWith('/manager/extensions/')) errors.push(`route ${qualified(owner, route.id)} must be strictly below /manager/extensions/`)
    if (route.outlet !== MANAGER_OUTLET) errors.push(`route ${qualified(owner, route.id)} targets incompatible outlet ${route.outlet}`)
    if (route.page?.includes(':')) errors.push(`route ${qualified(owner, route.id)} must reference a same-owner local page`)
    const conflicting = pathOwner.get(route.path)
    if (conflicting !== undefined && conflicting !== key) errors.push(`manager route path conflict: ${route.path}`)
    pathOwner.set(route.path, key)
    if (!resolvedOutlets.has(route.outlet)) {
      pending.set(key, 'outlet')
      continue
    }
    const page = pages.get(qualified(owner, route.page))
    if (page === undefined) {
      pending.set(key, 'page')
      continue
    }
    if ((page.chrome ?? 'standard') !== 'standard') errors.push(`page ${qualified(owner, page.id)} must use standard chrome`)
    if (typeof page.icon !== 'string' || !page.icon.startsWith('host:')) errors.push(`page ${qualified(owner, page.id)} must declare a host icon token`)
    for (const action of page.headerActions ?? []) {
      if (action.icon !== undefined && !action.icon.startsWith('host:')) errors.push(`page ${qualified(owner, page.id)} header action ${action.id} must use a host icon token`)
    }
  }

  const expectedPending = new Map((suite.expectedPending ?? []).map(record => [record.id, record.reason]))
  if (JSON.stringify([...expectedPending].sort()) !== JSON.stringify([...pending].sort())) {
    errors.push(`pending mismatch: expected ${JSON.stringify([...expectedPending])}, received ${JSON.stringify([...pending])}`)
  }

  const before = []
  const after = []
  for (const [id, contribution] of contributions) {
    if (pending.has(id) || !conditionMatches(contribution.when, suite.context ?? {})) continue
    const projected = { id, owner: id.slice(0, id.indexOf(':')), order: contribution.order ?? 0, disabled: contribution.disabled?.value ?? false }
    ;(contribution.group === 'before-settings' ? before : after).push(projected)
  }
  before.sort(compareManagerSettingsNavigationItems)
  after.sort(compareManagerSettingsNavigationItems)
  const projection = [
    ...HOST_BEFORE.map(id => ({ id, disabled: false })),
    ...before.map(({ id, disabled }) => ({ id, disabled })),
    { id: HOST_SETTINGS, disabled: false },
    ...after.map(({ id, disabled }) => ({ id, disabled })),
    { id: HOST_ABOUT, disabled: false },
  ]
  if (JSON.stringify(projection) !== JSON.stringify(suite.expectedProjection ?? [])) {
    errors.push(`projection mismatch: expected ${JSON.stringify(suite.expectedProjection ?? [])}, received ${JSON.stringify(projection)}`)
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
    const expectedPoint = String(access?.operation).startsWith('surface.') ? NAVIGATION_SURFACE : MANAGER_OUTLET
    if (access?.identity?.pointId !== expectedPoint) errors.push(`accesses[${index}] point origin does not match its operation`)
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
    if (surfaceAccess?.contributionId !== suite.activated || surfaceAccess?.routeId !== qualified(owner, route?.id)) errors.push('activated navigation item requires a matching surface.route.navigate origin')
    if (outletRouteAccess?.routeId !== qualified(owner, route?.id) || outletRouteAccess?.pageId !== pageId) errors.push('activated navigation item requires a matching outlet.route.navigate origin')
    if (outletPageAccess?.routeId !== qualified(owner, route?.id) || outletPageAccess?.pageId !== pageId) errors.push('activated navigation item requires a matching outlet.page.mount origin')
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

function materializeInvalidVector(vector, completeSuite) {
  if (vector?.base !== 'valid/complete.json' || !Array.isArray(vector.operations)) return vector
  const suite = structuredClone(completeSuite)
  for (const operation of vector.operations) {
    const segments = String(operation.path).split('.')
    const property = segments.pop()
    let target = suite
    for (const segment of segments) target = target[Number.isInteger(Number(segment)) ? Number(segment) : segment]
    if (operation.op === 'set') target[property] = operation.value
    else if (operation.op === 'delete') delete target[property]
    else throw new Error(`unknown invalid-vector operation ${operation.op}`)
  }
  return suite
}

let failures = 0
const completeSuite = JSON.parse(await readFile(path.join(root, 'test-vectors/manager-settings-navigation/valid/complete.json'), 'utf8'))
for (const file of await jsonFiles(path.join(root, 'test-vectors/manager-settings-navigation/valid'))) {
  const suite = JSON.parse(await readFile(file, 'utf8'))
  const errors = validateManagerSettingsNavigationSuite(suite)
  if (errors.length > 0) {
    console.error(`${path.relative(root, file)} should be valid`, errors)
    failures += 1
  }
}
for (const file of await jsonFiles(path.join(root, 'test-vectors/manager-settings-navigation/invalid'))) {
  const vector = JSON.parse(await readFile(file, 'utf8'))
  const suite = materializeInvalidVector(vector, completeSuite)
  if (validateManagerSettingsNavigationSuite(suite).length === 0) {
    console.error(`${path.relative(root, file)} should be invalid`)
    failures += 1
  }
}

const tied = [
  { id: 'zeta:b', owner: 'zeta', order: 10 },
  { id: 'alpha:z', owner: 'alpha', order: 10 },
  { id: 'alpha:a', owner: 'alpha', order: 10 },
].sort(compareManagerSettingsNavigationItems).map(record => record.id)
if (JSON.stringify(tied) !== JSON.stringify(['alpha:a', 'alpha:z', 'zeta:b'])) {
  console.error('manager settings navigation tie-break must be order, owner, qualified id')
  failures += 1
}

if (validators.legacyCatalog(completeSuite.catalog)) {
  console.error('catalog v3 must reject the separately versioned catalog v4')
  failures += 1
}
if (validators.legacyContribution(completeSuite.contributions[0].document)) {
  console.error('surface contribution v4 must reject the separately versioned v5 navigation item')
  failures += 1
}
const contentTabV5 = JSON.parse(await readFile(
  path.join(root, 'test-vectors/manager-settings-navigation/compatibility/content-tab-v5.json'),
  'utf8',
))
if (!validators.contribution(contentTabV5)) {
  console.error('surface contribution v5 must preserve the existing manager.settings.tabs input meaning', validators.contribution.errors)
  failures += 1
}

if (failures > 0) throw new Error(`${failures} manager settings navigation conformance case(s) failed`)
console.log('Manager settings navigation conformance: all vectors passed')
