import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const schemaNames = [
  'ui-common.v1.schema.json',
  'agent-event.v1.schema.json',
  'agent-event.v2.schema.json',
  'agent-history-page.v1.schema.json',
]
const schemas = new Map()
for (const name of schemaNames) {
  schemas.set(name, JSON.parse(await readFile(path.join(root, 'schemas', name), 'utf8')))
}

const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true })
addFormats(ajv)
for (const schema of schemas.values()) ajv.addSchema(schema)
const validator = ajv.getSchema(schemas.get('agent-history-page.v1.schema.json').$id)
if (validator === undefined) throw new Error('Agent history schema was not registered')

const policyRank = new Map([['referenced', 0], ['summarized', 1], ['inline', 2]])
const allowedEventTypes = new Set([
  'session.lifecycle',
  'turn.lifecycle',
  'step.lifecycle',
  'item.lifecycle',
  'message.observed',
  'content.chunk',
  'diagnostic',
])

function validatorErrors() {
  return (validator.errors ?? []).map(error => `${error.instancePath || '/'} ${error.message}`)
}

export function validateHistoryPage(page) {
  if (!validator(page)) return validatorErrors()
  const errors = []
  const events = page.events ?? []
  if (policyRank.get(page.effectivePayloadPolicy) > policyRank.get(page.requestedPayloadPolicy)) {
    errors.push('effective payload policy cannot exceed the requested policy')
  }
  if (page.coverage.state === 'unavailable' && events.length > 0) {
    errors.push('unavailable history cannot expose events')
  }
  if (!page.coverage.tailAvailable && page.tailCursor !== undefined) {
    errors.push('tail cursor requires tail availability')
  }
  if (
    page.coverage.earliestTime !== undefined
    && page.coverage.latestTime !== undefined
    && page.coverage.earliestTime > page.coverage.latestTime
  ) {
    errors.push('coverage earliestTime cannot be later than latestTime')
  }

  const eventIds = new Set()
  for (let index = 0; index < events.length; index += 1) {
    const event = events[index]
    if (event.sessionId !== page.sessionId) errors.push(`event[${index}] sessionId differs from page`)
    if (!allowedEventTypes.has(event.type)) errors.push(`event[${index}] type is not provable history`)
    if (!['observed', 'inferred'].includes(event.provenance)) {
      errors.push(`event[${index}] history provenance must be observed or inferred`)
    }
    if (event.source?.kind !== 'adapter') errors.push(`event[${index}] history source must be an adapter`)
    if (
      event.source?.adapterId !== page.source.adapterId
      || event.source?.adapterVersion !== page.source.adapterVersion
      || event.source?.hostId !== page.source.hostId
    ) {
      errors.push(`event[${index}] adapter source differs from page source`)
    }
    if (eventIds.has(event.eventId)) errors.push(`duplicate event id ${event.eventId}`)
    eventIds.add(event.eventId)
    if (index > 0 && event.seq !== events[index - 1].seq + 1) {
      errors.push(`event[${index}] history seq is not contiguous within the page`)
    }
  }

  if (events.length === 0) {
    if (page.fromSeq !== undefined || page.toSeq !== undefined) {
      errors.push('empty page cannot expose fromSeq/toSeq')
    }
  } else if (page.fromSeq !== events[0].seq || page.toSeq !== events.at(-1).seq) {
    errors.push('page range does not match events')
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
for (const file of await jsonFiles(path.join(root, 'test-vectors/agent-history/valid'))) {
  const page = JSON.parse(await readFile(file, 'utf8'))
  const errors = validateHistoryPage(page)
  if (errors.length > 0) {
    console.error(`${path.relative(root, file)} should be valid`, errors)
    failures += 1
  }
}
for (const file of await jsonFiles(path.join(root, 'test-vectors/agent-history/invalid'))) {
  const page = JSON.parse(await readFile(file, 'utf8'))
  if (validateHistoryPage(page).length === 0) {
    console.error(`${path.relative(root, file)} should be invalid`)
    failures += 1
  }
}

const publicSchema = JSON.stringify(schemas.get('agent-history-page.v1.schema.json'))
for (
  const forbidden of [
    'additionalContext',
    'model-consumed',
    'modelConsumed',
    'providerId',
    'remoteSessionId',
    'CODEX_HOME',
    'HOME',
    'filePath',
    'byteOffset',
    'inode',
    'credential',
  ]
) {
  if (publicSchema.includes(forbidden)) {
    console.error(`public Agent history schema leaks forbidden authority ${forbidden}`)
    failures += 1
  }
}

if (failures > 0) throw new Error(`${failures} Agent history conformance case(s) failed`)
console.log('Agent history conformance: all vectors passed')
