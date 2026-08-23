import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Ajv2020 from 'ajv/dist/2020.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const schemaNames = ['ui-common.v1.schema.json', 'plugin-manifest.v1.schema.json']
const schemas = new Map()
for (const name of schemaNames) {
  schemas.set(name, JSON.parse(await readFile(path.join(root, 'schemas', name), 'utf8')))
}

const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true })
for (const schema of schemas.values()) ajv.addSchema(schema)
const validator = ajv.getSchema(schemas.get('plugin-manifest.v1.schema.json').$id)
if (validator === undefined) throw new Error('plugin manifest schema was not registered')

function normalizedScope(scope) {
  const normalized = {}
  for (const key of ['providers', 'cwdRoots', 'taskIds']) {
    if (scope[key] !== undefined) normalized[key] = [...scope[key]].sort()
  }
  return normalized
}

export function declarationFingerprint(declaration) {
  return JSON.stringify({
    name: declaration.name,
    required: declaration.required,
    reason: declaration.reason,
    scope: normalizedScope(declaration.scope),
  })
}

export function validateManifest(manifest) {
  const errors = []
  if (!validator(manifest)) {
    errors.push(...(validator.errors ?? []).map(error => `${error.instancePath || '/'} ${error.message}`))
  }
  const seen = new Set()
  for (const declaration of manifest?.capabilities ?? []) {
    if (seen.has(declaration.name)) errors.push(`duplicate capability declaration: ${declaration.name}`)
    seen.add(declaration.name)
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
for (const file of await jsonFiles(path.join(root, 'test-vectors/platform/valid'))) {
  const manifest = JSON.parse(await readFile(file, 'utf8'))
  const errors = validateManifest(manifest)
  if (errors.length > 0) {
    console.error(`${path.relative(root, file)} should be valid`, errors)
    failures += 1
  }
}
for (const file of await jsonFiles(path.join(root, 'test-vectors/platform/invalid'))) {
  const manifest = JSON.parse(await readFile(file, 'utf8'))
  if (validateManifest(manifest).length === 0) {
    console.error(`${path.relative(root, file)} should be invalid`)
    failures += 1
  }
}

const base = {
  name: 'tasks.create',
  required: false,
  reason: { key: 'permission.create', fallback: 'Create tasks' },
  scope: { providers: ['zcode', 'codex'], cwdRoots: ['/workspace'] },
}
const reordered = { ...base, scope: { providers: ['codex', 'zcode'], cwdRoots: ['/workspace'] } }
const expanded = { ...base, scope: { providers: ['codex', 'zcode'], cwdRoots: ['/workspace', '/other'] } }
if (declarationFingerprint(base) !== declarationFingerprint(reordered)) {
  console.error('scope list order must not change declaration fingerprint')
  failures += 1
}
if (declarationFingerprint(base) === declarationFingerprint(expanded)) {
  console.error('scope expansion must change declaration fingerprint')
  failures += 1
}

if (failures > 0) throw new Error(`${failures} Platform conformance case(s) failed`)
console.log('Platform capability conformance: all vectors passed')
