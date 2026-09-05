import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Ajv2020 from 'ajv/dist/2020.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const schemaNames = [
  'ui-common.v1.schema.json',
  'route.v2.schema.json',
  'page.v3.schema.json',
  'manager-content-navigation.v1.schema.json',
  'manager-content-projection.v1.schema.json',
]
const schemas = new Map()
for (const name of schemaNames) schemas.set(name, JSON.parse(await readFile(path.join(root, 'schemas', name), 'utf8')))
const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true })
for (const schema of schemas.values()) ajv.addSchema(schema)
const validators = Object.fromEntries([...schemas].map(([name, schema]) => [name, ajv.getSchema(schema.$id)]))
for (const [name, validator] of Object.entries(validators)) {
  if (validator === undefined) throw new Error(`${name} schema was not registered`)
}

const LOCAL_ID = /^[a-z0-9][a-z0-9._-]{0,95}$/
const ROUTE_PARAM = /:([a-z][a-zA-Z0-9]*)/g
const equal = (left, right) => JSON.stringify(left) === JSON.stringify(right)
const qualified = (owner, id) => `${owner}:${id}`
const schemaErrors = (validator, value) =>
  validator(value) ? [] : (validator.errors ?? []).map(error => `${error.instancePath || '/'} ${error.message}`)

function documentErrors(errors, label, records, validator, owners, result) {
  if (!Array.isArray(records)) return errors.push(`${label} must be an array`)
  for (const [index, record] of records.entries()) {
    if (!owners.has(record?.owner)) errors.push(`${label}[${index}] has an unknown owner`)
    errors.push(...schemaErrors(validator, record?.document).map(error => `${label}[${index}] schema: ${error}`))
    const id = record?.document?.id
    if (typeof record?.owner === 'string' && typeof id === 'string') {
      const key = qualified(record.owner, id)
      if (result.has(key)) errors.push(`duplicate ${label} identity: ${key}`)
      result.set(key, record.document)
    }
  }
}

function pathParameters(pathname) {
  return new Set([...pathname.matchAll(ROUTE_PARAM)].map(match => match[1]))
}

function routeRefMatches(reference, qualifiedId, owner, localId, params) {
  return reference?.id === qualifiedId && equal(reference.params ?? {}, params ?? {})
    && qualifiedId === qualified(owner, localId)
}

export function validateManagerContentNavigationSuite(suite) {
  const errors = []
  if (suite === null || typeof suite !== 'object' || Array.isArray(suite)) return ['suite must be an object']
  const owners = new Set()
  if (!Array.isArray(suite.owners)) errors.push('owners must be an array')
  for (const [index, owner] of (Array.isArray(suite.owners) ? suite.owners : []).entries()) {
    if (
      typeof owner?.id !== 'string' || !LOCAL_ID.test(owner.id) || owner.id === 'host'
      || owner.id.startsWith('cordisx.')
    ) errors.push(`owners[${index}] uses a reserved or invalid owner id`)
    if (owners.has(owner?.id)) errors.push(`duplicate owner id: ${owner?.id}`)
    owners.add(owner?.id)
  }

  const routes = new Map()
  documentErrors(errors, 'routes', suite.routes, validators['route.v2.schema.json'], owners, routes)
  const pages = new Map()
  documentErrors(errors, 'pages', suite.pages, validators['page.v3.schema.json'], owners, pages)
  const declarations = new Map()
  documentErrors(
    errors,
    'declarations',
    suite.declarations,
    validators['manager-content-navigation.v1.schema.json'],
    owners,
    declarations,
  )

  const declarationByRoute = new Map()
  for (const [key, declaration] of declarations) {
    const owner = key.slice(0, key.indexOf(':'))
    const routeKey = qualified(owner, declaration.route?.id)
    if (declarationByRoute.has(routeKey)) errors.push(`duplicate manager content declaration route: ${routeKey}`)
    declarationByRoute.set(routeKey, { key, declaration })
    const route = routes.get(routeKey)
    if (route === undefined) {
      errors.push(`declaration ${key} has an unresolved route`)
      continue
    }
    if (route.outlet !== 'manager.content' || !route.path.startsWith('/manager/')) {
      errors.push(`declaration ${key} must target a Manager content route`)
    }
    if (route.page.includes(':')) errors.push(`declaration ${key} must use a same-owner page`)
    const page = pages.get(qualified(owner, route.page))
    if (page === undefined) errors.push(`declaration ${key} has an unresolved page`)
    else if ((page.chrome ?? 'standard') !== 'standard') {
      errors.push(`declaration ${key} requires a standard page shell`)
    }

    if (declaration.parentRoute !== undefined) {
      const parentKey = qualified(owner, declaration.parentRoute.id)
      if (!routes.has(parentKey)) errors.push(`declaration ${key} has an unresolved parent route`)
    }
    if (declaration.header?.title?.kind === 'record') {
      const parameters = pathParameters(route.path)
      if (!parameters.has(declaration.header.title.recordIdParam)) {
        errors.push(`declaration ${key} recordIdParam is not a named route parameter`)
      }
      if (!Object.hasOwn(declaration.route.params ?? {}, declaration.header.title.recordIdParam)) {
        errors.push(`declaration ${key} record title lacks its current route parameter`)
      }
    }
    const tabIds = new Set()
    const tabRoutes = new Set()
    for (const tab of declaration.tabs ?? []) {
      if (tabIds.has(tab.id)) errors.push(`declaration ${key} has a duplicate tab id: ${tab.id}`)
      tabIds.add(tab.id)
      const tabRouteKey = qualified(owner, tab.route.id)
      if (tabRoutes.has(tabRouteKey)) errors.push(`declaration ${key} maps two tabs to ${tabRouteKey}`)
      tabRoutes.add(tabRouteKey)
      if (!routes.has(tabRouteKey)) errors.push(`declaration ${key} tab ${tab.id} has an unresolved route`)
    }
  }

  for (const [key, declaration] of declarations) {
    const visited = new Set([key])
    let parent = declaration.parentRoute
    while (parent !== undefined) {
      const owner = key.slice(0, key.indexOf(':'))
      const parentKey = qualified(owner, parent.id)
      const parentDeclaration = declarationByRoute.get(parentKey)
      if (parentDeclaration === undefined) break
      if (visited.has(parentDeclaration.key)) {
        errors.push(`declaration ${key} has a cyclic parent route`)
        break
      }
      visited.add(parentDeclaration.key)
      parent = parentDeclaration.declaration.parentRoute
    }
  }

  errors.push(
    ...schemaErrors(validators['manager-content-projection.v1.schema.json'], suite.projection).map(error =>
      `projection schema: ${error}`
    ),
  )
  const active = declarations.get(suite.activeDeclaration)
  if (active === undefined) return [...errors, 'activeDeclaration must name a registered declaration']
  const owner = suite.activeDeclaration.slice(0, suite.activeDeclaration.indexOf(':'))
  const route = routes.get(qualified(owner, active.route.id))
  const projection = suite.projection
  if (
    !routeRefMatches(projection?.route, qualified(owner, active.route.id), owner, active.route.id, active.route.params)
  ) errors.push('projection route does not match the active declaration')
  const headerTitle = projection?.header?.title
  if (active.header?.title?.kind === 'route' && headerTitle?.kind !== 'route') {
    errors.push('route title declaration requires a route title projection')
  }
  if (active.header?.title?.kind === 'record') {
    if (headerTitle?.kind !== 'record') errors.push('record title declaration requires a record title projection')
    else if (headerTitle.recordId !== String(active.route.params?.[active.header.title.recordIdParam])) {
      errors.push('record title projection must use the active opaque route parameter')
    }
  }
  const parent = active.parentRoute
  if (parent === undefined && projection?.back?.available === true) {
    errors.push('root Manager content declaration must not project a plugin back route')
  }
  if (parent !== undefined) {
    const expectedParent = qualified(owner, parent.id)
    if (
      projection?.back?.available !== true
      || !routeRefMatches(projection.back.route, expectedParent, owner, parent.id, parent.params)
    ) errors.push('Host back projection must target the declared parent route')
    const lastBreadcrumb = projection?.breadcrumbs?.at(-1)
    if (!routeRefMatches(lastBreadcrumb?.route, expectedParent, owner, parent.id, parent.params)) {
      errors.push('Host breadcrumb projection must retain the declared parent route')
    }
  }
  const history = projection?.history
  if (
    history !== undefined
    && (history.canGoBack !== (history.index > 0) || history.canGoForward !== (history.index < history.length - 1))
  ) errors.push('history flags must be derived from the Host history cursor')
  const outputTabs = projection?.tabs ?? []
  if ((active.tabs?.length ?? 0) !== outputTabs.length) {
    errors.push('projection tabs must exactly map the declaration tabs')
  }
  const activeTabs = outputTabs.filter(tab => tab.active)
  if (activeTabs.length > 1) errors.push('Host projection may select at most one tab')
  for (const [index, tab] of (active.tabs ?? []).entries()) {
    const output = outputTabs[index]
    if (
      output?.id !== tab.id
      || !routeRefMatches(output?.route, qualified(owner, tab.route.id), owner, tab.route.id, tab.route.params)
    ) errors.push(`projection tab ${tab.id} does not map its declared route reference`)
  }
  return errors
}

async function jsonFiles(directory) {
  return (await readdir(directory, { withFileTypes: true })).filter(entry =>
    entry.isFile() && entry.name.endsWith('.json')
  ).map(entry => path.join(directory, entry.name)).sort()
}

function materializeInvalidVector(vector, completeSuite) {
  if (vector?.base !== 'valid/complete.json' || !Array.isArray(vector.operations)) return vector
  const suite = structuredClone(completeSuite)
  for (const operation of vector.operations) {
    const segments = operation.path.split('.')
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
const directory = path.join(root, 'test-vectors/manager-content-navigation')
const completeSuite = JSON.parse(await readFile(path.join(directory, 'valid/complete.json'), 'utf8'))
for (const file of await jsonFiles(path.join(directory, 'valid'))) {
  const errors = validateManagerContentNavigationSuite(JSON.parse(await readFile(file, 'utf8')))
  if (errors.length > 0) {
    console.error(`${path.relative(root, file)} should be valid`, errors)
    failures += 1
  }
}
for (const file of await jsonFiles(path.join(directory, 'invalid'))) {
  const errors = validateManagerContentNavigationSuite(
    materializeInvalidVector(JSON.parse(await readFile(file, 'utf8')), completeSuite),
  )
  if (errors.length === 0) {
    console.error(`${path.relative(root, file)} should be invalid`)
    failures += 1
  }
}
if (failures > 0) throw new Error(`${failures} manager content navigation conformance case(s) failed`)
console.log('Manager content navigation conformance: all vectors passed')
