import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const schemaNames = [
  'ui-common.v1.schema.json',
  'agent-event.v1.schema.json',
  'agent-event-page.v1.schema.json',
]
const schemas = new Map()
for (const name of schemaNames) {
  schemas.set(name, JSON.parse(await readFile(path.join(root, 'schemas', name), 'utf8')))
}

const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true })
addFormats(ajv)
for (const schema of schemas.values()) ajv.addSchema(schema)
const pageValidator = ajv.getSchema(schemas.get('agent-event-page.v1.schema.json').$id)
if (pageValidator === undefined) throw new Error('agent event page schema was not registered')

const terminalStages = new Set(['forwarded', 'failed', 'expired', 'cancelled'])
const nextStage = new Map([
  ['requested', 'permission'],
  ['permission', 'queued'],
  ['queued', 'claimed'],
  ['claimed', 'projected'],
  ['projected', 'forwarded'],
])

function semanticErrors(page) {
  const errors = []
  const events = page.events ?? []
  const ids = new Map()
  const delivery = new Map()
  for (let index = 0; index < events.length; index += 1) {
    const event = events[index]
    const expectedSeq = page.afterSeq + index + 1
    if (event.seq !== expectedSeq) {
      errors.push(`event[${index}] seq ${event.seq} is not contiguous from ${page.afterSeq}`)
    }
    if (event.sessionId !== page.sessionId) errors.push(`event[${index}] sessionId differs from page`)
    const expectedId = `cxevt:${encodeURIComponent(event.sessionId)}:${event.seq}`
    if (event.eventId !== expectedId) errors.push(`event[${index}] eventId is not the deterministic v1 id`)
    if (ids.has(event.eventId)) errors.push(`duplicate event id ${event.eventId}`)
    if (event.causalParentId !== undefined && !ids.has(event.causalParentId)) {
      errors.push(`event[${index}] causal parent is absent or not earlier`)
    }
    ids.set(event.eventId, event)
    if ((event.provenance === 'observed' || event.provenance === 'inferred') && event.source?.kind !== 'adapter') {
      errors.push(`event[${index}] ${event.provenance} provenance requires an adapter source`)
    }
    if (event.provenance === 'cordisx' && event.source?.kind === 'adapter') {
      errors.push(`event[${index}] cordisx provenance cannot claim an adapter source`)
    }
    if (event.type === 'message.delivery') {
      const stages = delivery.get(event.messageId) ?? []
      stages.push(event.data.stage)
      delivery.set(event.messageId, stages)
    }
  }
  if (events.length === 0) {
    if (page.fromSeq !== undefined || page.toSeq !== undefined) errors.push('empty page cannot expose fromSeq/toSeq')
  } else {
    if (page.fromSeq !== events[0].seq || page.toSeq !== events.at(-1).seq) {
      errors.push('page range does not match events')
    }
  }
  if (page.nextAfterSeq !== undefined && page.nextAfterSeq !== page.toSeq) {
    errors.push('nextAfterSeq must equal the last returned seq')
  }
  if (page.toSeq !== undefined && page.toSeq < page.snapshotSeq && page.nextAfterSeq === undefined) {
    errors.push('page before snapshot tail must expose nextAfterSeq')
  }
  for (const [messageId, stages] of delivery) {
    if (stages[0] !== 'requested') errors.push(`${messageId} delivery must begin at requested`)
    for (let index = 1; index < stages.length; index += 1) {
      const previous = stages[index - 1]
      const current = stages[index]
      if (terminalStages.has(previous)) errors.push(`${messageId} has stage after terminal ${previous}`)
      if ((current === 'forwarded' || !terminalStages.has(current)) && nextStage.get(previous) !== current) {
        errors.push(`${messageId} invalid delivery transition ${previous} -> ${current}`)
      }
    }
  }
  return errors
}

export function validateAgentEventPage(page) {
  const errors = []
  if (!pageValidator(page)) {
    errors.push(...(pageValidator.errors ?? []).map(error => `${error.instancePath || '/'} ${error.message}`))
  }
  if (errors.length === 0) errors.push(...semanticErrors(page))
  return errors
}

async function jsonFiles(directory) {
  return (await readdir(directory, { withFileTypes: true }))
    .filter(entry => entry.isFile() && entry.name.endsWith('.json'))
    .map(entry => path.join(directory, entry.name))
    .sort()
}

let failures = 0
for (const file of await jsonFiles(path.join(root, 'test-vectors/agent-events/valid'))) {
  const page = JSON.parse(await readFile(file, 'utf8'))
  const errors = validateAgentEventPage(page)
  if (errors.length > 0) {
    console.error(`${path.relative(root, file)} should be valid`, errors)
    failures += 1
  }
}
for (const file of await jsonFiles(path.join(root, 'test-vectors/agent-events/invalid'))) {
  const page = JSON.parse(await readFile(file, 'utf8'))
  if (validateAgentEventPage(page).length === 0) {
    console.error(`${path.relative(root, file)} should be invalid`)
    failures += 1
  }
}

const publicSchema = JSON.stringify([
  schemas.get('agent-event.v1.schema.json'),
  schemas.get('agent-event-page.v1.schema.json'),
])
for (const forbidden of ['additionalContext', 'thread/start', 'turn/start', 'application', 'trusted']) {
  if (publicSchema.includes(forbidden)) {
    console.error(`public Agent schema leaks host-specific field or authority ${forbidden}`)
    failures += 1
  }
}

if (failures > 0) throw new Error(`${failures} Agent event conformance case(s) failed`)
console.log('Agent event conformance: all vectors passed')
