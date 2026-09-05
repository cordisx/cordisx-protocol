import { createHash } from 'node:crypto'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const schema = JSON.parse(await readFile(path.join(root, 'schemas/plugin-generation-artifact.v1.schema.json'), 'utf8'))
const ajv = new Ajv2020({ allErrors: true, strict: true })
addFormats(ajv)
const validateSchema = ajv.compile(schema)

const assetMediaTypeByExtension = new Map([
  ['.avif', 'image/avif'],
  ['.gif', 'image/gif'],
  ['.jpeg', 'image/jpeg'],
  ['.jpg', 'image/jpeg'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.webp', 'image/webp'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2'],
  ['.wasm', 'application/wasm'],
])
const maximumArtifactBytes = 268_435_456

function validatorErrors() {
  return (validateSchema.errors ?? []).map(error => `${error.instancePath || '/'} ${error.message}`)
}

function sorted(values) {
  return values.every((value, index) => index === 0 || values[index - 1].localeCompare(value, 'en') < 0)
}

function sameValues(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index])
}

function referenceErrors(file, field, expectedKind, byPath) {
  const errors = []
  for (const reference of file[field]) {
    const target = byPath.get(reference)
    if (target === undefined) errors.push(`${file.path} ${field} references missing ${reference}`)
    else if (target.kind !== expectedKind) errors.push(`${file.path} ${field} references ${target.kind} ${reference}`)
  }
  return errors
}

function reachablePaths(entry, byPath) {
  const reached = new Set()
  const visit = (logicalPath) => {
    if (reached.has(logicalPath)) return
    reached.add(logicalPath)
    const file = byPath.get(logicalPath)
    if (file?.kind === 'module') {
      for (const target of [...file.imports, ...file.dynamicImports, ...file.styles, ...file.assets]) visit(target)
    } else if (file?.kind === 'stylesheet') {
      for (const target of file.assets) visit(target)
    }
  }
  visit(entry)
  return reached
}

function staticModuleClosure(entry, byPath) {
  const modules = new Set()
  const visit = (logicalPath) => {
    if (modules.has(logicalPath)) return
    modules.add(logicalPath)
    const file = byPath.get(logicalPath)
    if (file?.kind !== 'module') return
    for (const target of file.imports) visit(target)
  }
  visit(entry)
  return modules
}

export function validateArtifact(value) {
  if (!validateSchema(value)) return validatorErrors()
  const errors = []
  const paths = value.files.map(file => file.path)
  const byPath = new Map(value.files.map(file => [file.path, file]))
  const caseFolded = new Set()
  for (const logicalPath of paths) {
    const folded = logicalPath.toLocaleLowerCase('en-US')
    if (caseFolded.has(folded)) errors.push(`case-fold path collision: ${logicalPath}`)
    caseFolded.add(folded)
  }
  if (byPath.size !== paths.length) errors.push('duplicate file path')
  if (!sorted(paths)) errors.push('files must be ordered by path')
  if (!sorted(value.initialStyles)) errors.push('initialStyles must be ordered')
  if (!sorted(value.sharedImports)) errors.push('sharedImports must be ordered')

  const entry = byPath.get(value.entry)
  if (entry?.kind !== 'module') errors.push('entry must reference one listed module')
  let totalBytes = 0
  for (const file of value.files) {
    totalBytes += file.byteLength
    if (file.kind === 'module') {
      for (const field of ['imports', 'dynamicImports', 'styles', 'assets']) {
        if (!sorted(file[field])) errors.push(`${file.path} ${field} must be ordered`)
      }
      errors.push(...referenceErrors(file, 'imports', 'module', byPath))
      errors.push(...referenceErrors(file, 'dynamicImports', 'module', byPath))
      errors.push(...referenceErrors(file, 'styles', 'stylesheet', byPath))
      errors.push(...referenceErrors(file, 'assets', 'asset', byPath))
    } else if (file.kind === 'stylesheet') {
      if (!sorted(file.assets)) errors.push(`${file.path} assets must be ordered`)
      errors.push(...referenceErrors(file, 'assets', 'asset', byPath))
    } else {
      const expected = assetMediaTypeByExtension.get(path.posix.extname(file.path))
      if (file.mediaType !== expected) errors.push(`${file.path} media type does not match its extension`)
    }
  }
  if (totalBytes > maximumArtifactBytes) errors.push('artifact exceeds the v1 byte limit')

  if (entry?.kind === 'module') {
    const initialStyles = [...staticModuleClosure(value.entry, byPath)]
      .flatMap(logicalPath => byPath.get(logicalPath).styles)
      .filter((logicalPath, index, values) => values.indexOf(logicalPath) === index)
      .sort((left, right) => left.localeCompare(right, 'en'))
    if (!sameValues(value.initialStyles, initialStyles)) {
      errors.push('initialStyles differs from the entry static-import closure')
    }
    const reached = reachablePaths(value.entry, byPath)
    for (const logicalPath of paths) {
      if (!reached.has(logicalPath)) errors.push(`unreachable artifact file: ${logicalPath}`)
    }
  }
  return errors
}

function verifyFileBytes(file, bytes) {
  const digest = `sha256:${createHash('sha256').update(bytes).digest('hex')}`
  return file.byteLength === bytes.byteLength && file.digest === digest
}

function resolveEmittedReference(importer, specifier, artifact) {
  if (artifact.sharedImports.includes(specifier)) return { kind: 'shared', specifier }
  if (!specifier.startsWith('./') && !specifier.startsWith('../')) return undefined
  const importerPath = importer.slice(2)
  const target = path.posix.normalize(path.posix.join(path.posix.dirname(importerPath), specifier))
  if (target === '..' || target.startsWith('../') || path.posix.isAbsolute(target)) return undefined
  const logicalPath = `./${target}`
  return artifact.files.some(file => file.path === logicalPath) ? { kind: 'artifact', path: logicalPath } : undefined
}

async function jsonFiles(directory) {
  return (await readdir(directory, { withFileTypes: true }))
    .filter(entry => entry.isFile() && entry.name.endsWith('.json'))
    .map(entry => path.join(directory, entry.name))
    .sort()
}

let failures = 0
for (const file of await jsonFiles(path.join(root, 'test-vectors/plugin-generation-artifact/valid'))) {
  const vector = JSON.parse(await readFile(file, 'utf8'))
  const errors = vector.case === 'artifact' ? validateArtifact(vector.value) : ['unknown vector case']
  if (errors.length > 0) {
    console.error(`${path.relative(root, file)} should be valid`, errors)
    failures += 1
  }
}
for (const file of await jsonFiles(path.join(root, 'test-vectors/plugin-generation-artifact/invalid'))) {
  const vector = JSON.parse(await readFile(file, 'utf8'))
  if (vector.case === 'artifact' && validateArtifact(vector.value).length === 0) {
    console.error(`${path.relative(root, file)} should be invalid`)
    failures += 1
  }
}

const sampleBytes = Buffer.from('export const ready = true\n')
const sampleFile = {
  byteLength: sampleBytes.byteLength,
  digest: `sha256:${createHash('sha256').update(sampleBytes).digest('hex')}`,
}
if (
  !verifyFileBytes(sampleFile, sampleBytes)
  || verifyFileBytes({ ...sampleFile, byteLength: sampleFile.byteLength + 1 }, sampleBytes)
) {
  console.error('per-file digest and byte-length readback must be exact')
  failures += 1
}

const graphVector =
  JSON.parse(await readFile(path.join(root, 'test-vectors/plugin-generation-artifact/valid/esm-graph.json'), 'utf8'))
    .value
for (
  const [label, importer, specifier, valid] of [
    ['relative static chunk', './module.js', './chunks/shared.js', true],
    ['relative dynamic sibling', './chunks/lazy.js', './shared.js', true],
    ['declared Host module', './module.js', 'cordisx/react', true],
    ['declared ReactDOM peer', './module.js', 'react-dom/client', true],
    ['undeclared Host module', './module.js', 'cordisx/ui', false],
    ['arbitrary bare module', './module.js', 'example-library', false],
    ['external URL', './module.js', 'https://example.test/code.js', false],
    ['escaping module', './module.js', '../outside.js', false],
  ]
) {
  if ((resolveEmittedReference(importer, specifier, graphVector) !== undefined) !== valid) {
    console.error(`${label}: emitted reference resolution differed`)
    failures += 1
  }
}

class StyleFence {
  activeGeneration
  styles = new Map()

  publish(generation) {
    this.activeGeneration = generation
  }

  complete(generation, style) {
    if (this.activeGeneration !== generation) return false
    this.styles.set(style, generation)
    return true
  }

  dispose(generation) {
    if (this.activeGeneration === generation) this.activeGeneration = undefined
    for (const [style, owner] of this.styles) if (owner === generation) this.styles.delete(style)
  }
}

const styles = new StyleFence()
styles.publish('generation-1')
styles.dispose('generation-1')
styles.publish('generation-2')
if (styles.complete('generation-1', './styles/late.css') || styles.styles.size !== 0) {
  console.error('late stylesheet completion from a disposed generation must stay inert')
  failures += 1
}
styles.complete('generation-2', './styles/current.css')
styles.dispose('generation-2')
if (styles.styles.size !== 0) {
  console.error('generation disposal must remove its applied styles')
  failures += 1
}

if (failures > 0) throw new Error(`${failures} plugin generation artifact conformance case(s) failed`)
console.log('Plugin generation artifact conformance: all vectors passed')
