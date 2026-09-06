import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { root, validateExtensionPointControlSuite } from './extension-point-control/validate-suite.mjs'
export { validateExtensionPointControlSuite } from './extension-point-control/validate-suite.mjs'

async function jsonFiles(directory) {
  return (await readdir(directory, { withFileTypes: true }))
    .filter(entry => entry.isFile() && entry.name.endsWith('.json'))
    .map(entry => path.join(directory, entry.name))
    .sort()
}

let failures = 0
for (const file of await jsonFiles(path.join(root, 'test-vectors/extension-point-control/valid'))) {
  const errors = validateExtensionPointControlSuite(JSON.parse(await readFile(file, 'utf8')))
  if (errors.length > 0) {
    console.error(`${path.relative(root, file)} should be valid`, errors)
    failures += 1
  }
}
for (const file of await jsonFiles(path.join(root, 'test-vectors/extension-point-control/invalid'))) {
  const vector = JSON.parse(await readFile(file, 'utf8'))
  const basePath = path.join(root, 'test-vectors/extension-point-control/valid', vector.base)
  const suite = structuredClone(JSON.parse(await readFile(basePath, 'utf8')))
  if (vector.mutation === 'free-dom-selector') suite.declarations[0].selector = '#native-node'
  else if (vector.mutation === 'callback-in-command') {
    suite.accesses[0].request.arguments.callback = { nativeCallback: 'onChange' }
  } else if (vector.mutation === 'command-result-payload') suite.accesses[0].result.payload = { nativeHandle: 'opaque' }
  else if (vector.mutation === 'callback-in-event') {
    suite.events[0].event.payload.callback = { nativeCallback: 'onChange' }
  } else if (vector.mutation === 'plugin-forged-event') suite.events[0].event.authority = 'plugin'
  else if (vector.mutation === 'denied-event-delivery') {
    const event = suite.events[0].event
    event.principalHandle = 'principal:sync'
    event.identity = {
      source: 'https://plugins.example/sync',
      pluginId: 'sync',
      pointId: 'composer.reasoning-intensity',
    }
    event.claimId = 'sync'
    event.contributionId = 'reasoning.sync'
    event.mode = 'proxy'
  } else if (vector.mutation === 'unknown-binding') {
    suite.declarations[0].requestedBindings.properties.push('nativeNode')
  } else if (vector.mutation === 'partial-authorization-cross-claim') suite.authorizations[0].claimId = 'another-claim'
  else if (vector.mutation === 'overlay-coexistence-not-explicit') {
    const point = suite.catalog.points.find(candidate => candidate.id === 'composer.reasoning-intensity')
    point.modes.find(mode => mode.id === 'overlay').coexistsWith = ['compose', 'proxy']
  } else if (vector.mutation === 'exclusive-double-selection') {
    const originalDeclaration = suite.declarations.find(item => item.identity.pluginId === 'compact')
    const declaration = structuredClone(originalDeclaration)
    declaration.principalHandle = 'principal:compact-two'
    declaration.identity = {
      ...declaration.identity,
      source: 'https://plugins.example/compact-two',
      pluginId: 'compact-two',
    }
    declaration.claimId = 'renderer-two'
    declaration.contributionId = 'reasoning.compact-two'
    suite.principals.push({
      handle: declaration.principalHandle,
      source: declaration.identity.source,
      pluginId: declaration.identity.pluginId,
      origin: 'explicit',
    })
    suite.declarations.push(declaration)
    const authorization = structuredClone(suite.authorizations.find(item => item.identity.pluginId === 'compact'))
    authorization.principalHandle = declaration.principalHandle
    authorization.identity = structuredClone(declaration.identity)
    authorization.claimId = declaration.claimId
    suite.authorizations.push(authorization)
    const point = suite.snapshots[0].points.find(candidate => candidate.id === 'composer.reasoning-intensity')
    const candidate = structuredClone(point.candidates.find(item => item.identity.pluginId === 'compact'))
    candidate.principalHandle = declaration.principalHandle
    candidate.identity = structuredClone(declaration.identity)
    candidate.claimId = declaration.claimId
    candidate.contributionId = declaration.contributionId
    point.candidates.push(candidate)
  } else if (vector.mutation === 'host-priority-wrong-winner') {
    const pointPolicy = suite.catalog.points.find(point => point.id === 'composer.reasoning-intensity')
    pointPolicy.exclusiveGroups.find(group => group.id === 'renderer').selection = 'host-priority'
    const originalDeclaration = suite.declarations.find(item => item.identity.pluginId === 'compact')
    const declaration = structuredClone(originalDeclaration)
    declaration.principalHandle = 'principal:priority'
    declaration.identity = { ...declaration.identity, source: 'https://plugins.example/priority', pluginId: 'priority' }
    declaration.claimId = 'priority-renderer'
    declaration.contributionId = 'reasoning.priority'
    declaration.priority = 99
    suite.principals.push({
      handle: declaration.principalHandle,
      source: declaration.identity.source,
      pluginId: declaration.identity.pluginId,
      origin: 'explicit',
    })
    suite.declarations.push(declaration)
    const authorization = structuredClone(suite.authorizations.find(item => item.identity.pluginId === 'compact'))
    authorization.principalHandle = declaration.principalHandle
    authorization.identity = structuredClone(declaration.identity)
    authorization.claimId = declaration.claimId
    suite.authorizations.push(authorization)
    const point = suite.snapshots[0].points.find(candidate => candidate.id === 'composer.reasoning-intensity')
    const selected = point.candidates.find(item => item.identity.pluginId === 'compact')
    selected.selection.authority = 'host-policy'
    point.groupDecisions[0].authority = 'host-policy'
    const candidate = structuredClone(selected)
    candidate.principalHandle = declaration.principalHandle
    candidate.identity = structuredClone(declaration.identity)
    candidate.claimId = declaration.claimId
    candidate.contributionId = declaration.contributionId
    candidate.priority = declaration.priority
    candidate.state = 'eligible'
    candidate.reason = 'policy.eligible'
    delete candidate.selection
    delete candidate.bindings
    point.candidates.push(candidate)
  } else if (vector.mutation === 'host-priority-eligible-native' || vector.mutation === 'host-priority-eligible-none') {
    const pointPolicy = suite.catalog.points.find(point => point.id === 'composer.reasoning-intensity')
    const groupPolicy = pointPolicy.exclusiveGroups.find(group => group.id === 'renderer')
    groupPolicy.selection = 'host-priority'
    groupPolicy.nativeFallback = vector.mutation === 'host-priority-eligible-native'
    const point = suite.snapshots[0].points.find(item => item.id === 'composer.reasoning-intensity')
    const candidate = point.candidates.find(item => item.identity.pluginId === 'compact')
    candidate.state = 'eligible'
    candidate.reason = 'policy.eligible'
    delete candidate.selection
    delete candidate.bindings
    point.groupDecisions[0] = {
      groupId: 'renderer',
      outcome: groupPolicy.nativeFallback ? 'native' : 'none',
      authority: 'host-policy',
      hostGeneration: 'host-17',
      reason: groupPolicy.nativeFallback ? 'policy.native' : 'policy.none',
    }
  } else if (vector.mutation === 'candidate-wrong-point') {
    const source = suite.snapshots[0].points.find(point => point.id === 'composer.reasoning-intensity')
    const target = suite.snapshots[0].points.find(point => point.id === 'composer.model-control')
    target.candidates.push(source.candidates.shift())
  } else if (vector.mutation === 'exclusive-cross-mode-cardinality') {
    const original = suite.declarations.find(item => item.identity.pluginId === 'compact')
    const declaration = structuredClone(original)
    declaration.principalHandle = 'principal:hidden'
    declaration.identity = { ...declaration.identity, source: 'https://plugins.example/hidden', pluginId: 'hidden' }
    declaration.claimId = 'hidden'
    declaration.contributionId = 'reasoning.hidden'
    declaration.mode = 'hide-native'
    suite.principals.push({
      handle: declaration.principalHandle,
      source: declaration.identity.source,
      pluginId: declaration.identity.pluginId,
      origin: 'explicit',
    })
    suite.declarations.push(declaration)
    const authorization = structuredClone(suite.authorizations.find(item => item.identity.pluginId === 'compact'))
    authorization.principalHandle = declaration.principalHandle
    authorization.identity = structuredClone(declaration.identity)
    authorization.claimId = declaration.claimId
    authorization.mode = declaration.mode
    suite.authorizations.push(authorization)
    const point = suite.snapshots[0].points.find(item => item.id === 'composer.reasoning-intensity')
    const candidate = structuredClone(point.candidates.find(item => item.identity.pluginId === 'compact'))
    candidate.principalHandle = declaration.principalHandle
    candidate.identity = structuredClone(declaration.identity)
    candidate.claimId = declaration.claimId
    candidate.contributionId = declaration.contributionId
    candidate.mode = declaration.mode
    point.candidates.push(candidate)
  } else if (vector.mutation === 'native-decision-with-selected') {
    const decision = suite.snapshots[0].points.find(point =>
      point.id === 'composer.reasoning-intensity'
    ).groupDecisions[0]
    decision.outcome = 'native'
    delete decision.selectedClaim
  } else if (vector.mutation === 'decision-selected-claim-drift') {
    const point = suite.snapshots[0].points.find(item => item.id === 'composer.reasoning-intensity')
    const overlay = point.candidates.find(candidate => candidate.mode === 'overlay')
    point.groupDecisions[0].selectedClaim = {
      principalHandle: overlay.principalHandle,
      identity: structuredClone(overlay.identity),
      claimId: overlay.claimId,
      mode: overlay.mode,
    }
  } else if (vector.mutation === 'ordered-user-authority') {
    suite.snapshots[0].points.find(point => point.id === 'composer.reasoning-intensity').candidates.find(candidate =>
      candidate.mode === 'overlay'
    ).selection.authority = 'user'
  } else if (vector.mutation === 'ordered-exclusive-group') {
    suite.snapshots[0].points.find(point => point.id === 'composer.reasoning-intensity').candidates.find(candidate =>
      candidate.mode === 'overlay'
    ).selection.exclusiveGroup = 'renderer'
  } else if (vector.mutation === 'snapshot-missing-point') {
    suite.snapshots[0].points.shift()
  } else if (vector.mutation === 'snapshot-missing-candidate') {
    const point = suite.snapshots[0].points.find(item => item.id === 'composer.reasoning-intensity')
    point.candidates = point.candidates.filter(candidate => candidate.identity.pluginId !== 'sync')
  } else if (vector.mutation === 'suppressed-decision-leak') {
    suite.snapshots[0].points.find(point => point.id === 'model.reasoning-intensity').groupDecisions.push({
      groupId: 'renderer',
      outcome: 'native',
      authority: 'user',
      hostGeneration: 'host-21',
      reason: 'user.native',
    })
  } else if (vector.mutation === 'restore-missing-decision') {
    suite.snapshots[1].points.find(point => point.id === 'model.reasoning-intensity').groupDecisions = []
  } else if (vector.mutation === 'legacy-compose-exclusive') {
    const point = suite.catalog.points.find(item => item.id === 'model.reasoning-intensity')
    const compose = point.modes.find(mode => mode.id === 'compose')
    compose.stacking = 'exclusive'
    compose.exclusiveGroup = 'legacy'
    point.exclusiveGroups.push({
      id: 'legacy',
      modes: ['compose'],
      cardinality: 'one',
      selection: 'host-priority',
      nativeFallback: true,
    })
  } else if (vector.mutation === 'legacy-order-rank-drift') {
    const selected = suite.snapshots[1].points.find(point => point.id === 'model.reasoning-intensity').candidates
      .filter(candidate => candidate.origin === 'legacy-structured')
    selected[0].selection.rank = 1
    selected[1].selection.rank = 0
  } else if (vector.mutation === 'cross-owner-declaration') {
    suite.declarations[0].identity.pluginId = 'sync'
  } else if (vector.mutation === 'principal-cross-handle-spoof') {
    suite.declarations[0].principalHandle = 'principal:compact'
  } else if (vector.mutation === 'cross-owner-authorization') {
    suite.authorizations[0].principalHandle = 'principal:sync'
  } else if (vector.mutation === 'cross-owner-candidate') {
    suite.snapshots[0].points.find(point => point.id === 'composer.reasoning-intensity').candidates.find(candidate =>
      candidate.identity.pluginId === 'ascension'
    ).principalHandle = 'principal:sync'
  } else if (vector.mutation === 'cross-owner-access') {
    suite.accesses[0].request.principalHandle = 'principal:sync'
  } else if (vector.mutation === 'catalog-plugin-field') {
    suite.catalog.points[0].pluginId = 'spoof'
  } else if (vector.mutation === 'legacy-origin-spoof') {
    suite.declarations.find(declaration => declaration.origin === 'legacy-structured').origin = 'explicit'
  } else if (vector.mutation === 'principal-cross-origin-spoof') {
    suite.declarations.find(declaration => declaration.principalHandle === 'principal:reasoning-explicit')
      .principalHandle = 'principal:reasoning'
  } else if (vector.mutation === 'cross-group-noncoexistence') {
    const point = suite.catalog.points.find(item => item.id === 'composer.reasoning-intensity')
    const proxy = point.modes.find(mode => mode.id === 'proxy')
    proxy.stacking = 'exclusive'
    proxy.exclusiveGroup = 'proxy-group'
    point.exclusiveGroups.push({
      id: 'proxy-group',
      modes: ['proxy'],
      cardinality: 'one',
      selection: 'host-priority',
      nativeFallback: true,
    })
  } else if (vector.mutation === 'descendant-not-suppressed') {
    const child = suite.snapshots[0].points.find(point => point.id === 'model.reasoning-intensity')
    child.state = 'active'
    delete child.suppression
    child.candidates[0].state = 'eligible'
    child.candidates[0].reason = 'policy.eligible'
  } else if (vector.mutation === 'suppressed-denied-state-leak') {
    const child = suite.snapshots[0].points.find(point => point.id === 'model.reasoning-intensity')
    child.candidates.find(candidate => candidate.identity.pluginId === 'denied-reasoning').state = 'denied'
  } else if (vector.mutation === 'denied-recovery-eligible') {
    const child = suite.snapshots[1].points.find(point => point.id === 'model.reasoning-intensity')
    child.candidates.find(candidate => candidate.identity.pluginId === 'denied-reasoning').state = 'eligible'
  } else if (vector.mutation === 'plugin-forged-selection') {
    const point = suite.snapshots[0].points.find(candidate => candidate.id === 'composer.reasoning-intensity')
    point.candidates.find(candidate => candidate.state === 'selected').selection.authority = 'plugin'
  } else if (vector.mutation === 'legacy-free-dom-mode') suite.declarations[0].mode = 'free-dom'
  else if (vector.mutation === 'legacy-control-escalation') suite.declarations[0].origin = 'legacy-structured'
  else if (vector.mutation === 'sensitive-property') {
    const point = suite.catalog.points.find(candidate => candidate.id === 'composer.reasoning-intensity')
    point.safeProperties[0].visibility = 'sensitive'
  } else if (vector.mutation === 'unserializable-property') {
    const point = suite.snapshots[0].points.find(candidate => candidate.id === 'composer.reasoning-intensity')
    point.candidates.find(candidate => candidate.state === 'selected').bindings.properties[0].value = {
      nativeNode: true,
    }
  } else throw new Error(`unknown invalid-vector mutation: ${vector.mutation}`)
  const errors = validateExtensionPointControlSuite(suite)
  if (errors.length === 0) {
    console.error(`${path.relative(root, file)} should be invalid`)
    failures += 1
  } else if (typeof vector.expectedError === 'string' && !errors.some(error => error.includes(vector.expectedError))) {
    console.error(`${path.relative(root, file)} did not preserve expected error ${vector.expectedError}`, errors)
    failures += 1
  }
}

if (failures > 0) throw new Error(`${failures} extension-point control conformance case(s) failed`)
console.log('Extension point control conformance: all vectors passed')
