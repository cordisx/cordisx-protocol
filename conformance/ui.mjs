import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Ajv2020 from 'ajv/dist/2020.js'
import IntlMessageFormat from 'intl-messageformat'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const schemaNames = [
  'ui-common.v1.schema.json',
  'locale-catalog.v1.schema.json',
  'command.v1.schema.json',
  'surface-contribution.v1.schema.json',
  'route.v1.schema.json',
  'route.v2.schema.json',
  'page.v1.schema.json',
  'page.v2.schema.json',
  'page.v3.schema.json',
  'outlet.v1.schema.json',
]
const schemas = new Map()
for (const name of schemaNames) {
  schemas.set(name, JSON.parse(await readFile(path.join(root, 'schemas', name), 'utf8')))
}

const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true })
for (const schema of schemas.values()) ajv.addSchema(schema)
const compatiblePageSchema = {
  $id: 'urn:cordisx:compatible-page',
  oneOf: [
    { $ref: schemas.get('page.v1.schema.json').$id },
    { $ref: schemas.get('page.v2.schema.json').$id },
    { $ref: schemas.get('page.v3.schema.json').$id },
  ],
}
const compatibleRouteSchema = {
  $id: 'urn:cordisx:compatible-route',
  oneOf: [
    { $ref: schemas.get('route.v1.schema.json').$id },
    { $ref: schemas.get('route.v2.schema.json').$id },
  ],
}
ajv.addSchema(compatiblePageSchema)
ajv.addSchema(compatibleRouteSchema)

const validators = {
  catalogs: ajv.getSchema(schemas.get('locale-catalog.v1.schema.json').$id),
  commands: ajv.getSchema(schemas.get('command.v1.schema.json').$id),
  contributions: ajv.getSchema(schemas.get('surface-contribution.v1.schema.json').$id),
  routes: ajv.getSchema(compatibleRouteSchema.$id),
  pages: ajv.getSchema(compatiblePageSchema.$id),
  outlets: ajv.getSchema(schemas.get('outlet.v1.schema.json').$id),
}
for (const [kind, validator] of Object.entries(validators)) {
  if (validator === undefined) throw new Error(`${kind} schema was not registered`)
}

const ownerPattern = /^[a-z0-9][a-z0-9._-]{0,95}$/

export function qualify(owner, reference) {
  return reference.includes(':') ? reference : `${owner}:${reference}`
}

export function qualifyNamespace(owner, namespace) {
  if (namespace === owner || namespace.includes(':')) return namespace
  return `${owner}:${namespace}`
}

export function canonicalLocale(locale) {
  const [canonical] = Intl.getCanonicalLocales(locale)
  if (canonical === undefined) throw new Error(`invalid locale: ${locale}`)
  return canonical
}

function fallbackText(namespace, message) {
  return message.fallback ?? `[[${namespace}:${message.key}]]`
}

export function resolveMessage(owner, message, locale, catalogs) {
  const namespace = message.namespace === undefined ? owner : qualifyNamespace(owner, message.namespace)
  const namespaceCatalogs = catalogs.filter(catalog => qualifyNamespace(owner, catalog.namespace) === namespace)
  if (namespaceCatalogs.length === 0) {
    return { text: fallbackText(namespace, message), diagnostic: 'missing-namespace', namespace, key: message.key }
  }
  const exact = canonicalLocale(locale)
  const language = new Intl.Locale(exact).language
  const defaultCatalog = namespaceCatalogs.find(catalog => catalog.default === true)
  const candidates = [...new Set([exact, language, defaultCatalog?.locale].filter(Boolean))]
  const catalog = candidates
    .map(candidate => namespaceCatalogs.find(item => item.locale === candidate))
    .find(Boolean)
  if (catalog === undefined || catalog.messages[message.key] === undefined) {
    return { text: fallbackText(namespace, message), diagnostic: 'missing-key', namespace, key: message.key }
  }
  try {
    const formatted = new IntlMessageFormat(catalog.messages[message.key], catalog.locale).format(message.params ?? {})
    return { text: String(formatted), namespace, key: message.key, locale: catalog.locale }
  } catch {
    return { text: fallbackText(namespace, message), diagnostic: 'missing-params', namespace, key: message.key, locale: catalog.locale }
  }
}

export function expectedOutletForPath(routePath) {
  if (routePath.startsWith('/main/')) return 'main'
  if (routePath.startsWith('/sessions/')) return 'session.content'
  return 'app'
}

export function activationKind(item) {
  if (item?.command !== undefined) return 'command'
  if (item?.route !== undefined) return 'route'
  return 'invalid'
}

/** Native menu surfaces never synthesize a fallback projection. */
export function nativeMenuProjectionState(resolution) {
  if (resolution === 'exact') return 'ready'
  if (resolution === 'missing' || resolution === 'ambiguous') return 'pending'
  throw new Error(`unknown native menu resolution: ${String(resolution)}`)
}

export function compareContributions(left, right) {
  return (left.group ?? 'default').localeCompare(right.group ?? 'default')
    || (left.order ?? 0) - (right.order ?? 0)
    || left.id.localeCompare(right.id)
}

function commandReferences(contribution) {
  const item = contribution.item ?? {}
  const references = []
  if (item.command?.id !== undefined) references.push(item.command.id)
  if (Array.isArray(item.actions)) {
    for (const action of item.actions) {
      if (action.command?.id !== undefined) references.push(action.command.id)
    }
  }
  return references
}

function routeReferences(contribution) {
  const reference = contribution.item?.route?.id
  return reference === undefined ? [] : [reference]
}

function pageCommandReferences(page) {
  if (!Array.isArray(page.headerActions)) return []
  return page.headerActions
    .map(action => action.command?.id)
    .filter(reference => reference !== undefined)
}

function duplicateParameters(routePath) {
  const names = [...routePath.matchAll(/:([a-z][a-zA-Z0-9]*)/g)].map(match => match[1])
  return names.filter((name, index) => names.indexOf(name) !== index)
}

function addDuplicateErrors(errors, owner, kind, records, target = record => qualify(owner, record.id)) {
  const identities = new Set()
  for (const record of records) {
    const identity = target(record)
    if (identities.has(identity)) errors.push(`duplicate ${kind} identity: ${identity}`)
    identities.add(identity)
  }
}

export function validateSuite(suite) {
  const errors = []
  if (suite === null || typeof suite !== 'object' || Array.isArray(suite)) return ['suite must be an object']
  if (typeof suite.owner !== 'string' || !ownerPattern.test(suite.owner)) errors.push('owner is invalid')
  const owner = typeof suite.owner === 'string' ? suite.owner : 'invalid-owner'

  for (const kind of Object.keys(validators)) {
    const records = suite[kind]
    if (!Array.isArray(records)) {
      errors.push(`${kind} must be an array`)
      continue
    }
    for (const [index, record] of records.entries()) {
      const validator = validators[kind]
      if (!validator(record)) {
        const messages = (validator.errors ?? []).map(error => `${error.instancePath || '/'} ${error.message}`)
        errors.push(`${kind}[${index}] schema: ${messages.join('; ')}`)
      }
    }
  }

  const commands = Array.isArray(suite.commands) ? suite.commands : []
  const catalogs = Array.isArray(suite.catalogs) ? suite.catalogs : []
  const contributions = Array.isArray(suite.contributions) ? suite.contributions : []
  const routes = Array.isArray(suite.routes) ? suite.routes : []
  const pages = Array.isArray(suite.pages) ? suite.pages : []
  const outlets = Array.isArray(suite.outlets) ? suite.outlets : []

  addDuplicateErrors(errors, owner, 'catalog', catalogs, record => `${qualifyNamespace(owner, record.namespace)}\0${record.locale}`)
  addDuplicateErrors(errors, owner, 'command', commands)
  addDuplicateErrors(errors, owner, 'contribution', contributions, record => `${record.surface}\0${qualify(owner, record.id)}`)
  addDuplicateErrors(errors, owner, 'route', routes)
  addDuplicateErrors(errors, owner, 'page', pages)
  addDuplicateErrors(errors, owner, 'outlet', outlets, record => record.id)
  addDuplicateErrors(errors, owner, 'route path', routes, record => `${record.outlet}\0${record.path}`)

  const defaultNamespaces = new Set()
  for (const [index, catalog] of catalogs.entries()) {
    try {
      if (canonicalLocale(catalog.locale) !== catalog.locale) errors.push(`catalogs[${index}] locale must be canonical`)
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error))
    }
    if (catalog.default === true) {
      const namespace = qualifyNamespace(owner, catalog.namespace)
      if (defaultNamespaces.has(namespace)) errors.push(`duplicate default locale for namespace: ${namespace}`)
      defaultNamespaces.add(namespace)
    }
    for (const [key, value] of Object.entries(catalog.messages ?? {})) {
      try {
        new IntlMessageFormat(value, catalog.locale)
      } catch (error) {
        errors.push(`catalogs[${index}] message ${key} is not valid ICU: ${error instanceof Error ? error.message : String(error)}`)
      }
    }
  }

  const commandIds = new Set(commands.map(command => qualify(owner, command.id)))
  const routeIds = new Set(routes.map(route => qualify(owner, route.id)))
  const pageIds = new Set(pages.map(page => qualify(owner, page.id)))
  const pagesById = new Map(pages.map(page => [qualify(owner, page.id), page]))
  const outletIds = new Set(outlets.map(outlet => outlet.id))

  for (const contribution of contributions) {
    for (const reference of commandReferences(contribution)) {
      if (!commandIds.has(qualify(owner, reference))) errors.push(`dangling command reference: ${reference}`)
    }
    for (const reference of routeReferences(contribution)) {
      if (!routeIds.has(qualify(owner, reference))) errors.push(`dangling route reference: ${reference}`)
    }
    if (contribution.surface === 'sidebar.navigation.items' && activationKind(contribution.item) === 'invalid') {
      errors.push(`navigation contribution ${contribution.id} has no activation`)
    }
  }

  for (const page of pages) {
    const actionIds = new Set()
    for (const action of page.headerActions ?? []) {
      if (actionIds.has(action.id)) errors.push(`duplicate page header action id for ${page.id}: ${action.id}`)
      actionIds.add(action.id)
    }
    for (const reference of pageCommandReferences(page)) {
      if (!commandIds.has(qualify(owner, reference))) errors.push(`dangling page header command reference: ${reference}`)
    }
  }

  for (const route of routes) {
    if (!pageIds.has(qualify(owner, route.page))) errors.push(`dangling page reference: ${route.page}`)
    if (!outletIds.has(route.outlet)) errors.push(`dangling outlet reference: ${route.outlet}`)
    const expected = expectedOutletForPath(route.path)
    if (route.outlet !== expected) errors.push(`route ${route.id} path requires outlet ${expected}, received ${route.outlet}`)
    const duplicates = duplicateParameters(route.path)
    if (duplicates.length > 0) errors.push(`route ${route.id} repeats parameter ${duplicates[0]}`)
    if (expected === 'session.content' && !route.path.split('/').includes(':sessionId')) {
      errors.push(`session route ${route.id} must declare :sessionId`)
    }
    const page = pagesById.get(qualify(owner, route.page))
    if (page?.chrome === 'body-only' && route.outlet !== 'session.content') {
      errors.push(`body-only page ${page.id} requires an outlet with persistent external chrome; received ${route.outlet}`)
    }
  }

  const sectionIds = new Set(
    contributions
      .filter(item => item.surface === 'environment.panel.sections')
      .map(item => qualify(owner, item.item?.sectionId ?? '')),
  )
  const rowIds = new Set(
    contributions
      .filter(item => item.surface === 'environment.section.rows')
      .map(item => qualify(owner, item.item?.rowId ?? '')),
  )
  for (const contribution of contributions) {
    if (contribution.surface === 'environment.section.actions' || contribution.surface === 'environment.section.rows') {
      const target = contribution.item?.sectionId
      if (typeof target === 'string' && !sectionIds.has(qualify(owner, target))) errors.push(`dangling environment section: ${target}`)
    }
    if (contribution.surface === 'environment.row.trailing-actions') {
      const target = contribution.item?.rowId
      if (typeof target === 'string' && !rowIds.has(qualify(owner, target))) errors.push(`dangling environment row: ${target}`)
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
for (const file of await jsonFiles(path.join(root, 'test-vectors/ui/valid'))) {
  const suite = JSON.parse(await readFile(file, 'utf8'))
  const errors = validateSuite(suite)
  if (errors.length > 0) {
    console.error(`${path.relative(root, file)} should be valid`, errors)
    failures += 1
  }
}
for (const file of await jsonFiles(path.join(root, 'test-vectors/ui/invalid'))) {
  const suite = JSON.parse(await readFile(file, 'utf8'))
  if (validateSuite(suite).length === 0) {
    console.error(`${path.relative(root, file)} should be invalid`)
    failures += 1
  }
}

const localizedMetadataSuite = JSON.parse(await readFile(
  path.join(root, 'test-vectors/ui/valid/localized-route-page-metadata.json'),
  'utf8',
))
const localizedRoute = localizedMetadataSuite.routes[0]
const localizedPage = localizedMetadataSuite.pages[0]
const routeTitleZh = resolveMessage(localizedMetadataSuite.owner, localizedRoute.title, 'zh-CN', localizedMetadataSuite.catalogs)
const routeDescriptionEn = resolveMessage(localizedMetadataSuite.owner, localizedRoute.description, 'en', localizedMetadataSuite.catalogs)
const pageTitleEn = resolveMessage(localizedMetadataSuite.owner, localizedPage.title, 'en', localizedMetadataSuite.catalogs)
const pageDescriptionZh = resolveMessage(localizedMetadataSuite.owner, localizedPage.description, 'zh-CN', localizedMetadataSuite.catalogs)
if (
  routeTitleZh.text !== '打开概览'
  || routeDescriptionEn.text !== 'Review the plugin overview in the application area.'
  || pageTitleEn.text !== 'Plugin overview'
  || pageDescriptionZh.text !== '展示用户可读的摘要以及应用上下文中可用的操作。'
) {
  console.error('route-v2/page-v3 localized product metadata projection failed', {
    routeTitleZh,
    routeDescriptionEn,
    pageTitleEn,
    pageDescriptionZh,
  })
  failures += 1
}

const orderProbe = [
  { id: 'z', group: 'b', order: -1 },
  { id: 'b', group: 'a', order: 2 },
  { id: 'a', group: 'a', order: 2 },
].sort(compareContributions).map(item => item.id)
if (JSON.stringify(orderProbe) !== JSON.stringify(['a', 'b', 'z'])) {
  console.error('structured contribution ordering is not deterministic', orderProbe)
  failures += 1
}
if (activationKind({ command: { id: 'command' }, route: { id: 'route' } }) !== 'command') {
  console.error('command must take precedence over route')
  failures += 1
}
if (
  nativeMenuProjectionState('exact') !== 'ready'
  || nativeMenuProjectionState('missing') !== 'pending'
  || nativeMenuProjectionState('ambiguous') !== 'pending'
) {
  console.error('native sidebar menu projection must fail pending without a unique trigger')
  failures += 1
}

const localizationProbe = [
  {
    namespace: 'demo',
    locale: 'en',
    default: true,
    messages: { greeting: 'Hello, {name}!' },
  },
  {
    namespace: 'demo',
    locale: 'zh-CN',
    messages: { greeting: '你好，{name}！' },
  },
]
const exactProjection = resolveMessage('demo', { key: 'greeting', params: { name: 'CordisX' } }, 'zh-CN', localizationProbe)
const languageProjection = resolveMessage('demo', { key: 'greeting', params: { name: 'CordisX' } }, 'en-GB', localizationProbe)
const missingProjection = resolveMessage('demo', { key: 'missing', fallback: 'Fallback' }, 'zh-CN', localizationProbe)
const missingParams = resolveMessage('demo', { key: 'greeting' }, 'en', localizationProbe)
if (exactProjection.text !== '你好，CordisX！' || exactProjection.locale !== 'zh-CN') {
  console.error('exact locale projection failed', exactProjection)
  failures += 1
}
if (languageProjection.text !== 'Hello, CordisX!' || languageProjection.locale !== 'en') {
  console.error('language locale fallback failed', languageProjection)
  failures += 1
}
if (missingProjection.text !== 'Fallback' || missingProjection.diagnostic !== 'missing-key') {
  console.error('deterministic missing-key fallback failed', missingProjection)
  failures += 1
}
if (missingParams.text !== '[[demo:greeting]]' || missingParams.diagnostic !== 'missing-params') {
  console.error('deterministic missing-param fallback failed', missingParams)
  failures += 1
}

if (failures > 0) throw new Error(`${failures} structured UI conformance case(s) failed`)
console.log('structured UI conformance: all vectors passed')
