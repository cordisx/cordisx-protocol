import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'
import { createHash } from 'node:crypto'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const schemaNames = ['ui-common.v1.schema.json', 'channel-common.v1.schema.json', 'channel-service-config.v1.schema.json', 'channel-manager-common.v2.schema.json', 'channel-runtime-snapshot.v3.schema.json', 'channel-manager-request.v2.schema.json', 'channel-manager-result.v2.schema.json', 'channel-manager-target-request.v1.schema.json', 'channel-manager-target-result.v1.schema.json', 'channel-manager-log-page.v2.schema.json', 'channel-manager-log-export-result.v2.schema.json', 'channel-manager-log-export-readback-request.v1.schema.json', 'channel-manager-log-export-readback-result.v1.schema.json']
const schemas = await Promise.all(schemaNames.map(async name => JSON.parse(await readFile(path.join(root, 'schemas', name), 'utf8'))))
const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true })
addFormats(ajv); schemas.forEach(schema => ajv.addSchema(schema))
const validate = name => ajv.getSchema(schemas.find(schema => schema.$id.endsWith(`/${name}`)).$id)
const validators = Object.fromEntries(['snapshot', 'managerRequest', 'managerResult', 'targetRequest', 'targetResult', 'logPage', 'logExport', 'exportReadbackRequest', 'exportReadbackResult'].map(key => [key, validate({ snapshot: 'channel-runtime-snapshot.v3.schema.json', managerRequest: 'channel-manager-request.v2.schema.json', managerResult: 'channel-manager-result.v2.schema.json', targetRequest: 'channel-manager-target-request.v1.schema.json', targetResult: 'channel-manager-target-result.v1.schema.json', logPage: 'channel-manager-log-page.v2.schema.json', logExport: 'channel-manager-log-export-result.v2.schema.json', exportReadbackRequest: 'channel-manager-log-export-readback-request.v1.schema.json', exportReadbackResult: 'channel-manager-log-export-readback-result.v1.schema.json' }[key])]))
const tokenPattern = /^chm1_[A-Za-z0-9_-]{43}$/
const tokenOf = target => target?.connectionToken ?? target?.connectionDraftToken ?? target?.captureToken ?? target?.credentialDraftToken ?? target?.bindingToken ?? target?.permissionRequestToken
const envelope = ['requestId', 'expectedRevision', 'profileId', 'hostGeneration', 'operation']
const stable = value => JSON.stringify(value)
const fingerprint = value => createHash('sha256').update(stable(value)).digest('hex')
const schemaOk = (name, value, errors) => { if (!validators[name](value)) errors.push(`${name} schema invalid`) }

function privateContext(value, name, errors) {
  schemaOk('snapshot', value?.snapshot, errors)
  if (typeof value?.authorizedAt !== 'string' || Number.isNaN(Date.parse(value.authorizedAt))) errors.push(`${name} missing authoritative now`)
  const tokens = new Map()
  if (!Array.isArray(value?.issuedTokens)) { errors.push(`${name} missing issued tokens`); return tokens }
  for (const record of value.issuedTokens) {
    if (!record || typeof record !== 'object' || !tokenPattern.test(record.token) || !['connection', 'binding', 'session', 'route', 'credential-capture', 'credential-draft', 'connection-draft', 'permission-request', 'log-cursor', 'log-export'].includes(record.kind) || typeof record.operation !== 'string' || !Number.isInteger(record.issuedRevision) || typeof record.consumed !== 'boolean') { errors.push(`${name} malformed issued token`); continue }
    if (record.profileId !== value.snapshot?.profileId || record.hostGeneration !== value.snapshot?.hostGeneration) { errors.push(`${name} token outside snapshot scope`); continue }
    const ephemeral = ['credential-capture', 'credential-draft', 'connection-draft', 'permission-request', 'log-cursor', 'log-export'].includes(record.kind)
    if (ephemeral && (typeof record.expiresAt !== 'string' || Number.isNaN(Date.parse(record.expiresAt)) || (!record.consumed && Date.parse(record.expiresAt) <= Date.parse(value.authorizedAt)))) { errors.push(`${name} token expired`); continue }
    if (!ephemeral && record.expiresAt !== undefined) { errors.push(`${name} persistent token has expiry`); continue }
    if (tokens.has(record.token)) errors.push(`${name} duplicate issued token`)
    tokens.set(record.token, record)
  }
  for (const record of tokens.values()) {
    const source = reference => reference && tokens.get(reference)
    if (record.kind === 'connection') {
      if (record.operation !== 'connection.create' || typeof record.adapterKind !== 'string' || !tokenPattern.test(record.sourceConnectionDraftToken ?? '')) errors.push(`${name} invalid connection lineage`)
    } else if (record.kind === 'credential-capture') {
      if (!['target.credential.capture.create', 'target.credential.capture.rotate'].includes(record.operation) || !['create', 'rotate'].includes(record.purpose) || typeof record.adapterKind !== 'string') errors.push(`${name} invalid capture lineage`)
      if ((record.purpose === 'rotate') !== Boolean(record.sourceConnectionToken)) errors.push(`${name} invalid capture source`)
      if (record.sourceConnectionToken && source(record.sourceConnectionToken)?.kind !== 'connection') errors.push(`${name} invalid capture connection source`)
    } else if (record.kind === 'credential-draft') {
      const capture = source(record.sourceCaptureToken)
      if (record.operation !== 'credential.capture' || !capture || capture.kind !== 'credential-capture' || record.purpose !== capture.purpose || record.adapterKind !== capture.adapterKind || record.sourceConnectionToken !== capture.sourceConnectionToken) errors.push(`${name} invalid credential draft lineage`)
    } else if (record.kind === 'connection-draft') {
      if (!['target.connection.create', 'target.connection.create.simulator'].includes(record.operation) || typeof record.adapterKind !== 'string') errors.push(`${name} invalid connection draft lineage`)
      const credential = source(record.sourceCredentialDraftToken)
      if (record.operation === 'target.connection.create.simulator') {
        if (record.adapterKind !== 'simulator' || record.sourceCredentialDraftToken) errors.push(`${name} invalid simulator draft lineage`)
      } else if (!credential || credential.kind !== 'credential-draft' || credential.purpose !== 'create' || credential.adapterKind !== record.adapterKind) errors.push(`${name} invalid credentialed draft lineage`)
    } else if (record.kind === 'permission-request') {
      const pending = value.snapshot.pendingAuthorizations.find(item => item.permissionRequestToken === record.token)
      if (!record.capability || !Array.isArray(record.allowedOperations) || stable(record.allowedOperations) !== stable(record.allowedOperations.slice().sort()) || (!record.consumed && stable(record.allowedOperations) !== stable(pending?.availableOperations)) || record.source !== 'host-pending-inbound' || !record.canonicalIdentity || typeof record.canonicalIdentity !== 'object' || Array.isArray(record.canonicalIdentity) || !Object.keys(record.canonicalIdentity).every(key => ['source', 'pluginId'].includes(key)) || typeof record.canonicalIdentity.source !== 'string' || (record.canonicalIdentity.pluginId !== undefined && typeof record.canonicalIdentity.pluginId !== 'string') || !['private', 'profile', 'workspace'].includes(record.resolvedScope) || !/^sha256:[a-f0-9]{64}$/.test(record.securityFingerprint) || typeof record.inboxRecordId !== 'string' || !/^[A-Za-z0-9._:-]{1,128}$/.test(record.inboxRecordId) || !Number.isInteger(record.leaseGeneration) || record.leaseGeneration < 0) errors.push(`${name} invalid permission lineage`)
    } else if (record.kind === 'binding') {
      const binding = value.snapshot.bindings.find(item => item.bindingToken === record.token)
      if (record.operation !== 'binding.open' || source(record.connectionToken)?.kind !== 'connection' || source(record.sessionToken)?.kind !== 'session' || source(record.routeToken)?.kind !== 'route' || !Number.isInteger(record.bindingRevision) || !binding || stable({ connectionToken: record.connectionToken, sessionToken: record.sessionToken, routeToken: record.routeToken, bindingRevision: record.bindingRevision }) !== stable({ connectionToken: binding.connectionToken, sessionToken: binding.sessionToken, routeToken: binding.routeToken, bindingRevision: binding.bindingRevision })) errors.push(`${name} invalid binding lineage`)
    } else if (record.kind === 'log-cursor') {
      if (record.operation !== 'logs.query' || !tokenPattern.test(record.connectionToken ?? '') || !Number.isInteger(record.snapshotRevision) || typeof record.queryFingerprint !== 'string' || !/^[a-f0-9]{64}$/.test(record.queryFingerprint)) errors.push(`${name} invalid log cursor lineage`)
    } else if (record.kind === 'log-export') {
      if (record.operation !== 'logs.export' || !tokenPattern.test(record.connectionToken ?? '') || !Number.isInteger(record.snapshotRevision) || !tokenPattern.test(record.sourceConnectionToken ?? '') || record.connectionToken !== record.sourceConnectionToken) errors.push(`${name} invalid log export lineage`)
    }
  }
  return tokens
}
function exactResult(result, request, errors, prefix) {
  for (const field of envelope) if (result?.[field] !== request?.[field]) errors.push(`${prefix} ${field} mismatch`)
  if (prefix === 'manager result' && stable(result?.target) !== stable(request?.target)) errors.push('manager result target mismatch')
}
function token(record, kind, request, errors, label) {
  if (!record) { errors.push(`${label} not issued`); return }
  if (record.kind !== kind) errors.push(`${label} wrong kind`)
  if (record.profileId !== request.profileId || record.hostGeneration !== request.hostGeneration) errors.push(`${label} wrong scope`)
  if (['credential-capture', 'credential-draft', 'connection-draft', 'permission-request'].includes(kind) && record.issuedRevision !== request.expectedRevision) errors.push(`${label} wrong revision`)
}
function permitted(snapshot, target, operation, errors) {
  let operations
  if (target.kind === 'connection' || target.kind === 'log') operations = snapshot.accounts.find(account => account.connectionToken === target.connectionToken)?.availableOperations
  else if (target.kind === 'binding') operations = snapshot.bindings.find(binding => binding.bindingToken === target.bindingToken)?.availableOperations
  else if (target.kind === 'permission-request') operations = snapshot.pendingAuthorizations.find(item => item.permissionRequestToken === target.permissionRequestToken)?.availableOperations
  else operations = snapshot.availableOperations
  if (!operations?.includes(operation)) errors.push(`operation not advertised: ${operation}`)
}
function unchangedOnFailure(preValue, postValue, errors, prefix) {
  if (stable(preValue?.issuedTokens) !== stable(postValue?.issuedTokens)) errors.push(`${prefix} failure changed issued tokens`)
  if (stable(preValue?.snapshot) !== stable(postValue?.snapshot)) errors.push(`${prefix} failure changed snapshot`)
}
function snapshotFence(preValue, postValue, request, result, errors, prefix) {
  const pre = preValue.snapshot; const post = postValue.snapshot
  if (request.profileId !== pre.profileId || request.hostGeneration !== pre.hostGeneration || request.expectedRevision !== pre.revision) errors.push(`${prefix} request snapshot fence mismatch`)
  if (result.status === 'applied') {
    if (post.profileId !== pre.profileId || post.hostGeneration !== pre.hostGeneration) errors.push(`${prefix} post snapshot scope mismatch`)
    if (post.revision !== result.revision) errors.push(`${prefix} post snapshot revision mismatch`)
  } else if (result.revision !== pre.revision) errors.push(`${prefix} failed result revision mismatch`)
}
function sameExceptRevision(before, after) {
  if (!before || !after) return false
  const left = { ...before }; const right = { ...after }; delete left.revision; delete right.revision
  return stable(left) === stable(right)
}
function snapshotDelta(preValue, postValue, request, result, errors, prefix) {
  const before = preValue.snapshot; const after = postValue.snapshot
  if (result.status !== 'applied') return
  if (request.operation.startsWith('target.')) {
    if (!sameExceptRevision(before, after)) errors.push(`${prefix} issuance changed snapshot`)
    return
  }
  if (request.operation === 'connection.create') {
    const previous = new Map(before.accounts.map(account => [account.connectionToken, account]))
    const next = new Map(after.accounts.map(account => [account.connectionToken, account]))
    for (const [key, account] of previous) if (stable(account) !== stable(next.get(key))) errors.push(`${prefix} create mutated existing account`)
    const additions = [...next.keys()].filter(key => !previous.has(key))
    if (stable(additions) !== stable([result.connectionToken])) errors.push(`${prefix} create account delta mismatch`)
    const created = next.get(result.connectionToken)
    if (created?.adapterKind !== undefined && created.adapterKind !== postValue.issuedTokens.find(record => record.token === result.connectionToken)?.adapterKind) errors.push(`${prefix} create account adapter mismatch`)
    if (created?.displayName !== undefined && created.displayName !== request.draft?.displayName) errors.push(`${prefix} create account display name mismatch`)
    if (stable(before.bindings) !== stable(after.bindings) || stable(before.pendingAuthorizations) !== stable(after.pendingAuthorizations)) errors.push(`${prefix} create changed unrelated snapshot`)
    return
  }
  if (request.operation.startsWith('permission.')) {
    const pending = before.pendingAuthorizations.filter(item => item.permissionRequestToken !== request.target.permissionRequestToken)
    if (stable(pending) !== stable(after.pendingAuthorizations) || stable(before.accounts) !== stable(after.accounts) || stable(before.bindings) !== stable(after.bindings)) errors.push(`${prefix} permission snapshot delta mismatch`)
    return
  }
  if (request.operation === 'credential.capture') {
    if (!sameExceptRevision(before, after)) errors.push(`${prefix} capture changed snapshot`)
    return
  }
  if (request.operation.startsWith('binding.')) {
    const beforeBindings = new Map(before.bindings.map(binding => [binding.bindingToken, binding]))
    const afterBindings = new Map(after.bindings.map(binding => [binding.bindingToken, binding]))
    for (const [key, binding] of beforeBindings) {
      if (key === request.target.bindingToken) continue
      if (stable(binding) !== stable(afterBindings.get(key))) errors.push(`${prefix} changed unrelated binding`)
    }
    const beforeTarget = beforeBindings.get(request.target.bindingToken)
    const target = afterBindings.get(request.target.bindingToken)
    if (request.operation === 'binding.open') errors.push(`${prefix} binding.open is not advertised`)
    else if (request.operation === 'binding.unbind' ? target !== undefined : target?.state !== (request.operation === 'binding.archive' ? 'archived' : 'active')) errors.push(`${prefix} binding delta mismatch`)
    else if (target && stable({ ...target, state: beforeTarget?.state }) !== stable(beforeTarget)) errors.push(`${prefix} binding changed beyond state`)
    if (stable(before.accounts) !== stable(after.accounts) || stable(before.pendingAuthorizations) !== stable(after.pendingAuthorizations)) errors.push(`${prefix} binding changed unrelated snapshot`)
    return
  }
  const sourceToken = request.target.connectionToken
  const beforeAccounts = before.accounts.filter(account => account.connectionToken !== sourceToken)
  const afterAccounts = after.accounts.filter(account => account.connectionToken !== sourceToken)
  if (stable(beforeAccounts) !== stable(afterAccounts) || stable(before.bindings) !== stable(after.bindings) || stable(before.pendingAuthorizations) !== stable(after.pendingAuthorizations)) errors.push(`${prefix} changed unrelated snapshot`)
  const beforeTarget = before.accounts.find(account => account.connectionToken === sourceToken)
  const afterTarget = after.accounts.find(account => account.connectionToken === sourceToken)
  if (request.operation === 'connection.update') {
    const beforeSafe = { ...beforeTarget }; const afterSafe = { ...afterTarget }; delete beforeSafe.displayName; delete afterSafe.displayName
    const displayName = request.patch.displayName === undefined ? beforeTarget?.displayName : request.patch.displayName
    if (stable(beforeSafe) !== stable(afterSafe) || afterTarget?.displayName !== displayName) errors.push(`${prefix} update account delta mismatch`)
  } else if (['connection.enable', 'connection.disable', 'connection.reconnect'].includes(request.operation)) {
    const expectedState = { 'connection.enable': 'starting', 'connection.disable': 'disabled', 'connection.reconnect': 'retrying' }[request.operation]
    const beforeSafe = { ...beforeTarget }; const afterSafe = { ...afterTarget }; delete beforeSafe.connectionState; delete afterSafe.connectionState
    if (afterTarget?.connectionState !== expectedState || stable(beforeSafe) !== stable(afterSafe)) errors.push(`${prefix} connection state delta mismatch`)
  } else if (['connection.rotate-credential', 'logs.query', 'logs.export'].includes(request.operation) && stable(beforeTarget) !== stable(afterTarget)) errors.push(`${prefix} operation changed target snapshot`)
}
function exactTokenDelta(pre, post, inputToken, outputToken, errors, prefix) {
  for (const [key, before] of pre) {
    const after = post.get(key)
    if (!after) { errors.push(`${prefix} removed unrelated issued token`); continue }
    if (key === inputToken) {
      const expected = { ...before, consumed: true }
      if (stable(after) !== stable(expected)) errors.push(`${prefix} input token mutated beyond consumption`)
    } else if (stable(after) !== stable(before)) errors.push(`${prefix} mutated unrelated issued token`)
  }
  const additions = [...post.keys()].filter(key => !pre.has(key))
  const expected = outputToken ? [outputToken] : []
  if (stable(additions.sort()) !== stable(expected.sort())) errors.push(`${prefix} issued token delta mismatch`)
}
function inputConsumed(pre, post, tokenValue, errors, label) { if (!pre.get(tokenValue)?.consumed && post.get(tokenValue)?.consumed !== true) errors.push(`${label} not consumed atomically`) }
function output(post, value, kind, request, errors, label) { const record = post.get(value); token(record, kind, request, errors, label); if (record?.consumed) errors.push(`${label} is already consumed`); return record }

export function validateTargetTransition(result, request, preValue, postValue) {
  const errors = []
  schemaOk('targetRequest', request, errors); schemaOk('targetResult', result, errors)
  const pre = privateContext(preValue, 'pre', errors); const post = privateContext(postValue, 'post', errors)
  if (errors.length) return errors
  exactResult(result, request, errors, 'target result')
  snapshotFence(preValue, postValue, request, result, errors, 'target')
  snapshotDelta(preValue, postValue, request, result, errors, 'target')
  if (result.status !== 'applied') { unchangedOnFailure(preValue, postValue, errors, 'target'); return errors }
  if (result.revision !== request.expectedRevision) errors.push('target result revision mismatch')
  permitted(preValue.snapshot, request.target, request.operation, errors)
  const produced = tokenOf(result.target)
  if (request.operation.startsWith('target.credential.capture')) {
    const source = request.operation.endsWith('.rotate') ? pre.get(request.target.connectionToken) : undefined
    if (source) token(source, 'connection', request, errors, 'source connection')
    const record = output(post, produced, 'credential-capture', request, errors, 'capture target')
    if (record?.operation !== request.operation) errors.push('capture target issuance operation mismatch')
    const inheritedAdapter = source?.adapterKind ?? request.adapterKind
    if (record?.purpose !== request.purpose || record?.adapterKind !== inheritedAdapter || record?.sourceConnectionToken !== request.target.connectionToken) errors.push('capture target lineage mismatch')
    exactTokenDelta(pre, post, undefined, produced, errors, 'target')
  } else if (request.operation === 'target.connection.create') {
    const draft = pre.get(request.target.credentialDraftToken); token(draft, 'credential-draft', request, errors, 'credential draft')
    if (draft?.consumed) errors.push('credential draft replayed')
    if (draft?.purpose !== 'create') errors.push('credential draft wrong purpose')
    inputConsumed(pre, post, request.target.credentialDraftToken, errors, 'credential draft')
    const record = output(post, produced, 'connection-draft', request, errors, 'connection draft')
    if (record?.operation !== request.operation) errors.push('connection draft issuance operation mismatch')
    if (record?.adapterKind !== draft?.adapterKind || record?.sourceCredentialDraftToken !== draft?.token) errors.push('connection draft lineage mismatch')
    exactTokenDelta(pre, post, request.target.credentialDraftToken, produced, errors, 'target')
  } else if (request.operation === 'target.connection.create.simulator') {
    const record = output(post, produced, 'connection-draft', request, errors, 'connection draft')
    if (record?.operation !== request.operation) errors.push('connection draft issuance operation mismatch')
    if (record?.adapterKind !== 'simulator' || record?.sourceCredentialDraftToken) errors.push('simulator draft lineage mismatch')
    exactTokenDelta(pre, post, undefined, produced, errors, 'target')
  }
  return errors
}

export function validateManagerTransition(result, request, preValue, postValue) {
  const errors = []
  schemaOk('managerRequest', request, errors); schemaOk('managerResult', result, errors)
  const pre = privateContext(preValue, 'pre', errors); const post = privateContext(postValue, 'post', errors)
  if (errors.length) return errors
  exactResult(result, request, errors, 'manager result')
  snapshotFence(preValue, postValue, request, result, errors, 'manager')
  snapshotDelta(preValue, postValue, request, result, errors, 'manager')
  if (result.status !== 'applied') { unchangedOnFailure(preValue, postValue, errors, 'manager'); return errors }
  if (result.revision !== request.expectedRevision + 1) errors.push('manager result revision mismatch')
  permitted(preValue.snapshot, request.target, request.operation, errors)
  const inputValue = tokenOf(request.target); const kinds = { connection: 'connection', 'connection-draft': 'connection-draft', 'credential-capture': 'credential-capture', binding: 'binding', log: 'connection', 'permission-request': 'permission-request' }
  const primary = pre.get(inputValue); token(primary, kinds[request.target.kind], request, errors, 'manager target')
  if (primary?.consumed) errors.push('manager target replayed')
  if (request.target.kind === 'binding' && (primary?.bindingRevision !== request.target.bindingRevision || preValue.snapshot.bindings.find(binding => binding.bindingToken === inputValue)?.bindingRevision !== request.target.bindingRevision)) errors.push('binding revision mismatch')
  if (request.operation === 'credential.capture') {
    if (!['target.credential.capture.create', 'target.credential.capture.rotate'].includes(primary?.operation) || primary?.purpose !== primary?.operation.split('.').at(-1)) errors.push('capture target issuance lineage mismatch')
    inputConsumed(pre, post, inputValue, errors, 'capture target')
    const draft = output(post, result.credentialDraftToken, 'credential-draft', request, errors, 'credential draft')
    if (draft?.operation !== 'credential.capture') errors.push('credential draft issuance operation mismatch')
    if (draft?.purpose !== primary?.purpose || draft?.adapterKind !== primary?.adapterKind || draft?.sourceCaptureToken !== primary?.token || draft?.sourceConnectionToken !== primary?.sourceConnectionToken) errors.push('credential draft lineage mismatch')
    exactTokenDelta(pre, post, inputValue, result.credentialDraftToken, errors, 'manager')
  } else if (request.operation === 'connection.create') {
    inputConsumed(pre, post, inputValue, errors, 'connection draft')
    if (!primary?.adapterKind) errors.push('connection draft missing adapter lineage')
    if (!['target.connection.create', 'target.connection.create.simulator'].includes(primary?.operation)) errors.push('connection draft issuance operation mismatch')
    const created = output(post, result.connectionToken, 'connection', request, errors, 'created connection')
    if (created?.adapterKind !== primary?.adapterKind || created?.sourceConnectionDraftToken !== primary?.token || created?.operation !== 'connection.create') errors.push('created connection lineage mismatch')
    exactTokenDelta(pre, post, inputValue, result.connectionToken, errors, 'manager')
  } else if (request.operation === 'connection.rotate-credential') {
    if (primary?.operation !== 'connection.create') errors.push('rotation connection issuance lineage mismatch')
    const draft = pre.get(request.draft?.credentialDraftToken); token(draft, 'credential-draft', request, errors, 'rotation credential draft')
    if (draft?.consumed) errors.push('rotation credential draft replayed')
    if (draft?.purpose !== 'rotate' || draft?.sourceConnectionToken !== inputValue) errors.push('rotation credential draft lineage mismatch')
    if (draft?.operation !== 'credential.capture') errors.push('rotation credential draft issuance operation mismatch')
    inputConsumed(pre, post, request.draft?.credentialDraftToken, errors, 'rotation credential draft')
    exactTokenDelta(pre, post, request.draft?.credentialDraftToken, undefined, errors, 'manager')
  } else if (request.operation.startsWith('permission.')) {
    if (primary?.operation !== request.operation || !primary?.allowedOperations?.includes(request.operation)) errors.push('permission request operation mismatch')
    inputConsumed(pre, post, inputValue, errors, 'permission request')
    const desired = request.operation.replace('permission.', '')
    const expected = desired === 'allow-once' ? 'granted-once' : desired === 'allow-persistent' ? 'granted-persistent' : 'denied'
    if (result.permission?.state !== expected || result.permission?.capability !== primary?.capability) errors.push('permission readback mismatch')
    if (primary?.source !== 'host-pending-inbound') errors.push('remote event cannot self-approve')
    exactTokenDelta(pre, post, inputValue, undefined, errors, 'manager')
  } else if (request.operation.startsWith('binding.')) {
    exactTokenDelta(pre, post, undefined, undefined, errors, 'manager')
  } else if (request.operation.startsWith('logs.')) {
    exactTokenDelta(pre, post, undefined, undefined, errors, 'manager')
  } else {
    exactTokenDelta(pre, post, undefined, undefined, errors, 'manager')
  }
  return errors
}

export function validateLogResponse(response, request, contextValue, exportResult = false, postValue = contextValue) {
  const errors = []
  schemaOk('managerRequest', request, errors); schemaOk(exportResult ? 'logExport' : 'logPage', response, errors)
  const tokens = privateContext(contextValue, 'context', errors); const post = privateContext(postValue, 'log post', errors)
  if (errors.length) return errors
  if (request?.operation !== (exportResult ? 'logs.export' : 'logs.query')) errors.push('log request operation mismatch')
  for (const field of ['requestId', 'expectedRevision', 'profileId', 'hostGeneration']) if (response?.[field] !== request?.[field]) errors.push(`log response ${field} mismatch`)
  if (stable(response?.target) !== stable(request?.target)) errors.push('log response target mismatch')
  if (!exportResult && response.snapshotRevision !== contextValue.snapshot.revision) errors.push('log response snapshot revision mismatch')
  token(tokens.get(request?.target?.connectionToken), 'connection', request, errors, 'log connection')
  permitted(contextValue.snapshot, request.target, request.operation, errors)
  if (!exportResult) {
    if (stable(contextValue.snapshot) !== stable(postValue.snapshot) || stable(contextValue.issuedTokens) !== stable(postValue.issuedTokens)) errors.push('log page changed state')
    const query = request.query
    if (!query || !Number.isInteger(query.limit) || query.limit < 1 || query.limit > 1000) errors.push('log query invalid')
    if (response.entries.length > query.limit) errors.push('log page exceeds limit')
    for (const entry of response.entries) {
      if (entry.connectionToken !== request.target.connectionToken) errors.push('log entry target mismatch')
      if (query.filter?.levels && !query.filter.levels.includes(entry.level)) errors.push('log entry level filter mismatch')
      if (query.filter?.events && !query.filter.events.includes(entry.event)) errors.push('log entry event filter mismatch')
      if (entry.bindingToken) {
        const binding = contextValue.snapshot.bindings.find(item => item.bindingToken === entry.bindingToken)
        const privateBinding = tokens.get(entry.bindingToken)
        if (!binding || privateBinding?.kind !== 'binding' || binding.connectionToken !== request.target.connectionToken) errors.push('log entry binding lineage mismatch')
      }
    }
    if (response.nextCursor) {
      const cursor = post.get(response.nextCursor)
      if (!cursor || cursor.kind !== 'log-cursor' || cursor.consumed || cursor.connectionToken !== request.target.connectionToken || cursor.snapshotRevision !== contextValue.snapshot.revision || cursor.queryFingerprint !== fingerprint(query)) errors.push('log cursor registry mismatch')
    }
  } else if (response.status === 'created') {
    if (stable(contextValue.snapshot) !== stable(postValue.snapshot)) errors.push('log export changed snapshot')
    const record = post.get(response.exportId)
    if (!record || record.kind !== 'log-export' || record.consumed || record.connectionToken !== request.target.connectionToken || record.snapshotRevision !== contextValue.snapshot.revision || record.expiresAt !== response.expiresAt || record.issuedRevision !== request.expectedRevision) errors.push('log export registry mismatch')
    exactTokenDelta(tokens, post, undefined, response.exportId, errors, 'log export')
  }
  return errors
}

export function validateExportReadback(result, request, preValue, postValue) {
  const errors = []
  schemaOk('exportReadbackRequest', request, errors); schemaOk('exportReadbackResult', result, errors)
  const pre = privateContext(preValue, 'readback pre', errors); const post = privateContext(postValue, 'readback post', errors)
  if (errors.length) return errors
  for (const field of ['requestId', 'profileId', 'hostGeneration', 'expectedRevision', 'operation']) if (result[field] !== request[field]) errors.push(`export readback ${field} mismatch`)
  if (stable(result.target) !== stable(request.target)) errors.push('export readback target mismatch')
  const record = pre.get(request.target.exportId)
  if (!record || record.kind !== 'log-export' || record.consumed || record.profileId !== request.profileId || record.hostGeneration !== request.hostGeneration || record.issuedRevision !== request.expectedRevision || record.snapshotRevision !== request.expectedRevision) errors.push('export readback registry mismatch')
  if (result.status === 'acknowledged') {
    if (result.revision !== request.expectedRevision + 1 || postValue.snapshot.revision !== result.revision || !post.get(request.target.exportId)?.consumed) errors.push('export readback consume mismatch')
    exactTokenDelta(pre, post, request.target.exportId, undefined, errors, 'export readback')
  } else unchangedOnFailure(preValue, postValue, errors, 'export readback')
  return errors
}

export function validateCursorTransition(value) {
  const errors = []
  const { first, second, context } = value
  const tokens = privateContext(context, 'cursor context', errors)
  if (errors.length) return errors
  if (!first?.query || stable(first.query) !== stable(second?.query) || first.profileId !== second?.profileId || first.hostGeneration !== second?.hostGeneration || first.connectionToken !== second?.connectionToken || first.snapshotRevision !== second?.snapshotRevision) errors.push('cursor continuity mismatch')
  const cursor = tokens.get(first.nextCursor)
  if (!cursor || cursor.kind !== 'log-cursor' || cursor.consumed || cursor.connectionToken !== first.connectionToken || cursor.snapshotRevision !== first.snapshotRevision || cursor.queryFingerprint !== fingerprint(first.query)) errors.push('cursor issuance mismatch')
  if (second.cursor !== first.nextCursor || !second.consume || second.consume !== first.nextCursor) errors.push('cursor consume target mismatch')
  return errors
}

let failures = 0
const mutationAt = (value, pointer, replacement) => {
  const parts = pointer.split('/').slice(1)
  let target = value
  for (const part of parts.slice(0, -1)) target = target[part]
  target[parts.at(-1)] = replacement
}
const requiredMutations = new Set(['permission-cross-decision', 'permission-private-field-mutation', 'capture-create-to-rotate', 'simulator-to-feishu', 'create-unrelated-account', 'replay-connection-draft', 'extra-issued-token', 'expired-capture', 'binding-cross-lineage', 'binding-revision-replay', 'selectors-change-display-name', 'unrelated-token-mutation', 'failure-state-mutation', 'log-result-expiry-mismatch', 'unknown-private-kind', 'cursor-unregistered', 'cursor-expired', 'cursor-replay', 'cursor-wrong-connection', 'cursor-wrong-filter', 'cursor-wrong-revision', 'export-expired', 'export-replay', 'export-unregistered', 'export-cross-profile'])
const seenMutations = new Set()
const requiredVectors = new Set(['valid/persistent-connection-across-revision.json', 'valid/binding-archive-v2.json', 'valid/log-page-v2.json', 'valid/log-export-v2.json', 'valid/log-cursor-transition-v1.json', 'valid/log-export-readback-v1.json', 'invalid/permission-raw-scope.json', 'invalid/permission-token-unregistered.json', 'invalid/private-registry-mutations.json', 'invalid/operation-deltas.json', 'invalid/log-mutations.json', 'invalid/log-cursor-mutations-v1.json', 'invalid/log-export-readback-mutations-v1.json'])
const seenVectors = new Set()
for (const kind of ['valid', 'invalid']) {
  const directory = path.join(root, 'test-vectors/channel-manager-v2', kind)
  for (const file of (await readdir(directory)).filter(file => file.endsWith('.json')).sort()) {
    seenVectors.add(`${kind}/${file}`)
    const vector = JSON.parse(await readFile(path.join(directory, file), 'utf8'))
    const base = vector.baseFile ? JSON.parse(await readFile(path.join(root, 'test-vectors/channel-manager-v2/valid', vector.baseFile), 'utf8')) : vector.base
    const cases = vector.case === 'mutation-matrix'
      ? vector.mutations.map(mutation => { const item = structuredClone(base); for (const patch of mutation.patches) mutationAt(item, patch.path, patch.value); return { ...item, expectedErrors: mutation.expectedErrors, id: mutation.id } })
      : [vector]
    for (const item of cases) {
      if (item.id) seenMutations.add(item.id)
      const errors = item.case === 'target-transition' ? validateTargetTransition(item.result, item.request, item.preContext, item.postContext)
        : item.case === 'cursor-transition' ? validateCursorTransition(item)
        : item.case === 'export-readback' ? validateExportReadback(item.result, item.request, item.preContext, item.postContext)
        : item.case === 'log-response' ? validateLogResponse(item.response, item.request, item.context, item.exportResult, item.postContext)
          : validateManagerTransition(item.result, item.request, item.preContext, item.postContext)
      const expected = kind === 'valid' ? [] : item.expectedErrors
      if (stable([...errors].sort()) !== stable([...expected].sort())) { console.error(`${kind}/${file}${item.id ? `#${item.id}` : ''}`, { expected, errors }); failures += 1 }
    }
  }
}
for (const id of requiredMutations) if (!seenMutations.has(id)) { console.error(`missing required mutation: ${id}`); failures += 1 }
for (const file of requiredVectors) if (!seenVectors.has(file)) { console.error(`missing required vector: ${file}`); failures += 1 }
if (failures) throw new Error(`${failures} Channel Manager v2 transition vector(s) failed`)
console.log('Channel Manager v2 transition conformance: all vectors passed')
