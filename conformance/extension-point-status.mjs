import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Ajv2020 from 'ajv/dist/2020.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const schemaNames = [
  'ui-common.v1.schema.json',
  'host-extension-point-catalog.v5.schema.json',
  'extension-point-runtime-context.v1.schema.json',
]
const schemas = new Map()
for (const name of schemaNames) schemas.set(name, JSON.parse(await readFile(path.join(root, 'schemas', name), 'utf8')))

const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true })
for (const schema of schemas.values()) ajv.addSchema(schema)
const catalogValidator = ajv.getSchema(schemas.get('host-extension-point-catalog.v5.schema.json').$id)
const contextValidator = ajv.getSchema(schemas.get('extension-point-runtime-context.v1.schema.json').$id)
if (catalogValidator === undefined || contextValidator === undefined) throw new Error('extension point status schemas were not registered')

function schemaErrors(validator, value) {
  if (validator(value)) return []
  return (validator.errors ?? []).map(error => `${error.instancePath || '/'} ${error.message}`)
}

function duplicates(values) {
  const seen = new Set()
  return values.filter(value => seen.has(value) || !seen.add(value))
}

function validateSuite(suite) {
  const errors = [
    ...schemaErrors(catalogValidator, suite?.catalog).map(error => `catalog schema: ${error}`),
    ...schemaErrors(contextValidator, suite?.context).map(error => `context schema: ${error}`),
  ]
  const points = Array.isArray(suite?.catalog?.points) ? suite.catalog.points : []
  const contexts = Array.isArray(suite?.context?.points) ? suite.context.points : []
  const byId = new Map(points.flatMap(point => typeof point?.id === 'string' ? [[point.id, point]] : []))
  for (const id of duplicates(points.map(point => point?.id).filter(id => typeof id === 'string'))) errors.push(`duplicate catalog point: ${id}`)
  for (const id of duplicates(contexts.map(point => point?.id).filter(id => typeof id === 'string'))) errors.push(`duplicate context point: ${id}`)
  for (const context of contexts) {
    const descriptor = byId.get(context?.id)
    if (descriptor === undefined) {
      errors.push(`context references unknown point: ${context?.id ?? '<missing>'}`)
      continue
    }
    if (context.state === 'active' && descriptor.adapterSupport !== 'supported') {
      errors.push(`point ${context.id} cannot be active when adapter support is ${descriptor.adapterSupport}`)
    }
    const anchors = new Map((descriptor.anchors ?? []).map(anchor => [anchor.id, anchor]))
    for (const anchorContext of context.anchors ?? []) {
      const anchor = anchors.get(anchorContext.id)
      if (anchor === undefined) errors.push(`context references unknown anchor: ${context.id}/${anchorContext.id}`)
      else if (anchorContext.state === 'active' && anchor.adapterSupport !== 'supported') {
        errors.push(`anchor ${context.id}/${anchorContext.id} cannot be active when adapter support is ${anchor.adapterSupport}`)
      }
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
for (const file of await jsonFiles(path.join(root, 'test-vectors/extension-point-status/valid'))) {
  const errors = validateSuite(JSON.parse(await readFile(file, 'utf8')))
  if (errors.length > 0) {
    console.error(`${path.relative(root, file)} should be valid`, errors)
    failures += 1
  }
}
for (const file of await jsonFiles(path.join(root, 'test-vectors/extension-point-status/invalid'))) {
  if (validateSuite(JSON.parse(await readFile(file, 'utf8'))).length === 0) {
    console.error(`${path.relative(root, file)} should be invalid`)
    failures += 1
  }
}

if (failures > 0) throw new Error(`${failures} extension point status conformance case(s) failed`)
console.log('Extension point status conformance: all vectors passed')
