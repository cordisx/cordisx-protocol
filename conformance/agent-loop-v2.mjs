import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { isDeepStrictEqual } from 'node:util'
import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'
import { resolveAgentDefinitionAvatar } from '../runtime/agent-avatar.v1.js'
import { validateAgentLoopTaskDetailsUrl } from './agent-loop-task-details.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const schemaNames = [
  'ui-common.v1.schema.json',
  'platform-model.v1.schema.json',
  'agent-avatar.v1.schema.json',
  'agent-conversation-shell-common.v1.schema.json',
  'agent-loop-common.v1.schema.json',
  'agent-loop-common.v2.schema.json',
  'agent-loop-task-details-common.v2.schema.json',
  'agent-definition.v1.schema.json',
  'agent-loop-task-binding.v2.schema.json',
  'agent-loop-command.v2.schema.json',
  'agent-loop-result.v2.schema.json',
  'agent-loop-event.v2.schema.json',
  'agent-loop-event-subscription.v2.schema.json',
  'agent-loop-event-page.v2.schema.json',
  'agent-loop-bound-client.v2.schema.json',
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
  binding: schemaValidator('agent-loop-task-binding.v2.schema.json'),
  command: schemaValidator('agent-loop-command.v2.schema.json'),
  result: schemaValidator('agent-loop-result.v2.schema.json'),
  event: schemaValidator('agent-loop-event.v2.schema.json'),
  page: schemaValidator('agent-loop-event-page.v2.schema.json'),
  client: schemaValidator('agent-loop-bound-client.v2.schema.json'),
  detailsUrl: ajv.getSchema(`${schemas.get('agent-loop-task-details-common.v2.schema.json').$id}#/$defs/detailsUrl`),
}

if (validators.detailsUrl === undefined) throw new Error('Agent Loop task details URL schema was not registered')

const errorsOf = validator => (validator.errors ?? []).map(error => `${error.instancePath || '/'} ${error.message}`)
const identityKey = identity => `${identity?.agentId}\u0000${identity?.revision}`
const sameBinding = (left, right) => left?.bindingId === right?.bindingId && left?.generation === right?.generation
const bindingKey = binding => `${binding?.bindingId}\u0000${binding?.generation}`

function validateDefinition(definition) {
  const errors = []
  if (!validators.definition(definition)) return errorsOf(validators.definition)
  const ownKey = identityKey(definition.identity)
  if ((definition.extends ?? []).some(parent => identityKey(parent) === ownKey)) {
    errors.push('definition cannot extend itself')
  }
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
  const promptSections = mergeOrdered(
    parent?.promptSections,
    local.promptSections,
    modes.promptSections,
    value => value.sectionId,
  )
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
    const parentAvatars = []
    for (const parentIdentity of definition.extends ?? []) {
      const parent = resolve(parentIdentity)
      parentAvatars.push(parent.avatar)
      inherited = inherited === undefined ? parent : mergeEffective(inherited, parent, parentMergeModes)
    }
    const effective = {
      ...mergeEffective(inherited, definition, definition.inherit),
      avatar: resolveAgentDefinitionAvatar({
        agentId: definition.identity.agentId,
        inherit: definition.inherit.avatar ?? 'none',
        ...(definition.avatar === undefined ? {} : { avatar: definition.avatar }),
        ...(parentAvatars.length === 0 ? {} : { parentAvatars }),
      }),
    }
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

function detailsUrlErrors(detailsUrl) {
  return validateAgentLoopTaskDetailsUrl(detailsUrl, validators.detailsUrl)
}

function validateExchange(command, result) {
  const errors = [...validateCommand(command)]
  if (!validators.result(result)) errors.push(...errorsOf(validators.result))
  if (errors.length > 0) return errors
  if (result.commandId !== command.commandId || result.type !== command.type) {
    errors.push('result does not correlate to command')
  }
  if (result.authorization.capability !== expectedCapability(command)) {
    errors.push('authorization capability does not match operation')
  }
  if (result.status === 'accepted' && command.type === 'create-or-bind') {
    if (identityKey(result.binding.definition) !== identityKey(command.definition)) {
      errors.push('accepted binding definition does not match leaf definition')
    }
    if (command.target.mode === 'bind' && result.binding.task !== command.target.task) {
      errors.push('accepted binding task does not match bind target')
    }
    errors.push(...detailsUrlErrors(result.detailsUrl))
  }
  if (result.status === 'accepted' && command.type === 'send') {
    if (!sameBinding(result.binding.binding, command.binding.binding) || result.binding.task !== command.binding.task) {
      errors.push('send result binding does not match command binding')
    }
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
    if (previousSequence !== undefined && event.sequence !== previousSequence + 1) {
      errors.push(`event[${index}] sequence is not contiguous`)
    }
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
        else if (pending.kind !== event.approval.kind || pending.turn !== event.turn) {
          errors.push(`approval ${event.approval.approvalId} identity drift`)
        }
        pendingApprovals.delete(event.approval.approvalId)
      }
    }
    if (event.type === 'lifecycle' && event.lifecycle.phase.startsWith('turn.') && event.turn === undefined) {
      errors.push(`event[${index}] turn lifecycle requires turn`)
    }
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
    if (
      page.subscription.subscriptionId !== subscription.subscriptionId
      || !sameBinding(page.subscription.binding, subscription.binding)
    ) errors.push(`page[${index}] subscription drift`)
    cursor ??= page.subscription.afterSequence
    if (page.afterSequence !== cursor) errors.push(`page[${index}] afterSequence does not match cursor`)
    if (live && page.phase !== 'live') errors.push(`page[${index}] replay follows live phase`)
    if (page.phase === 'live') {
      live = true
      if (cursor < subscription.snapshotSequence) {
        errors.push(`page[${index}] live phase begins before snapshot replay completes`)
      }
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
  if (
    errors.length === 0
    && JSON.stringify(resolveCatalog(vector.createCommand)) !== JSON.stringify(vector.resolvedDefinition)
  ) {
    errors.push('resolved definition does not match deterministic field inheritance')
  }
  return errors
}

function validateIdempotency(vector) {
  const errors = []
  const firstByCommandId = new Map()
  let replays = 0
  const semanticResult = result => {
    const copy = structuredClone(result)
    delete copy.delivery
    return copy
  }
  for (let index = 0; index < (vector.exchanges?.length ?? 0); index += 1) {
    const exchange = vector.exchanges[index]
    errors.push(...validateExchange(exchange.command, exchange.result).map(error => `exchange[${index}] ${error}`))
    const first = firstByCommandId.get(exchange.command?.commandId)
    if (first === undefined) {
      firstByCommandId.set(exchange.command?.commandId, exchange)
      if (exchange.result?.status === 'accepted' && exchange.result.delivery?.disposition !== 'executed') {
        errors.push(`exchange[${index}] first accepted delivery is not executed`)
      }
      continue
    }
    replays += 1
    if (!isDeepStrictEqual(exchange.command, first.command)) {
      errors.push(`exchange[${index}] reuses commandId for a different command`)
    }
    if (!isDeepStrictEqual(semanticResult(exchange.result), semanticResult(first.result))) {
      errors.push(`exchange[${index}] idempotent replay changes semantic result`)
    }
    if (exchange.result?.status === 'accepted' && exchange.result.delivery?.disposition !== 'replayed') {
      errors.push(`exchange[${index}] duplicate accepted delivery is not replayed`)
    }
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
    if (subscriptionIds.has(subscription?.subscriptionId)) {
      errors.push(`stream[${index}] subscriptionId is not distinct`)
    }
    subscriptionIds.add(subscription?.subscriptionId)
  }
  if (bindingKeys.size < 2) errors.push('fan-out case requires at least two bindings')
  if (streamBindings.size !== bindingKeys.size) {
    errors.push('fan-out bindings and subscription streams are not one-to-one')
  }
  return errors
}

function materializeDetailsUrl(entry) {
  if (entry.value !== undefined) return entry.value
  const { prefix, fill, length } = entry.construct
  return { url: prefix + fill.repeat(length - prefix.length), target: entry.target }
}

function validateTaskDetailsUrls(vector) {
  const errors = []
  for (let index = 0; index < (vector.accepted ?? []).length; index += 1) {
    const urlErrors = detailsUrlErrors(materializeDetailsUrl(vector.accepted[index]))
    if (urlErrors.length > 0) errors.push(`accepted[${index}] rejected: ${urlErrors.join('; ')}`)
  }
  for (let index = 0; index < (vector.rejected ?? []).length; index += 1) {
    if (detailsUrlErrors(materializeDetailsUrl(vector.rejected[index])).length === 0) {
      errors.push(`rejected[${index}] was accepted`)
    }
  }
  return errors
}

function lifecycleResult(step) {
  const detailsUnavailable = step.status === 'unavailable' && step.code === 'details-unavailable'
  const authorization = {
    capability: step.capability,
    state: step.status === 'accepted' || detailsUnavailable ? 'allowed' : step.status,
    code: step.status === 'accepted' || detailsUnavailable ? 'allowed' : step.code,
  }
  return {
    $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/agent-loop-result.v2.schema.json',
    contract: 'cordisx.agent-loop-result/v2',
    schemaVersion: 2,
    commandId: step.commandId,
    type: 'create-or-bind',
    status: step.status,
    authorization,
    ...(detailsUnavailable ? { code: 'details-unavailable' } : {}),
    ...(step.status !== 'accepted' ? {} : {
      binding: {
        $schema:
          'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/agent-loop-task-binding.v2.schema.json',
        contract: 'cordisx.agent-loop-task-binding/v2',
        schemaVersion: 2,
        binding: step.binding,
        definition: { agentId: 'details-agent', revision: 'definition-1' },
        task: step.task,
        state: 'active',
      },
      detailsUrl: step.detailsUrl,
      delivery: { disposition: 'executed' },
    }),
  }
}

function validateTaskDetailsLifecycle(vector) {
  const errors = []
  // This is an active provider association, not Chatroom's durable run history.
  // Closing a binding removes active authority without requiring history to drop its persisted URL.
  const activeAssociations = new Map()
  const keyOf = (clientId, binding) => `${clientId}\u0000${binding.bindingId}`
  for (let index = 0; index < (vector.steps ?? []).length; index += 1) {
    const source = vector.steps[index]
    const presentation = source.presentation === undefined ? {} : vector.presentations?.[source.presentation]
    if (presentation === undefined) {
      errors.push(`step[${index}] references an unknown presentation`)
      continue
    }
    const step = { ...presentation, ...source }
    const prefix = `step[${index}]`
    if (step.action === 'attempt') {
      const result = lifecycleResult(step)
      if (!validators.result(result)) errors.push(...errorsOf(validators.result).map(error => `${prefix} ${error}`))
      const operationCapability = step.operation === 'create' ? 'tasks.create' : 'tasks.content.read'
      if (step.status === 'accepted' && step.capability !== operationCapability) {
        errors.push(`${prefix} accepted result has a forged capability`)
      }
      if (step.status === 'accepted') {
        const urlErrors = detailsUrlErrors(step.detailsUrl)
        errors.push(...urlErrors.map(error => `${prefix} ${error}`))
        const key = keyOf(step.clientId, step.binding)
        const previous = activeAssociations.get(key)
        if (previous !== undefined && step.binding.generation <= previous.binding.generation) {
          errors.push(`${prefix} accepted generation is not newer`)
        }
        activeAssociations.set(key, {
          clientId: step.clientId,
          providerId: step.providerId,
          providerGeneration: step.providerGeneration,
          binding: step.binding,
          task: step.task,
          detailsUrl: step.detailsUrl,
        })
      } else if (step.reason === 'stale') {
        const current = activeAssociations.get(keyOf(step.clientId, step.targetBinding))
        if (current === undefined || step.targetBinding.generation > current.binding.generation) {
          errors.push(`${prefix} stale attempt is not fenced by a current generation`)
        }
      } else if (step.reason === 'cross-client') {
        const own = activeAssociations.get(keyOf(step.clientId, step.targetBinding))
        const foreign = [...activeAssociations.values()].find(value =>
          value.clientId !== step.clientId && value.binding.bindingId === step.targetBinding.bindingId
        )
        if (own !== undefined || foreign === undefined) errors.push(`${prefix} cross-client attempt is not isolated`)
      } else if (step.reason === 'cross-binding') {
        const target = activeAssociations.get(keyOf(step.clientId, step.targetBinding))
        const claimed = activeAssociations.get(keyOf(step.clientId, step.claimedBinding))
        if (target === undefined || claimed === undefined || target.binding.bindingId === claimed.binding.bindingId) {
          errors.push(`${prefix} cross-binding attempt is not isolated`)
        }
      } else if (step.reason === 'forged-capability') {
        if (step.capability === operationCapability) {
          errors.push(`${prefix} forged capability attempt is not mismatched`)
        }
      } else if (step.reason === 'closed') {
        if (activeAssociations.has(keyOf(step.clientId, step.targetBinding))) {
          errors.push(`${prefix} closed binding retained active provider authority`)
        }
      }
    } else if (step.action === 'provider-replaced') {
      for (const [key, value] of activeAssociations) {
        if (value.providerId === step.providerId && value.providerGeneration < step.providerGeneration) {
          activeAssociations.delete(key)
        }
      }
    } else if (step.action === 'provider-disabled' || step.action === 'provider-uninstalled') {
      for (const [key, value] of activeAssociations) {
        if (value.providerId === step.providerId) activeAssociations.delete(key)
      }
    } else if (step.action === 'binding-closed') {
      activeAssociations.delete(keyOf(step.clientId, step.binding))
    } else if (step.action === 'client-disposed') {
      for (const [key, value] of activeAssociations) {
        if (value.clientId === step.clientId) activeAssociations.delete(key)
      }
    } else {
      errors.push(`${prefix} unknown lifecycle action`)
    }
    const actual = [...activeAssociations.values()].sort((left, right) =>
      keyOf(left.clientId, left.binding).localeCompare(keyOf(right.clientId, right.binding))
    )
    const expected = (step.expectedActiveAssociations ?? []).map(name => vector.presentations?.[name])
    if (expected.some(value => value === undefined)) {
      errors.push(`${prefix} expectedActiveAssociations references an unknown presentation`)
    }
    const sortedExpected = expected.filter(value => value !== undefined).sort((left, right) =>
      keyOf(left.clientId, left.binding).localeCompare(keyOf(right.clientId, right.binding))
    )
    if (!isDeepStrictEqual(actual, sortedExpected)) {
      errors.push(`${prefix} active provider association does not match expected atomic transition`)
    }
  }
  return errors
}

function durableCommand(vector, name) {
  const source = vector.commands?.[name]
  const base = {
    $schema: schemas.get('agent-loop-command.v2.schema.json').$id,
    contract: 'cordisx.agent-loop-command/v2',
    schemaVersion: 2,
    commandId: source.commandId,
    type: source.type,
  }
  if (source.type === 'create-or-bind') {
    return {
      ...base,
      definition: vector.definition.identity,
      definitions: [vector.definition],
      target: source.target,
    }
  }
  return {
    ...base,
    binding: vector.bindings[source.binding],
    content: [{ kind: 'text', text: source.text }],
  }
}

function durableResult(vector, command, expected) {
  const capability = command.type === 'send'
    ? 'turns.submit'
    : command.target.mode === 'create'
    ? 'tasks.create'
    : 'tasks.content.read'
  const base = {
    $schema: schemas.get('agent-loop-result.v2.schema.json').$id,
    contract: 'cordisx.agent-loop-result/v2',
    schemaVersion: 2,
    commandId: command.commandId,
    type: command.type,
    status: expected.status,
    authorization: { capability, state: 'allowed', code: 'allowed' },
  }
  if (expected.status === 'unavailable') return { ...base, code: expected.code }
  if (command.type === 'create-or-bind') {
    return {
      ...base,
      binding: vector.bindings[expected.binding],
      detailsUrl: expected.detailsUrl,
      delivery: { disposition: expected.disposition },
    }
  }
  return {
    ...base,
    binding: vector.bindings[expected.binding],
    messageId: expected.messageId,
    turn: expected.turn,
    delivery: { disposition: expected.disposition },
  }
}

function resultWithoutDelivery(result) {
  const value = structuredClone(result)
  delete value.delivery
  return value
}

function validateDurableDelivery(vector) {
  const errors = []
  const ledger = new Map()
  const expiryMarkers = new Map()
  const providerAffinity = new Map()
  const providerGenerations = new Map()
  const concurrent = new Map()
  const day = 24 * 60 * 60 * 1000
  const ledgerKey = (step, command) => `${step.ownerId}\u0000${step.providerId}\u0000${command.commandId}`
  const affinityKey = (step, command) => `${step.ownerId}\u0000${command.commandId}`
  const prefix = index => `step[${index}]`

  errors.push(...validateDefinition(vector.definition).map(error => `definition ${error}`))
  for (const [name, binding] of Object.entries(vector.bindings ?? {})) {
    if (!validators.binding(binding)) {
      errors.push(...errorsOf(validators.binding).map(error => `binding ${name} ${error}`))
    }
  }

  for (let index = 0; index < (vector.steps ?? []).length; index += 1) {
    const step = vector.steps[index]
    const label = prefix(index)
    if (step.action === 'dispose-client') {
      if (ledger.size !== step.expectedLedgerSize) errors.push(`${label} client disposal changed durable ledger size`)
      continue
    }
    if (step.action === 'close-task') {
      for (const record of ledger.values()) {
        if (record.logicalTaskId === step.logicalTaskId) {
          record.logicalTaskState = 'closed'
          record.closedAt = step.now
        }
      }
      continue
    }
    if (step.action === 'replace-provider') {
      const current = providerGenerations.get(step.providerId) ?? 0
      if (step.providerGeneration <= current) errors.push(`${label} replacement generation is not newer`)
      providerGenerations.set(step.providerId, step.providerGeneration)
      continue
    }
    if (step.action === 'retain-ambiguous-operation') {
      const command = durableCommand(vector, step.command)
      errors.push(...validateCommand(command).map(error => `${label} ${error}`))
      const key = ledgerKey(step, command)
      const affinity = affinityKey(step, command)
      if (ledger.has(key) || expiryMarkers.has(key)) errors.push(`${label} duplicate private retention record`)
      const markerLifetime = Date.parse(step.markerExpiresAt) - Date.parse(step.now)
      if (markerLifetime <= 30 * day || markerLifetime > 32 * day) {
        errors.push(`${label} compact expiry marker must be bounded to more than 30 and at most 32 days`)
      }
      expiryMarkers.set(key, { firstObservedAt: step.now, markerExpiresAt: step.markerExpiresAt })
      providerAffinity.set(affinity, step.providerId)
      if (!providerGenerations.has(step.providerId)) providerGenerations.set(step.providerId, step.providerGeneration)
      continue
    }
    if (step.action !== 'attempt') {
      errors.push(`${label} unknown durable action`)
      continue
    }

    const command = durableCommand(vector, step.command)
    const result = durableResult(vector, command, step.result)
    errors.push(...validateExchange(command, result).map(error => `${label} ${error}`))
    const currentGeneration = providerGenerations.get(step.providerId)
    if (currentGeneration === undefined) providerGenerations.set(step.providerId, step.providerGeneration)
    const activeGeneration = providerGenerations.get(step.providerId)
    const key = ledgerKey(step, command)
    const record = ledger.get(key)
    const expiryMarker = expiryMarkers.get(key)
    const affinity = providerAffinity.get(affinityKey(step, command))
    if (affinity === undefined) providerAffinity.set(affinityKey(step, command), step.providerId)
    const now = Date.parse(step.now)
    const expiredWithoutBinding = record === undefined && expiryMarker !== undefined
      && now - Date.parse(expiryMarker.firstObservedAt) > 30 * day
      && now <= Date.parse(expiryMarker.markerExpiresAt)
    const expiredRecovery = record !== undefined && record.logicalTaskState !== 'active'
      && record.closedAt !== undefined && now - Date.parse(record.closedAt) > 30 * day
    let expectedCode
    let expectedDisposition

    if (affinity !== undefined && affinity !== step.providerId) expectedCode = 'provider-replaced'
    else if (
      record !== undefined && record.providerGeneration !== step.providerGeneration && step.reconcileAvailable === true
      && isDeepStrictEqual(record.command, command) && !expiredRecovery
    ) expectedDisposition = 'reconciled'
    else if (
      activeGeneration !== step.providerGeneration
      || (record !== undefined && record.providerGeneration !== step.providerGeneration)
    ) expectedCode = 'provider-replaced'
    else if (expiredWithoutBinding || expiredRecovery) expectedCode = 'operation-expired'
    else if (record !== undefined && !isDeepStrictEqual(record.command, command)) expectedCode = 'operation-conflict'
    else if (record !== undefined && record.clientId !== step.clientId && command.type === 'create-or-bind') {
      expectedDisposition = 'reconciled'
    } else if (record !== undefined) expectedDisposition = 'replayed'
    else if (step.crashWindow === 'after-execution-before-result-persisted' && step.reconcileAvailable === false) {
      expectedCode = 'reconciliation-required'
    } else {expectedDisposition = step.crashWindow === 'after-execution-before-result-persisted'
        ? 'reconciled'
        : 'executed'}

    if (expectedCode !== undefined) {
      if (result.status !== 'unavailable' || result.code !== expectedCode) {
        errors.push(`${label} must fail closed with ${expectedCode}`)
      }
      if (step.newExecutionCount !== 0) errors.push(`${label} fenced or expired operation executed`)
      if (expectedCode === 'reconciliation-required' && step.priorExecutionCount !== 'unknown') {
        errors.push(`${label} unknown delivery did not preserve an unknown prior execution count`)
      }
    } else {
      if (result.status !== 'accepted' || result.delivery.disposition !== expectedDisposition) {
        errors.push(`${label} delivery disposition is not ${expectedDisposition}`)
      }
      if (record === undefined) {
        const logicalTaskId = step.logicalTaskId
          ?? (command.type === 'send' ? command.binding.task : result.binding.task)
        const stored = {
          command,
          result: resultWithoutDelivery(result),
          providerGeneration: step.providerGeneration,
          clientId: step.clientId,
          logicalTaskId,
          logicalTaskState: step.logicalTaskState ?? 'active',
          firstObservedAt: step.now,
          closedAt: step.closedAt,
        }
        ledger.set(key, stored)
        const expectedNewExecutions = result.delivery.disposition === 'reconciled' ? 0 : 1
        if (step.newExecutionCount !== expectedNewExecutions) {
          errors.push(`${label} first delivery new execution count is not ${expectedNewExecutions}`)
        }
        if (result.delivery.disposition === 'reconciled') {
          if (command.type !== 'create-or-bind' || step.crashWindow !== 'after-execution-before-result-persisted') {
            errors.push(`${label} reconciliation does not correspond to the execution-before-persist crash window`)
          }
          if (step.priorExecutionCount !== 1) {
            errors.push(`${label} reconciliation does not account for the prior crash-window execution`)
          }
          if (
            !sameBinding(result.binding.binding, vector.bindings[step.currentBinding]?.binding)
            || !isDeepStrictEqual(result.detailsUrl, step.currentDetailsUrl) || result.binding.task !== logicalTaskId
          ) errors.push(`${label} reconciliation did not recover the current logical task binding and details URL`)
        }
      } else {
        if (expectedDisposition === 'reconciled' && command.type === 'create-or-bind') {
          if (
            !sameBinding(result.binding.binding, vector.bindings[step.currentBinding]?.binding)
            || !isDeepStrictEqual(result.detailsUrl, step.currentDetailsUrl)
            || result.binding.task !== record.logicalTaskId
          ) {
            errors.push(
              `${label} cross-client reconciliation did not return the current logical task binding and details URL`,
            )
          }
          record.result = resultWithoutDelivery(result)
        } else if (expectedDisposition === 'reconciled' && command.type === 'send') {
          if (result.messageId !== record.result.messageId || result.turn !== record.result.turn) {
            errors.push(`${label} send reconciliation changed messageId or turn`)
          }
        } else if (!isDeepStrictEqual(resultWithoutDelivery(result), record.result)) {
          errors.push(`${label} replay changed the durable semantic result`)
        }
        if (expectedDisposition === 'reconciled') record.providerGeneration = step.providerGeneration
        record.clientId = step.clientId
        if (step.newExecutionCount !== 0) errors.push(`${label} replay re-executed the provider operation`)
      }
    }

    if (
      step.crashWindow === 'after-result-persisted-before-response'
      && (result.status !== 'accepted' || step.responseDelivered !== false)
    ) errors.push(`${label} result-persist crash window is not represented exactly`)
    if (step.concurrentGroup !== undefined) {
      const group = concurrent.get(step.concurrentGroup) ?? []
      group.push({ command, result, newExecutionCount: step.newExecutionCount })
      concurrent.set(step.concurrentGroup, group)
    }
    for (let eventIndex = 0; eventIndex < (step.events ?? []).length; eventIndex += 1) {
      const event = step.events[eventIndex]
      if (!validators.event(event)) {
        errors.push(...errorsOf(validators.event).map(error => `${label} event[${eventIndex}] ${error}`))
      }
      if (event.causation?.operationId !== command.commandId) {
        errors.push(`${label} event[${eventIndex}] causation does not equal commandId`)
      }
      if (
        command.type === 'send' && event.type === 'message'
        && (event.message.messageId !== result.messageId || event.turn !== result.turn)
      ) errors.push(`${label} send event does not preserve accepted messageId and turn`)
    }
    if (
      record !== undefined && expectedDisposition !== undefined && expectedDisposition !== 'executed'
      && (step.events?.length ?? 0) !== 0
    ) errors.push(`${label} replay or reconciliation emitted duplicate events`)
  }

  for (const [name, attempts] of concurrent) {
    if (attempts.length < 2) errors.push(`concurrent group ${name} needs at least two attempts`)
    if (attempts.reduce((sum, value) => sum + value.newExecutionCount, 0) !== 1) {
      errors.push(`concurrent group ${name} executed more than once`)
    }
    if (!attempts.every(value => isDeepStrictEqual(value.command, attempts[0].command))) {
      errors.push(`concurrent group ${name} payloads are not structural-exact`)
    }
    const dispositions = attempts.map(value => value.result.delivery?.disposition).sort()
    if (!isDeepStrictEqual(dispositions, ['executed', 'replayed'])) {
      errors.push(`concurrent group ${name} does not contain executed plus replayed delivery`)
    }
  }
  return errors
}

const caseValidators = {
  complete: validateComplete,
  idempotency: validateIdempotency,
  'fan-out': validateFanOut,
  'task-details-urls': validateTaskDetailsUrls,
  'task-details-lifecycle': validateTaskDetailsLifecycle,
  'durable-delivery': validateDurableDelivery,
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
  for (const file of await jsonFiles(path.join(root, 'test-vectors', 'agent-loop-v2', outcome))) {
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
  if (Array.isArray(value)) { for (const item of value) collectKeys(item, keys) }
  else if (value !== null && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      keys.add(key.toLowerCase())
      collectKeys(child, keys)
    }
  }
  return keys
}

const publicKeys = collectKeys(
  [...schemas.entries()].filter(([name]) =>
    (name.startsWith('agent-loop-') && name.endsWith('.v2.schema.json')
      && name !== 'agent-loop-task-details-common.v2.schema.json') || name === 'agent-definition.v1.schema.json'
  ).map(([, schema]) => schema),
)
for (
  const forbidden of [
    'room',
    'roomid',
    'cwd',
    'path',
    'url',
    'base64',
    'rawbridge',
    'callback',
    'dom',
    'html',
    'secret',
    'credential',
  ]
) {
  if (publicKeys.has(forbidden)) {
    console.error(`Agent Loop contracts must not expose ${forbidden}`)
    failures += 1
  }
}

const taskDetailsKeys = collectKeys(schemas.get('agent-loop-task-details-common.v2.schema.json'))
for (
  const forbidden of [
    'room',
    'roomid',
    'clientid',
    'provider',
    'providerid',
    'providergeneration',
    'task',
    'taskid',
    'run',
    'runid',
    'binding',
    'bindingid',
    'generation',
    'reference',
    'summary',
    'presentation',
    'capability',
    'body',
    'content',
    'prompt',
    'cli',
    'trace',
    'route',
    'path',
    'token',
    'navigate',
    'navigation',
    'history',
    'open',
  ]
) {
  if (taskDetailsKeys.has(forbidden)) {
    console.error(`Agent Loop task details contracts must not expose ${forbidden}`)
    failures += 1
  }
}

if (failures > 0) throw new Error(`${failures} Agent Loop v2 conformance case(s) failed`)
console.log('Agent Loop v2 conformance: all vectors passed')
