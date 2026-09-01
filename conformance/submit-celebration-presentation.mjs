import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { validateExtensionPointControlSuite } from './extension-point-control.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const validPath = path.join(root, 'test-vectors/extension-point-control/valid/submit-celebration.json')
const profileId = 'cordisx.composer-submit-celebration/v1'

function sameIdentity(left, right) {
  return left?.source === right?.source
    && left?.pluginId === right?.pluginId
    && left?.pointId === right?.pointId
}

function exactArguments(descriptor, expected) {
  const actual = (descriptor?.arguments ?? []).map(argument => ({
    id: argument.id,
    type: argument.schema?.type,
    enum: argument.schema?.enum,
    required: argument.required,
  }))
  return JSON.stringify(actual) === JSON.stringify(expected)
}

function forbiddenWireFields(value, pathLabel = 'wire') {
  if (value === null || typeof value !== 'object') return []
  const errors = []
  for (const [key, child] of Object.entries(value)) {
    const childPath = `${pathLabel}.${key}`
    if (['selector', 'testMarker', 'marker'].includes(key)) errors.push(`${childPath} contains forbidden field ${key}`)
    errors.push(...forbiddenWireFields(child, childPath))
  }
  return errors
}

function validateProfile(suite) {
  const errors = [...validateExtensionPointControlSuite(suite)]
  if (suite?.profile !== profileId) errors.push(`profile must equal ${profileId}`)

  const point = suite?.catalog?.points?.find(candidate => candidate.id === 'composer.toolbar.items')
  if (point === undefined) return [...errors, 'composer.toolbar.items control point is required']

  const compose = point.modes?.find(mode => mode.id === 'compose')
  const proxy = point.modes?.find(mode => mode.id === 'proxy')
  const group = point.exclusiveGroups?.find(candidate => candidate.id === 'submit-observer')
  if (compose?.stacking !== 'ordered' || compose?.defaultAuthorization !== 'allow' || !compose?.coexistsWith?.includes('proxy')) {
    errors.push('compose must remain ordered/allow and coexist with proxy')
  }
  if (proxy?.stacking !== 'exclusive' || proxy?.exclusiveGroup !== 'submit-observer' || proxy?.defaultAuthorization !== 'deny' || !proxy?.coexistsWith?.includes('compose')) {
    errors.push('proxy must be deny-by-default in the submit-observer exclusive group and coexist with compose')
  }
  if (group?.selection !== 'host-priority' || group?.cardinality !== 'one' || group?.nativeFallback !== true) {
    errors.push('submit-observer must select at most one proxy claim with host-priority and native fallback')
  }

  const profile = point.safeProperties?.find(property => property.id === 'celebrationProfile')
  if (profile?.visibility !== 'renderer-safe' || profile?.mutable !== false || profile?.schema?.type !== 'string' || JSON.stringify(profile?.schema?.enum) !== JSON.stringify([profileId])) {
    errors.push('celebrationProfile must advertise the exact immutable renderer-safe v1 profile')
  }

  const present = point.safeCommands?.find(command => command.id === 'presentCelebration')
  const dismiss = point.safeCommands?.find(command => command.id === 'dismissCelebration')
  const submit = point.safeEvents?.find(event => event.id === 'submitActivated')
  if (present?.dispatch !== 'host-brokered' || !exactArguments(present, [
    { id: 'requestId', type: 'string', required: true },
    { id: 'activationId', type: 'string', required: true },
    { id: 'effect', type: 'string', enum: ['confetti'], required: true },
    { id: 'durationMs', type: 'integer', required: true },
  ])) errors.push('presentCelebration has an invalid profile shape')
  if (dismiss?.dispatch !== 'host-brokered' || !exactArguments(dismiss, [
    { id: 'requestId', type: 'string', required: true },
  ])) errors.push('dismissCelebration has an invalid profile shape')
  const submitPayload = (submit?.payload ?? []).map(field => ({ id: field.id, type: field.schema?.type, required: field.required }))
  if (submit?.delivery !== 'host-projected' || JSON.stringify(submitPayload) !== JSON.stringify([{ id: 'activationId', type: 'string', required: true }])) {
    errors.push('submitActivated has an invalid profile shape')
  }

  const deliveredActivations = new Map()
  for (const vector of suite?.events ?? []) {
    const event = vector.event
    if (event?.eventId !== 'submitActivated' || vector.expectedAccepted !== true) continue
    const key = `${event.principalHandle}\u0000${event.hostGeneration}\u0000${event.payload?.activationId}`
    deliveredActivations.set(key, event)
  }

  const usedActivations = new Set()
  const acceptedRequests = new Map()
  for (const vector of suite?.accesses ?? []) {
    const request = vector.request
    const result = vector.result
    if (request?.commandId === 'presentCelebration' && result?.outcome === 'accepted') {
      const duration = request.arguments?.durationMs
      if (!Number.isInteger(duration) || duration < 250 || duration > 5000) errors.push('durationMs must be between 250 and 5000')
      if (request.arguments?.effect !== 'confetti') errors.push('accepted presentation effect must be confetti')
      const activationKey = `${request.principalHandle}\u0000${request.hostGeneration}\u0000${request.arguments?.activationId}`
      const event = deliveredActivations.get(activationKey)
      if (event === undefined || !sameIdentity(event.identity, request.identity) || event.claimId !== request.claimId || event.contributionId !== request.contributionId) {
        errors.push('accepted presentation must correlate to a delivered activationId')
      }
      if (usedActivations.has(activationKey)) errors.push('one activationId cannot start multiple presentations')
      usedActivations.add(activationKey)
      const requestId = request.arguments?.requestId
      const canonical = JSON.stringify(request.arguments)
      if (acceptedRequests.has(requestId) && acceptedRequests.get(requestId) !== canonical) errors.push('requestId was reused with divergent arguments')
      acceptedRequests.set(requestId, canonical)
    }
    if (request?.principalHandle === 'principal:denied-celebration' && (result?.outcome !== 'rejected' || result?.reason !== 'authorization.denied')) {
      errors.push('denied claim must return authorization.denied')
    }
  }

  const requiredCleanup = new Map([
    ['duration-elapsed', 'removed'],
    ['fiber-unload', 'removed'],
    ['generation-replacement', 'removed'],
    ['candidate-abort', 'not-started'],
    ['failure-rollback', 'removed'],
    ['renderer-failure', 'removed'],
  ])
  const scenarios = suite?.profileHarness?.lifecycleScenarios ?? []
  for (const [transition, after] of requiredCleanup) {
    const scenario = scenarios.find(candidate => candidate.transition === transition)
    if (scenario === undefined) errors.push(`${transition} lifecycle scenario is required`)
    else {
      if (scenario.after !== after) {
        if (transition === 'candidate-abort') errors.push('candidate-abort must never start the presentation')
        else errors.push(`${transition} must remove the presentation`)
      }
      if (scenario.nativeState !== 'unchanged') errors.push(`${transition} must restore unchanged native state`)
      if (scenario.replayed !== false) errors.push(`${transition} must not replay a transient presentation`)
    }
  }

  const compatibility = suite?.profileHarness?.compatibilityScenarios ?? []
  const expectedCompatibility = new Map([
    ['profile-absent', ['unavailable', 'celebration.unavailable']],
    ['point-not-mounted', ['unavailable', 'point.not-mounted']],
    ['claim-denied', ['denied', 'authorization.denied']],
  ])
  for (const [condition, [status, diagnostic]] of expectedCompatibility) {
    const scenario = compatibility.find(candidate => candidate.condition === condition)
    if (scenario === undefined) errors.push(`${condition} compatibility scenario is required`)
    else {
      if (scenario.status !== status || scenario.diagnostic !== diagnostic) errors.push(`${condition} must report ${status}/${diagnostic}`)
      if (scenario.effect !== 'not-started') errors.push(`${status} compatibility path must not start an effect`)
    }
  }

  const wire = {
    catalog: suite?.catalog,
    declarations: suite?.declarations,
    authorizations: suite?.authorizations,
    snapshots: suite?.snapshots,
    events: suite?.events,
    accesses: suite?.accesses,
  }
  errors.push(...forbiddenWireFields(wire))
  return errors
}

function mutate(suite, mutation) {
  if (mutation === 'duration-over-limit') suite.accesses[0].request.arguments.durationMs = 5001
  else if (mutation === 'uncorrelated-activation') suite.accesses[0].request.arguments.activationId = 'activation:other'
  else if (mutation === 'fiber-unload-leak') suite.profileHarness.lifecycleScenarios.find(item => item.transition === 'fiber-unload').after = 'active'
  else if (mutation === 'generation-replacement-leak') suite.profileHarness.lifecycleScenarios.find(item => item.transition === 'generation-replacement').after = 'active'
  else if (mutation === 'rollback-leak') suite.profileHarness.lifecycleScenarios.find(item => item.transition === 'failure-rollback').after = 'active'
  else if (mutation === 'renderer-failure-leak') suite.profileHarness.lifecycleScenarios.find(item => item.transition === 'renderer-failure').after = 'partial'
  else if (mutation === 'staged-candidate-visible') suite.profileHarness.lifecycleScenarios.find(item => item.transition === 'candidate-abort').after = 'active'
  else if (mutation === 'accepted-unavailable') {
    const scenario = suite.profileHarness.compatibilityScenarios.find(item => item.condition === 'profile-absent')
    scenario.status = 'accepted'
    scenario.effect = 'started'
  } else if (mutation === 'wire-selector') suite.accesses[0].request.selector = '[data-native-submit]'
  else if (mutation === 'wire-test-marker') suite.accesses[0].request.testMarker = 'celebration-active'
  else throw new Error(`unknown submit celebration mutation: ${mutation}`)
}

let failures = 0
const valid = JSON.parse(await readFile(validPath, 'utf8'))
const validErrors = validateProfile(valid)
if (validErrors.length > 0) {
  console.error(`${path.relative(root, validPath)} should be valid`, validErrors)
  failures += 1
}

const invalidDirectory = path.join(root, 'test-vectors/submit-celebration-presentation/invalid')
for (const entry of (await readdir(invalidDirectory, { withFileTypes: true })).filter(item => item.isFile() && item.name.endsWith('.json')).sort((left, right) => left.name.localeCompare(right.name))) {
  const vector = JSON.parse(await readFile(path.join(invalidDirectory, entry.name), 'utf8'))
  const candidate = structuredClone(valid)
  mutate(candidate, vector.mutation)
  const errors = validateProfile(candidate)
  if (errors.length === 0) {
    console.error(`${entry.name} should be invalid`)
    failures += 1
  } else if (!errors.some(error => error.includes(vector.expectedError))) {
    console.error(`${entry.name} did not preserve expected error ${vector.expectedError}`, errors)
    failures += 1
  }
}

if (failures > 0) throw new Error(`${failures} submit celebration presentation conformance case(s) failed`)
console.log('Submit celebration presentation conformance: all vectors passed')
