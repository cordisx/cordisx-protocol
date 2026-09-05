import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Ajv2020 from 'ajv/dist/2020.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const entrySchema = JSON.parse(await readFile(path.join(root, 'schemas/plugin-console-entry.v1.schema.json'), 'utf8'))
const pageSchema = JSON.parse(await readFile(path.join(root, 'schemas/plugin-console-page.v1.schema.json'), 'utf8'))
const ajv = new Ajv2020({ allErrors: true, strict: true })
ajv.addSchema(entrySchema)
ajv.addSchema(pageSchema)
const validate = ajv.getSchema(pageSchema.$id)
if (validate === undefined) throw new Error('Plugin Console schema was not registered')

const terminals = new Set(['success', 'failure', 'cancel'])

export function validatePluginConsolePage(page) {
  if (!validate(page)) return (validate.errors ?? []).map(error => `${error.instancePath || '/'} ${error.message}`)
  const errors = []
  let previousSeq = -1
  let previousTime = -1
  const correlations = new Map()
  const identity = JSON.stringify(page.plugin)
  for (const [index, entry] of page.entries.entries()) {
    if (JSON.stringify(entry.plugin) !== identity) errors.push(`entry[${index}] plugin differs from page`)
    if (entry.generation !== page.generation) errors.push(`entry[${index}] generation differs from page`)
    if (entry.seq <= previousSeq) errors.push(`entry[${index}] seq is not strictly increasing`)
    if (entry.time < previousTime) errors.push(`entry[${index}] time moves backwards`)
    if (entry.coverage === 'unknown') errors.push(`entry[${index}] unknown coverage cannot enter a plugin-owned page`)
    if ((entry.kind === 'invocation' || entry.kind === 'permission') && entry.coverage !== 'host-mediated') {
      errors.push(`entry[${index}] Host call phases require host-mediated coverage`)
    }
    if (entry.kind === 'console' && entry.coverage !== 'scoped-console') {
      errors.push(`entry[${index}] plugin console requires scoped-console coverage`)
    }
    if (
      entry.effectiveOwner !== undefined
      && JSON.stringify(entry.effectiveOwner) !== JSON.stringify(entry.plugin)
      && entry.trigger?.kind !== 'registration'
    ) {
      errors.push(`entry[${index}] cross-owner invocation requires a registration trigger`)
    }
    previousSeq = entry.seq
    previousTime = entry.time
    if (entry.correlationId === undefined) continue
    const phases = correlations.get(entry.correlationId) ?? []
    phases.push(entry.phase)
    correlations.set(entry.correlationId, phases)
  }
  for (const [correlationId, phases] of correlations) {
    const terminalPhases = phases.filter(phase => terminals.has(phase))
    if (terminalPhases.length > 1) errors.push(`${correlationId} has more than one terminal invocation`)
    const success = phases.indexOf('success')
    const dispatch = phases.indexOf('dispatch')
    if (success >= 0 && (dispatch < 0 || dispatch > success)) errors.push(`${correlationId} succeeds before dispatch`)
    if (!phases.includes('requested')) errors.push(`${correlationId} has no requested phase`)
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
for (const file of await jsonFiles(path.join(root, 'test-vectors/plugin-console/valid'))) {
  const errors = validatePluginConsolePage(JSON.parse(await readFile(file, 'utf8')))
  if (errors.length > 0) {
    console.error(`${path.relative(root, file)} should be valid`, errors)
    failures += 1
  }
}
for (const file of await jsonFiles(path.join(root, 'test-vectors/plugin-console/invalid'))) {
  if (validatePluginConsolePage(JSON.parse(await readFile(file, 'utf8'))).length === 0) {
    console.error(`${path.relative(root, file)} should be invalid`)
    failures += 1
  }
}

const publicSchemas = `${JSON.stringify(entrySchema)}${JSON.stringify(pageSchema)}`
for (const forbidden of ['rawPrompt', 'responseBody', 'secretValue', 'urlQuery', 'fileContent', 'writerRevision']) {
  if (publicSchemas.includes(forbidden)) {
    console.error(`Plugin Console schema exposes forbidden field ${forbidden}`)
    failures += 1
  }
}

if (failures > 0) throw new Error(`${failures} Plugin Console conformance case(s) failed`)
console.log('Plugin Console conformance: all vectors passed')
