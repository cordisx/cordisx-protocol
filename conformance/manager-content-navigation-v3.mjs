import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile, readdir } from 'node:fs/promises'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Ajv2020 from 'ajv/dist/2020.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const schemaNames = [
  'ui-common.v1.schema.json',
  'route.v2.schema.json',
  'page.v3.schema.json',
  'session-common.v1.schema.json',
  'agents-common.v1.schema.json',
  'agent-avatar.v1.schema.json',
  'manager-content-navigation.v1.schema.json',
  'manager-content-navigation.v2.schema.json',
  'manager-content-navigation.v3.schema.json',
  'manager-content-projection.v1.schema.json',
  'manager-content-projection.v2.schema.json',
]
const schemas = new Map()
for (const name of schemaNames) schemas.set(name, JSON.parse(await readFile(path.join(root, 'schemas', name), 'utf8')))
const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true })
for (const schema of schemas.values()) ajv.addSchema(schema)
const validator = name => ajv.getSchema(schemas.get(name).$id)
const schemaErrors = (validate, value) => validate(value) ? [] : (validate.errors ?? []).map(error => `${error.instancePath || '/'} ${error.message}`)
const qualify = (owner, id) => `${owner}:${id}`
const equal = (left, right) => JSON.stringify(left) === JSON.stringify(right)

const frozenFiles = [
  'schemas/manager-content-navigation.v1.schema.json',
  'schemas/manager-content-navigation.v2.schema.json',
  'schemas/manager-content-projection.v1.schema.json',
  'types/manager-content-navigation.v1.d.ts',
  'types/manager-content-navigation.v2.d.ts',
].sort()
const frozenDigest = createHash('sha256')
for (const file of frozenFiles) {
  frozenDigest.update(file)
  frozenDigest.update('\0')
  frozenDigest.update(readFileSync(path.join(root, file)))
  frozenDigest.update('\0')
}
assert.equal(frozenDigest.digest('hex'), 'd47afe0df17efeea720827ada95c4cf1c772671db2e5085a4e28e469f0dfae46', 'v1/v2 contract bytes must remain frozen')

const v3AsV2 = structuredClone(schemas.get('manager-content-navigation.v3.schema.json'))
v3AsV2.$id = schemas.get('manager-content-navigation.v2.schema.json').$id
v3AsV2.title = schemas.get('manager-content-navigation.v2.schema.json').title
v3AsV2.properties.$schema.const = v3AsV2.$id
v3AsV2.properties.schemaVersion.const = 2
delete v3AsV2.properties.subject
delete v3AsV2.properties.recordSummary
delete v3AsV2.$defs.displayText
delete v3AsV2.$defs.subject
delete v3AsV2.$defs.leadingVisual
delete v3AsV2.$defs.recordSummary
assert.deepEqual(v3AsV2, schemas.get('manager-content-navigation.v2.schema.json'), 'v3 must be an additive v2 declaration successor')

function validateSuite(suite) {
  const errors = []
  const owners = new Set((suite.owners ?? []).map(owner => owner.id))
  const routes = new Map()
  for (const [index, record] of (suite.routes ?? []).entries()) {
    errors.push(...schemaErrors(validator('route.v2.schema.json'), record.document).map(error => `routes[${index}] ${error}`))
    routes.set(qualify(record.owner, record.document.id), record.document)
  }
  const pages = new Map()
  for (const [index, record] of (suite.pages ?? []).entries()) {
    errors.push(...schemaErrors(validator('page.v3.schema.json'), record.document).map(error => `pages[${index}] ${error}`))
    pages.set(qualify(record.owner, record.document.id), record.document)
  }
  const declarations = new Map()
  const subjects = new Map()
  for (const [index, record] of (suite.declarations ?? []).entries()) {
    if (!owners.has(record.owner)) errors.push(`declarations[${index}] has an unknown owner`)
    const name = `manager-content-navigation.v${record.document?.schemaVersion}.schema.json`
    const validate = schemas.has(name) ? validator(name) : () => false
    errors.push(...schemaErrors(validate, record.document).map(error => `declarations[${index}] ${error}`))
    const key = qualify(record.owner, record.document.id)
    if (declarations.has(key)) errors.push(`duplicate declaration identity ${key}`)
    declarations.set(key, record.document)
    const route = routes.get(qualify(record.owner, record.document.route?.id))
    if (route === undefined) errors.push(`declaration ${key} has an unresolved route`)
    else {
      if (route.outlet !== 'manager.content') errors.push(`declaration ${key} must target manager.content`)
      const page = pages.get(qualify(record.owner, route.page))
      if (page === undefined || (page.chrome ?? 'standard') !== 'standard') errors.push(`declaration ${key} requires a same-owner standard page`)
    }
    if ((record.document.subject || record.document.recordSummary) && record.document.header?.title?.kind !== 'record') {
      errors.push(`declaration ${key} subjects and record summaries require a record header`)
    }
    if (record.document.header?.title?.kind === 'record') {
      const recordIdParam = record.document.header.title.recordIdParam
      if (!Object.prototype.hasOwnProperty.call(record.document.route?.params ?? {}, recordIdParam)) {
        errors.push(`declaration ${key} recordIdParam must name an exact route parameter`)
      }
    }
    if (record.document.subject?.kind === 'agent-definition') {
      const identity = record.document.subject.identity
      const subjectKey = `${identity?.agentId}\0${identity?.revision}`
      if (subjects.has(subjectKey)) errors.push(`duplicate agent-definition subject claim ${identity?.agentId}@${identity?.revision}`)
      subjects.set(subjectKey, { owner: record.owner, route: record.document.route })
    }
    const tabIds = new Set()
    for (const tab of record.document.tabs ?? []) {
      if (tabIds.has(tab.id)) errors.push(`declaration ${key} has duplicate tab ${tab.id}`)
      tabIds.add(tab.id)
      if (!routes.has(qualify(record.owner, tab.route.id))) errors.push(`declaration ${key} tab ${tab.id} has an unresolved route`)
      if (record.document.header?.title?.kind === 'record') {
        const recordIdParam = record.document.header.title.recordIdParam
        if (tab.route.params?.[recordIdParam] !== record.document.route?.params?.[recordIdParam]) {
          errors.push(`declaration ${key} tab ${tab.id} must retain the exact record parameter`)
        }
      }
    }
  }

  const projectionName = `manager-content-projection.v${suite.projection?.schemaVersion}.schema.json`
  const projectionValidator = schemas.has(projectionName) ? validator(projectionName) : () => false
  errors.push(...schemaErrors(projectionValidator, suite.projection).map(error => `projection ${error}`))
  const active = declarations.get(suite.activeDeclaration)
  if (active === undefined) return [...errors, 'activeDeclaration must resolve']
  const owner = suite.activeDeclaration.slice(0, suite.activeDeclaration.indexOf(':'))
  if (!equal(suite.projection?.recordSummary, active.recordSummary)) errors.push('projection record summary must exactly match the active declaration')
  const tabs = active.tabs ?? []
  if (tabs.length !== (suite.projection?.tabs ?? []).length) errors.push('projection tab count must match')
  for (const [index, tab] of tabs.entries()) {
    const output = suite.projection?.tabs?.[index]
    const targetRoute = routes.get(qualify(owner, tab.route.id))
    const expectedText = tab.label ?? targetRoute?.title
    if (output?.id !== tab.id) errors.push(`projection tab ${index} id must match`)
    if (output?.route?.id !== qualify(owner, tab.route.id) || !equal(output.route.params ?? {}, tab.route.params ?? {})) errors.push(`projection tab ${tab.id} route must match`)
    if (!equal(output?.text, expectedText)) errors.push(`projection tab ${tab.id} text must use explicit label or target route title`)
  }
  if ((suite.projection?.tabs ?? []).filter(tab => tab.active).length > 1) errors.push('at most one projected tab may be active')
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

const directory = path.join(root, 'test-vectors/manager-content-navigation-v3')
const valid = JSON.parse(await readFile(path.join(directory, 'valid/entity-summary.json'), 'utf8'))
assert.deepEqual(validateSuite(valid), [])
assert.deepEqual(structuredClone(valid), valid, 'v3 declaration and projection must be structured-clone safe')

const changedTab = structuredClone(valid.projection)
changedTab.route = structuredClone(changedTab.tabs[1].route)
changedTab.tabs[0].active = false
changedTab.tabs[1].active = true
assert.deepEqual(changedTab.recordSummary, valid.projection.recordSummary, 'tab selection must preserve the fixed record summary')

for (const name of (await readdir(path.join(directory, 'invalid'))).filter(name => name.endsWith('.json')).sort()) {
  const vector = JSON.parse(await readFile(path.join(directory, 'invalid', name), 'utf8'))
  assert.notDeepEqual(validateSuite(mutate(valid, vector)), [], `${name} must be invalid`)
}

console.log('Manager content navigation v3 conformance: all vectors passed')
