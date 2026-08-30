import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { isDeepStrictEqual } from 'node:util'
import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const schemaNames = [
  'ui-common.v1.schema.json',
  'platform-model.v1.schema.json',
  'agent-conversation-shell-common.v1.schema.json',
  'agent-loop-common.v1.schema.json',
  'agent-definition.v1.schema.json',
  'agent-loop-task-binding.v1.schema.json',
  'agent-loop-command.v1.schema.json',
  'agent-loop-result.v1.schema.json',
  'agent-loop-event.v1.schema.json',
  'agent-loop-event-subscription.v1.schema.json',
  'agent-loop-event-page.v1.schema.json',
  'agent-loop-bound-client.v1.schema.json',
]
const schemas = new Map()
for (const name of schemaNames) schemas.set(name, JSON.parse(await readFile(path.join(root, 'schemas', name), 'utf8')))

const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true })
addFormats(ajv)
for (const schema of schemas.values()) ajv.addSchema(schema)

function schemaValidator(name) {
  const validator = ajv.getSchema(schemas.get(name).$id)
  if (validator === undefined) throw new Error(`${name} was not registered`)
  return validator
}

const validators = {
  definition: schemaValidator('agent-definition.v1.schema.json'),
  binding: schemaValidator('agent-loop-task-binding.v1.schema.json'),
  command: schemaValidator('agent-loop-command.v1.schema.json'),
  result: schemaValidator('agent-loop-result.v1.schema.json'),
  event: schemaValidator('agent-loop-event.v1.schema.json'),
  page: schemaValidator('agent-loop-event-page.v1.schema.json'),
  client: schemaValidator('agent-loop-bound-client.v1.schema.json'),
}

const errorsOf = validator => (validator.errors ?? []).map(error => `${error.instancePath || '/'} ${error.message}`)
const identityKey = identity => `${identity?.agentId}\u0000${identity?.revision}`
const sameBinding = (left, right) => left?.bindingId === right?.bindingId && left?.generation === right?.generation
const bindingKey = binding => `${binding?.bindingId}\u0000${binding?.generation}`

function validateDefinition(definition) {
  const errors = []
  if (!validators.definition(definition)) return errorsOf(validators.definition)
  const ownKey = identityKey(definition.identity)
  if ((definition.extends ?? []).some(parent => identityKey(parent) === ownKey)) errors.push('definition cannot extend itself')
  const sectionIds = new Set()
  for (const section of definition.promptSections ?? []) {
    if (sectionIds.has(section.sectionId)) errors.push(`duplicate prompt section ${section.sectionId}`)
    sectionIds.add(section.sectionId)
  }
  return errors
}

function validateCatalog(command) {
  const errors = []
  const definitions = command.definitions ?? []
  const byIdentity = new Map()
  for (const definition of definitions) {
    errors.push(...validateDefinition(definition))
    const key = identityKey(definition.identity)
    if (byIdentity.has(key)) errors.push(`duplicate definition identity ${key}`)
    byIdentity.set(key, definition)
  }

  const leafKey = identityKey(command.definition)
  if (!byIdentity.has(leafKey)) errors.push('leaf definition is absent from definitions catalog')
  const visiting = new Set()
  const visited = new Set()
  function visit(key) {
    if (visiting.has(key)) {
      errors.push(`definition inheritance cycle at ${key}`)
      return
    }
    if (visited.has(key)) return
    const definition = byIdentity.get(key)
    if (definition === undefined) {
      errors.push(`missing ancestor definition ${key}`)
      return
    }
    visiting.add(key)
    for (const parent of definition.extends ?? []) visit(identityKey(parent))
    visiting.delete(key)
    visited.add(key)
  }
  visit(leafKey)
  for (const key of byIdentity.keys()) if (!visited.has(key)) errors.push(`unused definition ${key}`)
  return errors
}

const parentMergeModes = {
  promptSections: 'merge',
  rules: 'merge',
  skills: 'merge',
  tools: 'merge',
  mcpServers: 'merge',
  runtimeDefaults: 'merge',
}

function unique(values) {
  return [...new Set(values ?? [])]
}

function mergeOrdered(parent, local, mode, keyOf) {
  if (mode === 'none') return local ?? []
  if (mode === 'replace') return local ?? parent ?? []
  if (mode === 'append') return [...(parent ?? []), ...(local ?? [])]
  if (mode === 'prepend') return [...(local ?? []), ...(parent ?? [])]
  const result = [...(parent ?? [])]
  for (const value of local ?? []) {
    const index = result.findIndex(item => keyOf(item) === keyOf(value))
    if (index === -1) result.push(value)
    else result[index] = value
  }
  return result
}

function mergeFilter(parent, local, mode) {
  if (mode === 'none') return local
  if (mode === 'replace') return local ?? parent
  if (parent === undefined) return local
  if (local === undefined) return parent
  const include = unique([...(parent.include ?? []), ...(local.include ?? [])])
  const exclude = unique([...(parent.exclude ?? []), ...(local.exclude ?? [])])
  return {
    ...(include.length > 0 ? { include } : {}),
    ...(exclude.length > 0 ? { exclude } : {}),
  }
}

function mergeRuntime(parent, local, mode) {
  if (mode === 'none') return local
  if (mode === 'replace') return local ?? parent
  if (parent === undefined) return local
  if (local === undefined) return parent
  return { ...parent, ...local }
}

function mergeEffective(parent, local, modes) {
  const promptSections = mergeOrdered(parent?.promptSections, local.promptSections, modes.promptSections, value => value.sectionId)
  const rules = mergeOrdered(parent?.rules, local.rules, modes.rules, value => value)
  const skills = mergeOrdered(parent?.skills, local.skills, modes.skills, value => value)
  const tools = mergeFilter(parent?.tools, local.tools, modes.tools)
  const mcpServers = mergeFilter(parent?.mcpServers, local.mcpServers, modes.mcpServers)
  const runtimeDefaults = mergeRuntime(parent?.runtimeDefaults, local.runtimeDefaults, modes.runtimeDefaults)
  return {
    identity: local.identity,
    ...(promptSections.length > 0 ? { promptSections } : {}),
    ...(rules.length > 0 ? { rules } : {}),
    ...(skills.length > 0 ? { skills } : {}),
    ...(tools === undefined ? {} : { tools }),
    ...(mcpServers === undefined ? {} : { mcpServers }),
    ...(runtimeDefaults === undefined ? {} : { runtimeDefaults }),
  }
}

function resolveCatalog(command) {
  const byIdentity = new Map(command.definitions.map(definition => [identityKey(definition.identity), definition]))
  const cache = new Map()
  function resolve(identity) {
    const key = identityKey(identity)
    if (cache.has(key)) return cache.get(key)
    const definition = byIdentity.get(key)
    let inherited
    for (const parentIdentity of definition.extends ?? []) {
      const parent = resolve(parentIdentity)
      inherited = inherited === undefined ? parent : mergeEffective(inherited, parent, parentMergeModes)
    }
    const effective = mergeEffective(inherited, definition, definition.inherit)
    cache.set(key, effective)
    return effective
  }
  return resolve(command.definition)
}

function validateCommand(command) {
  if (!validators.command(command)) return errorsOf(validators.command)
  if (command.type === 'create-or-bind') return validateCatalog(command)
  return command.binding.state === 'active' ? [] : ['send requires an active binding']
}

function expectedCapability(command) {
  if (command.type === 'send') return 'turns.submit'
  return command.target.mode === 'create' ? 'tasks.create' : 'tasks.content.read'
}

function validateExchange(command, result) {
  const errors = [...validateCommand(command)]
  if (!validators.result(result)) errors.push(...errorsOf(validators.result))
  if (errors.length > 0) return errors
  if (result.commandId !== command.commandId || result.type !== command.type) errors.push('result does not correlate to command')
  if (result.authorization.capability !== expectedCapability(command)) errors.push('authorization capability does not match operation')
  if (result.status === 'accepted' && command.type === 'create-or-bind') {
    if (identityKey(result.binding.definition) !== identityKey(command.definition)) errors.push('accepted binding definition does not match leaf definition')
    if (command.target.mode === 'bind' && result.binding.task !== command.target.task) errors.push('accepted binding task does not match bind target')
  }
  if (result.status === 'accepted' && command.type === 'send') {
    if (!sameBinding(result.binding.binding, command.binding.binding) || result.binding.task !== command.binding.task) errors.push('send result binding does not match command binding')
  }
  return errors
}

function validateEvents(events, expectedBinding) {
  const errors = []
  const eventIds = new Set()
  const pendingApprovals = new Map()
  let binding
  let closed = false
  let previousSequence
  for (let index = 0; index < (events?.length ?? 0); index += 1) {
    const event = events[index]
    if (!validators.event(event)) {
      errors.push(...errorsOf(validators.event).map(error => `event[${index}] ${error}`))
      continue
    }
    binding ??= event.binding
    if (!sameBinding(event.binding, expectedBinding ?? binding)) errors.push(`event[${index}] binding drift`)
    if (previousSequence !== undefined && event.sequence !== previousSequence + 1) errors.push(`event[${index}] sequence is not contiguous`)
    previousSequence = event.sequence
    if (eventIds.has(event.eventId)) errors.push(`duplicate event id ${event.eventId}`)
    eventIds.add(event.eventId)
    if (closed) errors.push(`event[${index}] follows binding.closed`)
    if (event.type === 'approval') {
      const pending = pendingApprovals.get(event.approval.approvalId)
      if (event.approval.state === 'pending') {
        if (pending !== undefined) errors.push(`approval ${event.approval.approvalId} is already pending`)
        pendingApprovals.set(event.approval.approvalId, { kind: event.approval.kind, turn: event.turn })
      } else {
        if (pending === undefined) errors.push(`approval ${event.approval.approvalId} resolved without pending`)
        else if (pending.kind !== event.approval.kind || pending.turn !== event.turn) errors.push(`approval ${event.approval.approvalId} identity drift`)
        pendingApprovals.delete(event.approval.approvalId)
      }
    }
    if (event.type === 'lifecycle' && event.lifecycle.phase.startsWith('turn.') && event.turn === undefined) errors.push(`event[${index}] turn lifecycle requires turn`)
    if (event.type === 'lifecycle' && event.lifecycle.phase === 'binding.closed') closed = true
  }
  return errors
}

function validatePages(pages) {
  const errors = []
  const events = []
  let cursor
  let subscription
  let live = false
  for (let index = 0; index < (pages?.length ?? 0); index += 1) {
    const page = pages[index]
    if (!validators.page(page)) {
      errors.push(...errorsOf(validators.page).map(error => `page[${index}] ${error}`))
      continue
    }
    subscription ??= page.subscription
    if (page.subscription.subscriptionId !== subscription.subscriptionId || !sameBinding(page.subscription.binding, subscription.binding)) errors.push(`page[${index}] subscription drift`)
    cursor ??= page.subscription.afterSequence
    if (page.afterSequence !== cursor) errors.push(`page[${index}] afterSequence does not match cursor`)
    if (live && page.phase !== 'live') errors.push(`page[${index}] replay follows live phase`)
    if (page.phase === 'live') {
      live = true
      if (cursor < subscription.snapshotSequence) errors.push(`page[${index}] live phase begins before snapshot replay completes`)
    }
    for (const event of page.events) {
      if (event.sequence !== cursor + 1) errors.push(`page[${index}] event sequence does not advance cursor`)
      cursor = event.sequence
      events.push(event)
    }
    if (page.nextAfterSequence !== cursor) errors.push(`page[${index}] nextAfterSequence does not match events`)
  }
  errors.push(...validateEvents(events, subscription?.binding))
  return errors
}

function validateComplete(vector) {
  const errors = [
    ...(validators.client(vector.client) ? [] : errorsOf(validators.client)),
    ...validateDefinition(vector.definition),
    ...validateExchange(vector.createCommand, vector.createResult),
    ...(validators.binding(vector.binding) ? [] : errorsOf(validators.binding)),
    ...validateExchange(vector.sendCommand, vector.sendResult),
    ...validatePages(vector.pages),
  ]
  if (errors.length === 0 && JSON.stringify(resolveCatalog(vector.createCommand)) !== JSON.stringify(vector.resolvedDefinition)) {
    errors.push('resolved definition does not match deterministic field inheritance')
  }
  return errors
}

function validateIdempotency(vector) {
  const errors = []
  const firstByCommandId = new Map()
  let replays = 0
  for (let index = 0; index < (vector.exchanges?.length ?? 0); index += 1) {
    const exchange = vector.exchanges[index]
    errors.push(...validateExchange(exchange.command, exchange.result).map(error => `exchange[${index}] ${error}`))
    const first = firstByCommandId.get(exchange.command?.commandId)
    if (first === undefined) {
      firstByCommandId.set(exchange.command?.commandId, exchange)
      continue
    }
    replays += 1
    if (!isDeepStrictEqual(exchange.command, first.command)) errors.push(`exchange[${index}] reuses commandId for a different command`)
    if (!isDeepStrictEqual(exchange.result, first.result)) errors.push(`exchange[${index}] idempotent replay changes result`)
  }
  if (replays === 0) errors.push('idempotency case requires at least one replay')
  return errors
}

function validateFanOut(vector) {
  const errors = []
  const commandIds = new Set()
  const bindingKeys = new Set()
  const streamBindings = new Set()
  const subscriptionIds = new Set()
  for (let index = 0; index < (vector.exchanges?.length ?? 0); index += 1) {
    const exchange = vector.exchanges[index]
    errors.push(...validateExchange(exchange.command, exchange.result).map(error => `exchange[${index}] ${error}`))
    if (exchange.command?.type !== 'send') errors.push(`exchange[${index}] fan-out operation must be send`)
    if (commandIds.has(exchange.command?.commandId)) errors.push(`exchange[${index}] fan-out commandId is not distinct`)
    commandIds.add(exchange.command?.commandId)
    const key = bindingKey(exchange.command?.binding?.binding)
    if (bindingKeys.has(key)) errors.push(`exchange[${index}] fan-out binding is not distinct`)
    bindingKeys.add(key)
  }
  for (let index = 0; index < (vector.streams?.length ?? 0); index += 1) {
    const pages = vector.streams[index]?.pages
    errors.push(...validatePages(pages).map(error => `stream[${index}] ${error}`))
    const subscription = pages?.[0]?.subscription
    const key = bindingKey(subscription?.binding)
    if (!bindingKeys.has(key)) errors.push(`stream[${index}] does not match a fan-out binding`)
    if (streamBindings.has(key)) errors.push(`stream[${index}] duplicates a binding stream`)
    streamBindings.add(key)
    if (subscriptionIds.has(subscription?.subscriptionId)) errors.push(`stream[${index}] subscriptionId is not distinct`)
    subscriptionIds.add(subscription?.subscriptionId)
  }
  if (bindingKeys.size < 2) errors.push('fan-out case requires at least two bindings')
  if (streamBindings.size !== bindingKeys.size) errors.push('fan-out bindings and subscription streams are not one-to-one')
  return errors
}

const caseValidators = {
  complete: validateComplete,
  idempotency: validateIdempotency,
  'fan-out': validateFanOut,
  definition: vector => validateDefinition(vector.value),
  binding: vector => validators.binding(vector.value) ? [] : errorsOf(validators.binding),
  command: vector => validateCommand(vector.value),
  exchange: vector => validateExchange(vector.command, vector.result),
  events: vector => validateEvents(vector.events),
}

async function jsonFiles(directory) {
  return (await readdir(directory, { withFileTypes: true }))
    .filter(entry => entry.isFile() && entry.name.endsWith('.json'))
    .map(entry => path.join(directory, entry.name))
    .sort()
}

let failures = 0
for (const outcome of ['valid', 'invalid']) {
  for (const file of await jsonFiles(path.join(root, 'test-vectors', 'agent-loop', outcome))) {
    const vector = JSON.parse(await readFile(file, 'utf8'))
    const validate = caseValidators[vector.case]
    const errors = validate === undefined ? [`unknown vector case: ${String(vector.case)}`] : validate(vector)
    if ((errors.length === 0) !== (outcome === 'valid')) {
      console.error(`${path.relative(root, file)} should be ${outcome}`, errors)
      failures += 1
    }
  }
}

function collectKeys(value, keys = new Set()) {
  if (Array.isArray(value)) for (const item of value) collectKeys(item, keys)
  else if (value !== null && typeof value === 'object') for (const [key, child] of Object.entries(value)) {
    keys.add(key.toLowerCase())
    collectKeys(child, keys)
  }
  return keys
}

const publicKeys = collectKeys([...schemas.entries()].filter(([name]) => name.startsWith('agent-loop') || name === 'agent-definition.v1.schema.json').map(([, schema]) => schema))
for (const forbidden of ['room', 'roomid', 'cwd', 'path', 'url', 'base64', 'rawbridge', 'callback', 'dom', 'html', 'secret', 'credential']) {
  if (publicKeys.has(forbidden)) {
    console.error(`Agent Loop contracts must not expose ${forbidden}`)
    failures += 1
  }
}

if (failures > 0) throw new Error(`${failures} Agent Loop conformance case(s) failed`)
console.log('Agent Loop conformance: all vectors passed')
