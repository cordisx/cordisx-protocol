import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const schemaNames = [
  'ui-common.v1.schema.json',
  'agent-event.v1.schema.json',
  'agent-event.v2.schema.json',
  'agent-event-page.v2.schema.json',
  'agent-delivery-snapshot.v1.schema.json',
]
const schemas = new Map()
for (const name of schemaNames) {
  schemas.set(name, JSON.parse(await readFile(path.join(root, 'schemas', name), 'utf8')))
}

const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true })
addFormats(ajv)
for (const schema of schemas.values()) ajv.addSchema(schema)
const pageValidator = ajv.getSchema(schemas.get('agent-event-page.v2.schema.json').$id)
const snapshotValidator = ajv.getSchema(schemas.get('agent-delivery-snapshot.v1.schema.json').$id)
if (pageValidator === undefined || snapshotValidator === undefined) throw new Error('Agent v2 schemas were not registered')

const terminalStages = new Set(['forwarded', 'failed', 'expired', 'cancelled'])
const cancellableStages = new Set(['requested', 'permission', 'queued'])
const nextDeliveryStage = new Map([
  ['requested', 'permission'],
  ['permission', 'queued'],
  ['queued', 'claimed'],
  ['claimed', 'projected'],
  ['projected', 'forwarded'],
])
const nextContributionStage = new Map([
  ['evaluated', 'projected'],
  ['projected', 'forwarded'],
])

function sameOwner(left, right) {
  return JSON.stringify(left) === JSON.stringify(right)
}

function semanticErrors(page) {
  const errors = []
  const events = page.events ?? []
  const ids = new Map()
  const deliveries = new Map()
  const registered = new Map()
  const released = new Set()
  const evaluations = new Map()
  for (let index = 0; index < events.length; index += 1) {
    const event = events[index]
    const expectedSeq = page.afterSeq + index + 1
    if (event.seq !== expectedSeq) errors.push(`event[${index}] seq ${event.seq} is not contiguous from ${page.afterSeq}`)
    if (event.sessionId !== page.sessionId) errors.push(`event[${index}] sessionId differs from page`)
    const expectedId = `cxevt:${encodeURIComponent(event.sessionId)}:${event.seq}`
    if (event.eventId !== expectedId) errors.push(`event[${index}] eventId is not the deterministic v2 id`)
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
      const record = deliveries.get(event.deliveryId) ?? {
        stages: [], owner: event.data.owner, messageId: event.messageId,
      }
      if (!sameOwner(record.owner, event.data.owner)) errors.push(`${event.deliveryId} changed owner`)
      if (record.messageId !== event.messageId) errors.push(`${event.deliveryId} changed messageId`)
      record.stages.push(event.data.stage)
      deliveries.set(event.deliveryId, record)
    }

    if (event.type === 'input.contribution') {
      if (event.provenance !== 'cordisx' || event.source?.kind !== 'plugin') {
        errors.push(`event[${index}] input contribution requires CordisX provenance and plugin source`)
      }
      const stage = event.data.stage
      if (stage === 'registered') {
        if (registered.has(event.contributionId)) errors.push(`${event.contributionId} registered more than once`)
        registered.set(event.contributionId, event.source)
      }
      if (stage === 'released') {
        if (!registered.has(event.contributionId)) errors.push(`${event.contributionId} released before registration`)
        if (released.has(event.contributionId)) errors.push(`${event.contributionId} released more than once`)
        released.add(event.contributionId)
      }
      if (event.data.evaluationId !== undefined) {
        const evaluation = evaluations.get(event.data.evaluationId) ?? {
          stages: [], contributionId: event.contributionId, source: event.source,
          messageIds: event.data.messageIds,
        }
        if (evaluation.contributionId !== event.contributionId) errors.push(`${event.data.evaluationId} changed contributionId`)
        if (!sameOwner(evaluation.source, event.source)) errors.push(`${event.data.evaluationId} changed source`)
        if (JSON.stringify(evaluation.messageIds) !== JSON.stringify(event.data.messageIds)) {
          errors.push(`${event.data.evaluationId} changed messageIds`)
        }
        evaluation.stages.push(stage)
        evaluations.set(event.data.evaluationId, evaluation)
      }
      if (event.data.kind !== 'pre-step.append'
        && ['evaluated', 'projected', 'forwarded'].includes(stage)
        && !registered.has(event.contributionId)) {
        errors.push(`${event.contributionId} evaluated before registration`)
      }
    }
  }

  if (events.length === 0) {
    if (page.fromSeq !== undefined || page.toSeq !== undefined) errors.push('empty page cannot expose fromSeq/toSeq')
  } else if (page.fromSeq !== events[0].seq || page.toSeq !== events.at(-1).seq) {
    errors.push('page range does not match events')
  }
  if (page.nextAfterSeq !== undefined && page.nextAfterSeq !== page.toSeq) errors.push('nextAfterSeq must equal the last returned seq')
  if (page.toSeq !== undefined && page.toSeq < page.snapshotSeq && page.nextAfterSeq === undefined) {
    errors.push('page before snapshot tail must expose nextAfterSeq')
  }

  for (const [deliveryId, record] of deliveries) {
    if (record.stages[0] !== 'requested') errors.push(`${deliveryId} delivery must begin at requested`)
    for (let index = 1; index < record.stages.length; index += 1) {
      const previous = record.stages[index - 1]
      const current = record.stages[index]
      if (terminalStages.has(previous)) errors.push(`${deliveryId} has stage after terminal ${previous}`)
      if (current === 'cancelled' && !cancellableStages.has(previous)) {
        errors.push(`${deliveryId} cancelled after irreversible stage ${previous}`)
      }
      if (!terminalStages.has(current) && nextDeliveryStage.get(previous) !== current) {
        errors.push(`${deliveryId} invalid delivery transition ${previous} -> ${current}`)
      }
    }
  }

  for (const [evaluationId, record] of evaluations) {
    if (record.stages[0] !== 'evaluated') errors.push(`${evaluationId} must begin at evaluated`)
    for (let index = 1; index < record.stages.length; index += 1) {
      const previous = record.stages[index - 1]
      const current = record.stages[index]
      if (previous === 'forwarded' || previous === 'failed') errors.push(`${evaluationId} has stage after terminal ${previous}`)
      if (current !== 'failed' && nextContributionStage.get(previous) !== current) {
        errors.push(`${evaluationId} invalid contribution transition ${previous} -> ${current}`)
      }
    }
  }
  return errors
}

function validatePage(page) {
  const errors = []
  if (!pageValidator(page)) errors.push(...(pageValidator.errors ?? []).map(error => `${error.instancePath || '/'} ${error.message}`))
  if (errors.length === 0) errors.push(...semanticErrors(page))
  return errors
}

function validateSnapshot(snapshot) {
  const errors = []
  if (!snapshotValidator(snapshot)) errors.push(...(snapshotValidator.errors ?? []).map(error => `${error.instancePath || '/'} ${error.message}`))
  const terminal = terminalStages.has(snapshot.stage)
  const cancellable = snapshot.valid && cancellableStages.has(snapshot.stage)
  if (snapshot.terminal !== terminal) errors.push('terminal flag does not match stage')
  if (snapshot.cancellable !== cancellable) errors.push('cancellable flag does not match stage and generation validity')
  return errors
}

async function jsonFiles(directory) {
  return (await readdir(directory, { withFileTypes: true }))
    .filter(entry => entry.isFile() && entry.name.endsWith('.json'))
    .map(entry => path.join(directory, entry.name))
    .sort()
}

let failures = 0
for (const [suite, validate] of [
  ['agent-events-v2', validatePage],
  ['agent-delivery', validateSnapshot],
]) {
  for (const file of await jsonFiles(path.join(root, 'test-vectors', suite, 'valid'))) {
    const input = JSON.parse(await readFile(file, 'utf8'))
    const errors = validate(input)
    if (errors.length > 0) {
      console.error(`${path.relative(root, file)} should be valid`, errors)
      failures += 1
    }
  }
  for (const file of await jsonFiles(path.join(root, 'test-vectors', suite, 'invalid'))) {
    const input = JSON.parse(await readFile(file, 'utf8'))
    if (validate(input).length === 0) {
      console.error(`${path.relative(root, file)} should be invalid`)
      failures += 1
    }
  }
}

const publicSchema = JSON.stringify([
  schemas.get('agent-event.v2.schema.json'),
  schemas.get('agent-event-page.v2.schema.json'),
  schemas.get('agent-delivery-snapshot.v1.schema.json'),
])
for (const forbidden of ['additionalContext', 'thread/start', 'turn/start', 'application', 'trusted', 'model-consumed', 'modelConsumed']) {
  if (publicSchema.includes(forbidden)) {
    console.error(`public Agent v2 schema leaks host-specific field or authority ${forbidden}`)
    failures += 1
  }
}

if (failures > 0) throw new Error(`${failures} Agent v2 conformance case(s) failed`)
console.log('Agent event v2 and delivery conformance: all vectors passed')
