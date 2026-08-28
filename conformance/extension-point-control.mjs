import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const schemaNames = [
  'ui-common.v1.schema.json',
  'extension-point-common.v1.schema.json',
  'extension-point-control-common.v1.schema.json',
  'extension-point-control-declaration.v1.schema.json',
  'extension-point-control-authorization.v1.schema.json',
  'host-extension-point-control-catalog.v1.schema.json',
  'extension-point-control-snapshot.v1.schema.json',
  'extension-point-control-access.v1.schema.json',
  'extension-point-control-result.v1.schema.json',
  'extension-point-control-event.v1.schema.json',
]
const schemas = new Map()
for (const name of schemaNames) schemas.set(name, JSON.parse(await readFile(path.join(root, 'schemas', name), 'utf8')))

const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true })
addFormats(ajv)
for (const schema of schemas.values()) ajv.addSchema(schema)
const validator = name => {
  const value = ajv.getSchema(schemas.get(name).$id)
  if (value === undefined) throw new Error(`${name} was not registered`)
  return value
}
const validators = {
  catalog: validator('host-extension-point-control-catalog.v1.schema.json'),
  declaration: validator('extension-point-control-declaration.v1.schema.json'),
  authorization: validator('extension-point-control-authorization.v1.schema.json'),
  snapshot: validator('extension-point-control-snapshot.v1.schema.json'),
  access: validator('extension-point-control-access.v1.schema.json'),
  result: validator('extension-point-control-result.v1.schema.json'),
  event: validator('extension-point-control-event.v1.schema.json'),
}

function schemaErrors(validate, value) {
  if (validate(value)) return []
  return (validate.errors ?? []).map(error => `${error.instancePath || '/'} ${error.message}`)
}

function canonicalSource(value) {
  const url = new URL(value)
  if (!['file:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new Error('source must be a file or HTTPS URL without credentials, query, or fragment')
  }
  if (url.protocol === 'file:' && url.host !== '') throw new Error('file source must be local')
  if (url.protocol === 'https:' && url.pathname !== '/') url.pathname = url.pathname.replace(/\/+$/, '')
  return url.href
}

function identityKey(identity) {
  return `${identity?.source}\u0000${identity?.pluginId}\u0000${identity?.pointId}`
}

function claimKey(value) {
  return `${identityKey(value?.identity)}\u0000${value?.claimId}\u0000${value?.mode}`
}

function sameClaim(left, right) {
  return claimKey(left) === claimKey(right)
}

function duplicates(values) {
  const seen = new Set()
  const result = []
  for (const value of values) {
    if (seen.has(value)) result.push(value)
    seen.add(value)
  }
  return result
}

function validSafeValue(schema, value) {
  if (value === null) return schema?.nullable === true
  if (schema?.enum !== undefined && !schema.enum.some(candidate => Object.is(candidate, value))) return false
  if (schema?.type === 'string') return typeof value === 'string'
  if (schema?.type === 'number') return typeof value === 'number' && Number.isFinite(value)
  if (schema?.type === 'integer') return Number.isInteger(value)
  if (schema?.type === 'boolean') return typeof value === 'boolean'
  return false
}

function validateCanonicalIdentity(errors, label, identity) {
  if (typeof identity?.source !== 'string') return
  try {
    if (canonicalSource(identity.source) !== identity.source) errors.push(`${label} source is not canonical`)
  } catch (error) {
    errors.push(`${label} ${error instanceof Error ? error.message : String(error)}`)
  }
}

function validateCatalog(catalog, errors) {
  errors.push(...schemaErrors(validators.catalog, catalog).map(error => `catalog schema: ${error}`))
  const points = Array.isArray(catalog?.points) ? catalog.points : []
  const pointsById = new Map()
  for (const duplicate of duplicates(points.map(point => point?.id).filter(Boolean))) errors.push(`duplicate point policy: ${duplicate}`)
  for (const point of points) if (typeof point?.id === 'string') pointsById.set(point.id, point)

  for (const point of points) {
    const modes = Array.isArray(point?.modes) ? point.modes : []
    const modesById = new Map(modes.map(mode => [mode.id, mode]))
    for (const duplicate of duplicates(modes.map(mode => mode?.id).filter(Boolean))) errors.push(`duplicate mode policy: ${point.id}/${duplicate}`)
    const compose = modesById.get('compose')
    if (compose === undefined || compose.defaultAuthorization !== 'allow') {
      errors.push(`point ${point.id} must retain compatible compose default allow`)
    }
    for (const mode of modes) {
      if (mode.id !== 'compose' && mode.defaultAuthorization !== 'deny') {
        errors.push(`control mode ${point.id}/${mode.id} must default deny`)
      }
      for (const peerId of mode.coexistsWith ?? []) {
        const peer = modesById.get(peerId)
        if (peer === undefined) errors.push(`mode ${point.id}/${mode.id} coexists with unknown mode ${peerId}`)
        else if (!(peer.coexistsWith ?? []).includes(mode.id)) errors.push(`mode coexistence must be symmetric: ${point.id}/${mode.id}/${peerId}`)
      }
    }

    const groups = Array.isArray(point?.exclusiveGroups) ? point.exclusiveGroups : []
    const groupsById = new Map(groups.map(group => [group.id, group]))
    for (const duplicate of duplicates(groups.map(group => group?.id).filter(Boolean))) errors.push(`duplicate exclusive group: ${point.id}/${duplicate}`)
    for (const group of groups) {
      for (const modeId of group.modes ?? []) {
        const mode = modesById.get(modeId)
        if (mode === undefined) errors.push(`exclusive group ${point.id}/${group.id} references unknown mode ${modeId}`)
        else if (mode.stacking !== 'exclusive' || mode.exclusiveGroup !== group.id) {
          errors.push(`exclusive group ${point.id}/${group.id} does not own mode ${modeId}`)
        }
      }
    }
    for (const mode of modes) {
      if (mode.stacking === 'exclusive') {
        const group = groupsById.get(mode.exclusiveGroup)
        if (group === undefined || !(group.modes ?? []).includes(mode.id)) {
          errors.push(`exclusive mode ${point.id}/${mode.id} lacks its declared group`)
        }
      }
    }

    const propertyIds = (point.safeProperties ?? []).map(binding => binding.id)
    const commandIds = (point.safeCommands ?? []).map(binding => binding.id)
    const eventIds = (point.safeEvents ?? []).map(binding => binding.id)
    for (const duplicate of duplicates(propertyIds)) errors.push(`duplicate safe property: ${point.id}/${duplicate}`)
    for (const duplicate of duplicates(commandIds)) errors.push(`duplicate safe command: ${point.id}/${duplicate}`)
    for (const duplicate of duplicates(eventIds)) errors.push(`duplicate safe event: ${point.id}/${duplicate}`)
    for (const command of point.safeCommands ?? []) {
      for (const duplicate of duplicates((command.arguments ?? []).map(argument => argument.id))) {
        errors.push(`duplicate safe command argument: ${point.id}/${command.id}/${duplicate}`)
      }
      for (const argument of command.arguments ?? []) {
        for (const value of argument.schema?.enum ?? []) {
          if (!validSafeValue({ ...argument.schema, nullable: argument.schema?.nullable === true }, value)) {
            errors.push(`command enum value does not match schema: ${point.id}/${command.id}/${argument.id}`)
          }
        }
      }
    }
    for (const event of point.safeEvents ?? []) {
      for (const duplicate of duplicates((event.payload ?? []).map(field => field.id))) errors.push(`duplicate safe event field: ${point.id}/${event.id}/${duplicate}`)
      for (const field of event.payload ?? []) {
        for (const value of field.schema?.enum ?? []) {
          if (!validSafeValue({ ...field.schema, nullable: field.schema?.nullable === true }, value)) errors.push(`event enum value does not match schema: ${point.id}/${event.id}/${field.id}`)
        }
      }
    }
    for (const property of point.safeProperties ?? []) {
      for (const value of property.schema?.enum ?? []) {
        if (!validSafeValue({ ...property.schema, nullable: property.schema?.nullable === true }, value)) {
          errors.push(`property enum value does not match schema: ${point.id}/${property.id}`)
        }
      }
    }
    for (const modeId of point.ownership?.suppressesDescendantsWhenModes ?? []) {
      if (!modesById.has(modeId)) errors.push(`ownership policy ${point.id} references unknown mode ${modeId}`)
    }
    if (point.ownership?.scope === 'point' && (point.ownership?.suppressesDescendantsWhenModes?.length ?? 0) > 0) {
      errors.push(`point-only ownership cannot suppress descendants: ${point.id}`)
    }
  }

  for (const point of points) {
    if (point.parentPointId !== undefined && !pointsById.has(point.parentPointId)) errors.push(`unknown parent point: ${point.id}/${point.parentPointId}`)
    const visited = new Set([point.id])
    let cursor = point
    while (cursor?.parentPointId !== undefined) {
      if (visited.has(cursor.parentPointId)) {
        errors.push(`point ownership cycle includes ${point.id}`)
        break
      }
      visited.add(cursor.parentPointId)
      cursor = pointsById.get(cursor.parentPointId)
    }
  }
  return pointsById
}

function effectiveAuthorization(declaration, authorizations, pointsById) {
  const record = authorizations.find(candidate => sameClaim(candidate, declaration))
  if (record?.policy === 'allow') return 'allowed'
  if (record?.policy === 'deny') return 'denied'
  const point = pointsById.get(declaration.identity.pointId)
  const mode = point?.modes?.find(candidate => candidate.id === declaration.mode)
  return mode?.defaultAuthorization === 'allow' ? 'allowed' : 'denied'
}

function validateDeclarations(suite, pointsById, errors) {
  const declarations = Array.isArray(suite?.declarations) ? suite.declarations : []
  if (!Array.isArray(suite?.declarations)) errors.push('declarations must be an array')
  const declarationsByKey = new Map()
  for (const [index, declaration] of declarations.entries()) {
    errors.push(...schemaErrors(validators.declaration, declaration).map(error => `declarations[${index}] schema: ${error}`))
    validateCanonicalIdentity(errors, `declarations[${index}]`, declaration?.identity)
    const key = claimKey(declaration)
    if (declarationsByKey.has(key)) errors.push(`duplicate control claim: ${key}`)
    declarationsByKey.set(key, declaration)
    const point = pointsById.get(declaration?.identity?.pointId)
    if (point === undefined) {
      errors.push(`declaration references unknown point: ${declaration?.identity?.pointId ?? '<missing>'}`)
      continue
    }
    if (!(point.modes ?? []).some(mode => mode.id === declaration.mode)) errors.push(`declaration references unavailable mode: ${point.id}/${declaration.mode}`)
    if (declaration.origin === 'legacy-structured' && (declaration.mode !== 'compose' || declaration.requestedBindings?.properties?.length > 0 || declaration.requestedBindings?.commands?.length > 0 || declaration.requestedBindings?.events?.length > 0)) {
      errors.push(`legacy structured contribution cannot gain control authority: ${key}`)
    }
    const propertyIds = new Set((point.safeProperties ?? []).map(binding => binding.id))
    const commandIds = new Set((point.safeCommands ?? []).map(binding => binding.id))
    const eventIds = new Set((point.safeEvents ?? []).map(binding => binding.id))
    for (const id of declaration.requestedBindings?.properties ?? []) if (!propertyIds.has(id)) errors.push(`declaration requests unknown property: ${point.id}/${id}`)
    for (const id of declaration.requestedBindings?.commands ?? []) if (!commandIds.has(id)) errors.push(`declaration requests unknown command: ${point.id}/${id}`)
    for (const id of declaration.requestedBindings?.events ?? []) if (!eventIds.has(id)) errors.push(`declaration requests unknown event: ${point.id}/${id}`)
  }
  return { declarations, declarationsByKey }
}

function validateAuthorizations(suite, declarationsByKey, errors) {
  const authorizations = Array.isArray(suite?.authorizations) ? suite.authorizations : []
  if (!Array.isArray(suite?.authorizations)) errors.push('authorizations must be an array')
  const seen = new Set()
  for (const [index, authorization] of authorizations.entries()) {
    errors.push(...schemaErrors(validators.authorization, authorization).map(error => `authorizations[${index}] schema: ${error}`))
    validateCanonicalIdentity(errors, `authorizations[${index}]`, authorization?.identity)
    const key = claimKey(authorization)
    if (seen.has(key)) errors.push(`duplicate claim authorization: ${key}`)
    seen.add(key)
    if (!declarationsByKey.has(key)) errors.push(`authorization does not match an exact control claim: ${key}`)
  }
  return authorizations
}

function pathToAncestor(pointsById, pointId, ancestorId) {
  const reversed = [pointId]
  let cursor = pointsById.get(pointId)
  while (cursor?.parentPointId !== undefined) {
    reversed.push(cursor.parentPointId)
    if (cursor.parentPointId === ancestorId) return reversed.reverse()
    cursor = pointsById.get(cursor.parentPointId)
  }
  return undefined
}

function validateSnapshot(snapshot, index, pointsById, declarationsByKey, authorizations, errors) {
  errors.push(...schemaErrors(validators.snapshot, snapshot).map(error => `snapshots[${index}] schema: ${error}`))
  const pointStates = Array.isArray(snapshot?.points) ? snapshot.points : []
  const stateById = new Map(pointStates.map(point => [point.id, point]))
  for (const duplicate of duplicates(pointStates.map(point => point?.id).filter(Boolean))) errors.push(`duplicate runtime point: ${duplicate}`)
  for (const pointState of pointStates) {
    const point = pointsById.get(pointState.id)
    if (point === undefined) {
      errors.push(`runtime references unknown point: ${pointState.id}`)
      continue
    }
    const candidates = pointState.candidates ?? []
    const candidateByKey = new Map()
    for (const candidate of candidates) {
      const key = claimKey(candidate)
      if (candidateByKey.has(key)) errors.push(`duplicate runtime candidate: ${key}`)
      candidateByKey.set(key, candidate)
      const declaration = declarationsByKey.get(key)
      if (declaration === undefined) {
        errors.push(`runtime candidate lacks exact declaration: ${key}`)
        continue
      }
      if (candidate.identity.pointId !== point.id) errors.push(`runtime candidate is listed under the wrong point: ${key}/${point.id}`)
      if (candidate.origin !== declaration.origin || candidate.contributionId !== declaration.contributionId || candidate.priority !== declaration.priority) errors.push(`runtime candidate drifted from declaration: ${key}`)
      const expectedAuthorization = effectiveAuthorization(declaration, authorizations, pointsById)
      if (candidate.authorization !== expectedAuthorization) errors.push(`runtime authorization drift: ${key}`)
      if (candidate.state === 'selected' && candidate.authorization !== 'allowed') errors.push(`denied candidate cannot be selected: ${key}`)
      if (candidate.selection !== undefined && candidate.selection.hostGeneration !== snapshot.hostGeneration) errors.push(`candidate selection generation drift: ${key}`)

      if (candidate.state === 'selected') {
        const propertiesById = new Map((point.safeProperties ?? []).map(binding => [binding.id, binding]))
        const commandsById = new Map((point.safeCommands ?? []).map(binding => [binding.id, binding]))
        const eventsById = new Map((point.safeEvents ?? []).map(binding => [binding.id, binding]))
        const projectedPropertyIds = (candidate.bindings?.properties ?? []).map(binding => binding.id)
        const projectedCommandIds = (candidate.bindings?.commands ?? []).map(binding => binding.id)
        const projectedEventIds = (candidate.bindings?.events ?? []).map(binding => binding.id)
        for (const duplicate of duplicates(projectedPropertyIds)) errors.push(`duplicate projected property: ${key}/${duplicate}`)
        for (const duplicate of duplicates(projectedCommandIds)) errors.push(`duplicate projected command: ${key}/${duplicate}`)
        for (const duplicate of duplicates(projectedEventIds)) errors.push(`duplicate projected event: ${key}/${duplicate}`)
        for (const projection of candidate.bindings?.properties ?? []) {
          const binding = propertiesById.get(projection.id)
          if (binding === undefined || !(declaration.requestedBindings?.properties ?? []).includes(projection.id)) errors.push(`unrequested property projection: ${key}/${projection.id}`)
          else if (!validSafeValue(binding.schema, projection.value)) errors.push(`unsafe property projection value: ${key}/${projection.id}`)
        }
        for (const projection of candidate.bindings?.commands ?? []) {
          if (!commandsById.has(projection.id) || !(declaration.requestedBindings?.commands ?? []).includes(projection.id)) errors.push(`unrequested command projection: ${key}/${projection.id}`)
        }
        for (const projection of candidate.bindings?.events ?? []) {
          if (!eventsById.has(projection.id) || !(declaration.requestedBindings?.events ?? []).includes(projection.id)) errors.push(`unrequested event projection: ${key}/${projection.id}`)
        }
      }
    }

    const selected = candidates.filter(candidate => candidate.state === 'selected')
    for (let leftIndex = 0; leftIndex < selected.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < selected.length; rightIndex += 1) {
        const left = selected[leftIndex]
        const right = selected[rightIndex]
        const leftMode = point.modes.find(mode => mode.id === left.mode)
        const rightMode = point.modes.find(mode => mode.id === right.mode)
        if (left.mode === right.mode && leftMode?.stacking === 'exclusive') errors.push(`exclusive mode selected more than once: ${point.id}/${left.mode}`)
        if (left.mode !== right.mode && (!(leftMode?.coexistsWith ?? []).includes(right.mode) || !(rightMode?.coexistsWith ?? []).includes(left.mode))) {
          errors.push(`selected modes do not explicitly coexist: ${point.id}/${left.mode}/${right.mode}`)
        }
      }
    }

    const decisions = pointState.groupDecisions ?? []
    const decisionByGroup = new Map(decisions.map(decision => [decision.groupId, decision]))
    for (const duplicate of duplicates(decisions.map(decision => decision.groupId))) errors.push(`duplicate group decision: ${point.id}/${duplicate}`)
    for (const group of point.exclusiveGroups ?? []) {
      const decision = decisionByGroup.get(group.id)
      if (decision === undefined) {
        errors.push(`missing Host group decision: ${point.id}/${group.id}`)
        continue
      }
      if (decision.hostGeneration !== snapshot.hostGeneration) errors.push(`group decision generation drift: ${point.id}/${group.id}`)
      const expectedAuthority = group.selection === 'host-priority' ? 'host-policy' : 'user'
      if (decision.authority !== expectedAuthority) errors.push(`group decision authority violates catalog: ${point.id}/${group.id}`)
      if (decision.outcome === 'native' && group.nativeFallback !== true) errors.push(`group disallows native fallback: ${point.id}/${group.id}`)
      if (decision.outcome === 'selected') {
        const candidate = candidateByKey.get(claimKey(decision.selectedClaim))
        if (candidate === undefined || candidate.state !== 'selected') errors.push(`group decision does not select a live candidate: ${point.id}/${group.id}`)
        else if (candidate.selection?.exclusiveGroup !== group.id || candidate.selection.authority !== decision.authority) errors.push(`candidate selection stamp mismatches group decision: ${point.id}/${group.id}`)
        if (candidate !== undefined && group.selection === 'host-priority') {
          const eligible = candidates
            .filter(item => group.modes.includes(item.mode) && item.authorization === 'allowed' && !['denied', 'suppressed', 'pending'].includes(item.state))
            .sort((left, right) => right.priority - left.priority || claimKey(left).localeCompare(claimKey(right)))
          if (eligible[0] !== candidate) errors.push(`host-priority group did not select its deterministic winner: ${point.id}/${group.id}`)
        }
      }
    }
    for (const decision of decisions) if (!(point.exclusiveGroups ?? []).some(group => group.id === decision.groupId)) errors.push(`decision references unknown group: ${point.id}/${decision.groupId}`)

    if (pointState.state === 'active') {
      const compatibleSelected = selected.filter(candidate => point.modes.find(mode => mode.id === candidate.mode)?.stacking === 'exclusive')
      const ordered = candidates
        .filter(candidate => point.modes.find(mode => mode.id === candidate.mode)?.stacking === 'ordered' && candidate.authorization === 'allowed' && candidate.state !== 'pending')
        .sort((left, right) => right.priority - left.priority || claimKey(left).localeCompare(claimKey(right)))
      for (const candidate of ordered) {
        const candidateMode = point.modes.find(mode => mode.id === candidate.mode)
        const compatible = compatibleSelected.every(selectedCandidate => {
          if (selectedCandidate.mode === candidate.mode) return true
          const selectedMode = point.modes.find(mode => mode.id === selectedCandidate.mode)
          return (candidateMode?.coexistsWith ?? []).includes(selectedCandidate.mode) && (selectedMode?.coexistsWith ?? []).includes(candidate.mode)
        })
        const expectedState = compatible ? 'selected' : 'conflicted'
        if (candidate.state !== expectedState) errors.push(`ordered candidate resolution drift: ${claimKey(candidate)} expected ${expectedState}`)
        if (compatible) compatibleSelected.push(candidate)
      }
    }

    if (pointState.state === 'suppressed') {
      if (candidates.some(candidate => candidate.state !== 'suppressed')) errors.push(`suppressed point has non-suppressed candidate: ${point.id}`)
      if (decisions.length > 0) errors.push(`suppressed point must not publish group decisions: ${point.id}`)
      const suppression = pointState.suppression
      const ancestorState = stateById.get(suppression?.ancestorPointId)
      const ancestorPoint = pointsById.get(suppression?.ancestorPointId)
      const ancestorCandidate = ancestorState?.candidates?.find(candidate => sameClaim(candidate, suppression?.ancestorClaim) && candidate.state === 'selected')
      const expectedPath = pathToAncestor(pointsById, point.id, suppression?.ancestorPointId)
      if (ancestorCandidate === undefined) errors.push(`suppression ancestor claim is not selected: ${point.id}`)
      if (ancestorPoint?.ownership?.scope !== 'subtree' || !(ancestorPoint?.ownership?.suppressesDescendantsWhenModes ?? []).includes(suppression?.ancestorClaim?.mode)) errors.push(`suppression ancestor does not own descendant scope: ${point.id}`)
      if (expectedPath === undefined || JSON.stringify(expectedPath) !== JSON.stringify(suppression?.path)) errors.push(`suppression path is not the exact parent closure: ${point.id}`)
      if (suppression?.hostGeneration !== snapshot.hostGeneration) errors.push(`suppression generation drift: ${point.id}`)
    }
  }

  for (const ancestorState of pointStates) {
    const ancestorPoint = pointsById.get(ancestorState.id)
    if (ancestorPoint?.ownership?.scope !== 'subtree') continue
    const suppressor = ancestorState.candidates?.find(candidate => candidate.state === 'selected' && ancestorPoint.ownership.suppressesDescendantsWhenModes.includes(candidate.mode))
    if (suppressor === undefined) continue
    for (const descendantState of pointStates) {
      if (descendantState.id === ancestorState.id) continue
      if (pathToAncestor(pointsById, descendantState.id, ancestorState.id) !== undefined && descendantState.state !== 'suppressed') {
        errors.push(`selected ancestor ownership did not suppress descendant: ${ancestorState.id}/${descendantState.id}`)
      }
    }
  }
}

function validateAccesses(suite, snapshots, pointsById, declarationsByKey, errors) {
  const accesses = Array.isArray(suite?.accesses) ? suite.accesses : []
  if (!Array.isArray(suite?.accesses)) errors.push('accesses must be an array')
  const latest = snapshots.at(-1)
  for (const [index, vector] of accesses.entries()) {
    const request = vector?.request
    const result = vector?.result
    errors.push(...schemaErrors(validators.access, request).map(error => `accesses[${index}] schema: ${error}`))
    errors.push(...schemaErrors(validators.result, result).map(error => `accesses[${index}] result schema: ${error}`))
    validateCanonicalIdentity(errors, `accesses[${index}]`, request?.identity)
    const declaration = declarationsByKey.get(claimKey(request))
    const point = pointsById.get(request?.identity?.pointId)
    const candidate = latest?.points?.find(state => state.id === request?.identity?.pointId)?.candidates?.find(item => sameClaim(item, request))
    const command = point?.safeCommands?.find(item => item.id === request?.commandId)
    let authorized = request?.hostGeneration === latest?.hostGeneration
      && declaration !== undefined
      && declaration.contributionId === request?.contributionId
      && (declaration.requestedBindings?.commands ?? []).includes(request?.commandId)
      && candidate?.state === 'selected'
      && candidate?.bindings?.commands?.some(item => item.id === request?.commandId && item.available === true)
      && command !== undefined
    if (authorized) {
      const argumentIds = new Set((command.arguments ?? []).map(argument => argument.id))
      for (const key of Object.keys(request.arguments ?? {})) if (!argumentIds.has(key)) authorized = false
      for (const argument of command.arguments ?? []) {
        const value = request.arguments?.[argument.id]
        if (value === undefined ? argument.required : !validSafeValue(argument.schema, value)) authorized = false
      }
    }
    if (result?.invocationId !== request?.invocationId || result?.hostGeneration !== request?.hostGeneration) errors.push(`accesses[${index}] result correlation drift`)
    if (Number.isInteger(result?.revision) && Number.isInteger(latest?.revision) && result.revision < latest.revision) errors.push(`accesses[${index}] result revision predates request snapshot`)
    const expectedOutcome = authorized ? 'accepted' : 'rejected'
    if (result?.outcome !== expectedOutcome) errors.push(`accesses[${index}] result expected ${expectedOutcome}`)
    if (vector?.expectedAuthorized !== authorized) errors.push(`accesses[${index}] expected authorized=${vector?.expectedAuthorized}, received ${authorized}`)
  }
}

function validateEvents(suite, snapshots, pointsById, declarationsByKey, errors) {
  const vectors = Array.isArray(suite?.events) ? suite.events : []
  if (!Array.isArray(suite?.events)) errors.push('events must be an array')
  const latest = snapshots.at(-1)
  let previousSequence = 0
  for (const [index, vector] of vectors.entries()) {
    const event = vector?.event
    errors.push(...schemaErrors(validators.event, event).map(error => `events[${index}] schema: ${error}`))
    validateCanonicalIdentity(errors, `events[${index}]`, event?.identity)
    const declaration = declarationsByKey.get(claimKey(event))
    const point = pointsById.get(event?.identity?.pointId)
    const candidate = latest?.points?.find(state => state.id === event?.identity?.pointId)?.candidates?.find(item => sameClaim(item, event))
    const descriptor = point?.safeEvents?.find(item => item.id === event?.eventId)
    let accepted = event?.authority === 'host'
      && event?.hostGeneration === latest?.hostGeneration
      && event?.sequence > previousSequence
      && declaration !== undefined
      && declaration.contributionId === event?.contributionId
      && (declaration.requestedBindings?.events ?? []).includes(event?.eventId)
      && candidate?.state === 'selected'
      && candidate?.bindings?.events?.some(item => item.id === event?.eventId && item.available === true)
      && descriptor !== undefined
    if (accepted) {
      const fields = new Map((descriptor.payload ?? []).map(field => [field.id, field]))
      for (const key of Object.keys(event.payload ?? {})) if (!fields.has(key)) accepted = false
      for (const field of descriptor.payload ?? []) {
        const value = event.payload?.[field.id]
        if (value === undefined ? field.required : !validSafeValue(field.schema, value)) accepted = false
      }
    }
    if (event?.sequence > previousSequence) previousSequence = event.sequence
    if (vector?.expectedAccepted !== accepted) errors.push(`events[${index}] expected accepted=${vector?.expectedAccepted}, received ${accepted}`)
  }
}

export function validateExtensionPointControlSuite(suite) {
  const errors = []
  if (suite === null || typeof suite !== 'object' || Array.isArray(suite)) return ['suite must be an object']
  const pointsById = validateCatalog(suite.catalog, errors)
  const { declarationsByKey } = validateDeclarations(suite, pointsById, errors)
  const authorizations = validateAuthorizations(suite, declarationsByKey, errors)
  const snapshots = Array.isArray(suite?.snapshots) ? suite.snapshots : []
  if (!Array.isArray(suite?.snapshots) || snapshots.length === 0) errors.push('snapshots must be a non-empty array')
  for (const [index, snapshot] of snapshots.entries()) validateSnapshot(snapshot, index, pointsById, declarationsByKey, authorizations, errors)
  for (let index = 1; index < snapshots.length; index += 1) {
    if (snapshots[index].hostGeneration !== snapshots[index - 1].hostGeneration) errors.push('snapshot transition changed Host generation')
    if (snapshots[index].revision <= snapshots[index - 1].revision) errors.push('snapshot revision must increase')
  }
  validateAccesses(suite, snapshots, pointsById, declarationsByKey, errors)
  validateEvents(suite, snapshots, pointsById, declarationsByKey, errors)
  return errors
}

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
  else if (vector.mutation === 'callback-in-command') suite.accesses[0].request.arguments.callback = { nativeCallback: 'onChange' }
  else if (vector.mutation === 'command-result-payload') suite.accesses[0].result.payload = { nativeHandle: 'opaque' }
  else if (vector.mutation === 'callback-in-event') suite.events[0].event.payload.callback = { nativeCallback: 'onChange' }
  else if (vector.mutation === 'plugin-forged-event') suite.events[0].event.authority = 'plugin'
  else if (vector.mutation === 'denied-event-delivery') {
    const event = suite.events[0].event
    event.identity = { source: 'https://plugins.example/sync', pluginId: 'sync', pointId: 'composer.reasoning-intensity' }
    event.claimId = 'sync'
    event.contributionId = 'reasoning.sync'
    event.mode = 'proxy'
  }
  else if (vector.mutation === 'unknown-binding') suite.declarations[0].requestedBindings.properties.push('nativeNode')
  else if (vector.mutation === 'partial-authorization-cross-claim') suite.authorizations[0].claimId = 'another-claim'
  else if (vector.mutation === 'overlay-coexistence-not-explicit') {
    const point = suite.catalog.points.find(candidate => candidate.id === 'composer.reasoning-intensity')
    point.modes.find(mode => mode.id === 'overlay').coexistsWith = ['compose', 'proxy']
  } else if (vector.mutation === 'exclusive-double-selection') {
    const originalDeclaration = suite.declarations.find(item => item.identity.pluginId === 'compact')
    const declaration = structuredClone(originalDeclaration)
    declaration.identity = { ...declaration.identity, source: 'https://plugins.example/compact-two', pluginId: 'compact-two' }
    declaration.claimId = 'renderer-two'
    declaration.contributionId = 'reasoning.compact-two'
    suite.declarations.push(declaration)
    const authorization = structuredClone(suite.authorizations.find(item => item.identity.pluginId === 'compact'))
    authorization.identity = structuredClone(declaration.identity)
    authorization.claimId = declaration.claimId
    suite.authorizations.push(authorization)
    const point = suite.snapshots[0].points.find(candidate => candidate.id === 'composer.reasoning-intensity')
    const candidate = structuredClone(point.candidates.find(item => item.identity.pluginId === 'compact'))
    candidate.identity = structuredClone(declaration.identity)
    candidate.claimId = declaration.claimId
    candidate.contributionId = declaration.contributionId
    point.candidates.push(candidate)
  } else if (vector.mutation === 'host-priority-wrong-winner') {
    const pointPolicy = suite.catalog.points.find(point => point.id === 'composer.reasoning-intensity')
    pointPolicy.exclusiveGroups.find(group => group.id === 'renderer').selection = 'host-priority'
    const originalDeclaration = suite.declarations.find(item => item.identity.pluginId === 'compact')
    const declaration = structuredClone(originalDeclaration)
    declaration.identity = { ...declaration.identity, source: 'https://plugins.example/priority', pluginId: 'priority' }
    declaration.claimId = 'priority-renderer'
    declaration.contributionId = 'reasoning.priority'
    declaration.priority = 99
    suite.declarations.push(declaration)
    const authorization = structuredClone(suite.authorizations.find(item => item.identity.pluginId === 'compact'))
    authorization.identity = structuredClone(declaration.identity)
    authorization.claimId = declaration.claimId
    suite.authorizations.push(authorization)
    const point = suite.snapshots[0].points.find(candidate => candidate.id === 'composer.reasoning-intensity')
    const selected = point.candidates.find(item => item.identity.pluginId === 'compact')
    selected.selection.authority = 'host-policy'
    point.groupDecisions[0].authority = 'host-policy'
    const candidate = structuredClone(selected)
    candidate.identity = structuredClone(declaration.identity)
    candidate.claimId = declaration.claimId
    candidate.contributionId = declaration.contributionId
    candidate.priority = declaration.priority
    candidate.state = 'eligible'
    candidate.reason = 'policy.eligible'
    delete candidate.selection
    delete candidate.bindings
    point.candidates.push(candidate)
  } else if (vector.mutation === 'candidate-wrong-point') {
    const source = suite.snapshots[0].points.find(point => point.id === 'composer.reasoning-intensity')
    const target = suite.snapshots[0].points.find(point => point.id === 'composer.model-control')
    target.candidates.push(source.candidates.shift())
  } else if (vector.mutation === 'descendant-not-suppressed') {
    const child = suite.snapshots[0].points.find(point => point.id === 'model.reasoning-intensity')
    child.state = 'active'
    delete child.suppression
    child.candidates[0].state = 'eligible'
    child.candidates[0].reason = 'policy.eligible'
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
    point.candidates.find(candidate => candidate.state === 'selected').bindings.properties[0].value = { nativeNode: true }
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
