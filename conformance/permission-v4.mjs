import { createHash } from 'node:crypto'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const schemaDirectory = path.join(root, 'schemas')
const schemas = new Map()
for (const file of (await readdir(schemaDirectory)).filter(file => file.endsWith('.schema.json')).sort()) {
  const schema = JSON.parse(await readFile(path.join(schemaDirectory, file), 'utf8'))
  schemas.set(schema.$id, schema)
}
const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true })
addFormats(ajv)
for (const schema of schemas.values()) ajv.addSchema(schema)

const ids = Object.freeze({
  catalog:
    'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/permission-capability-catalog.v3.schema.json',
  decision:
    'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/permission-authorization-decision.v4.schema.json',
  manifest: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/plugin-manifest.v5.schema.json',
  plan:
    'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/permission-authorization-plan.v4.schema.json',
})
const readOperations = Object.freeze(['inspect-structure', 'read-text', 'read-attributes', 'read-state'])
const modifyOperations = Object.freeze([
  'set-text',
  'set-attribute',
  'insert-owned-structured-child',
  'remove-owned-child',
  'focus',
])
const certifiedEligible = new Set(['ui.extension-points.render', 'ui.host-dom.read', 'ui.host-dom.modify'])
const digest = value => `sha256:${createHash('sha256').update(JSON.stringify(value)).digest('hex')}`
function normalized(value) {
  if (Array.isArray(value)) {
    return value.map(normalized).sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)))
  }
  if (value === null || typeof value !== 'object') return value
  return Object.fromEntries(
    Object.entries(value).sort(([left], [right]) => left.localeCompare(right)).map((
      [key, entry],
    ) => [key, normalized(entry)]),
  )
}

function schemaErrors(value) {
  const validate = ajv.getSchema(value?.$schema)
  if (validate === undefined) return ['unknown schema']
  if (validate(value)) return []
  return (validate.errors ?? []).map(error => `${error.instancePath || '/'} ${error.message}`)
}

function semanticErrors(value) {
  const issues = schemaErrors(value)
  if (value?.$schema === ids.manifest) {
    const seen = new Set()
    for (const declaration of value.capabilities ?? []) {
      if (seen.has(declaration.name)) issues.push(`duplicate manifest capability ${declaration.name}`)
      seen.add(declaration.name)
      for (const [field, text] of Object.entries(declaration.rationale ?? {})) {
        const fallback = text?.fallback
        if (typeof fallback !== 'string') continue
        if (/[\u0000-\u001f\u007f<>]/u.test(fallback)) {
          issues.push(`${declaration.name}.${field} contains control characters or markup`)
        }
        if (/(?:https?:\/\/|javascript:)/iu.test(fallback)) {
          issues.push(`${declaration.name}.${field} contains a link or script scheme`)
        }
        if (
          /(?:cordisx|host).*(?:verified|approved|guaranteed|safe)|(?:CordisX|宿主).*(?:验证|批准|保证|安全)/iu.test(
            fallback,
          )
        ) issues.push(`${declaration.name}.${field} impersonates a Host security claim`)
      }
    }
  }
  if (value?.$schema === ids.catalog) {
    const expected = schemas.get(
      'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/permission-common.v4.schema.json',
    ).$defs.capability.enum
    const seen = new Set()
    for (const entry of value.entries ?? []) {
      if (seen.has(entry.capability)) issues.push(`duplicate catalog capability ${entry.capability}`)
      seen.add(entry.capability)
      if (entry.certifiedImplicitApproval !== certifiedEligible.has(entry.capability)) {
        issues.push(`${entry.capability} has invalid Certified eligibility`)
      }
      if (
        entry.capability === 'ui.host-dom.modify'
        && (entry.sensitivity !== 'high-risk' || entry.persistentAllow !== false)
      ) issues.push('ui.host-dom.modify must be high-risk without persistent allow')
      if (entry.capability === 'ui.host-dom.read' && entry.sensitivity !== 'sensitive') {
        issues.push('ui.host-dom.read must be sensitive')
      }
    }
    for (const capability of expected) if (!seen.has(capability)) issues.push(`catalog is missing ${capability}`)
  }
  if (
    value?.$schema
      === 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/host-dom-root-catalog.v1.schema.json'
  ) {
    const seen = new Set()
    for (const descriptor of value.roots ?? []) {
      if (seen.has(descriptor.rootId)) issues.push(`duplicate Host DOM root ${descriptor.rootId}`)
      seen.add(descriptor.rootId)
    }
  }
  if (value?.$schema === ids.plan) {
    const seen = new Set()
    for (const declaration of value.declarations ?? []) {
      if (seen.has(declaration.capability)) issues.push(`duplicate plan capability ${declaration.capability}`)
      seen.add(declaration.capability)
      if (!declaration.allowedDecisions?.includes(declaration.defaultDecision)) {
        issues.push(`${declaration.capability} default decision is not allowed`)
      }
      if (declaration.persistentAllow === false && declaration.allowedDecisions?.includes('allow-persistent')) {
        issues.push(`${declaration.capability} exposes forbidden persistent allow`)
      }
      if (declaration.authorizationMode === 'certified-implicit') {
        if (!certifiedEligible.has(declaration.capability)) {
          issues.push(`${declaration.capability} is not Certified eligible`)
        }
        const projection = declaration.certification
        if (projection?.source !== value.identity?.source || projection?.pluginId !== value.identity?.pluginId) {
          issues.push(`${declaration.capability} certification identity mismatch`)
        }
        if (!(Date.parse(projection?.reviewedAt) < Date.parse(projection?.expiresAt))) {
          issues.push(`${declaration.capability} certification interval is invalid`)
        }
      }
    }
  }
  if (value?.$schema === ids.decision) {
    const seen = new Set()
    for (const decision of value.decisions ?? []) {
      if (seen.has(decision.capability)) issues.push(`duplicate decision capability ${decision.capability}`)
      seen.add(decision.capability)
    }
  }
  return issues
}

let failures = 0
function expect(condition, message) {
  if (!condition) {
    console.error(message)
    failures += 1
  }
}
function expectValid(value, message) {
  const issues = semanticErrors(value)
  expect(issues.length === 0, `${message}: ${issues.join('; ')}`)
}
function expectInvalid(value, message) {
  expect(semanticErrors(value).length > 0, message)
}

const vectorRoot = path.join(root, 'test-vectors/platform/permissions-v4')
for (const file of (await readdir(path.join(vectorRoot, 'valid'))).filter(file => file.endsWith('.json')).sort()) {
  expectValid(JSON.parse(await readFile(path.join(vectorRoot, 'valid', file), 'utf8')), `valid vector ${file}`)
}
for (
  const file of (await readdir(path.join(vectorRoot, 'invalid'))).filter(file =>
    file.endsWith('.json') && file !== 'semantic-cases.json'
  ).sort()
) {
  expectInvalid(
    JSON.parse(await readFile(path.join(vectorRoot, 'invalid', file), 'utf8')),
    `invalid vector ${file} must fail closed`,
  )
}

const catalogV1 = JSON.parse(
  await readFile(path.join(root, 'test-vectors/platform/permissions-v2/valid/catalog.json'), 'utf8'),
)
const presentation = (id, name, risk, limitation) => ({
  name: { key: `${id}.name`, fallback: name },
  description: { key: `${id}.description`, fallback: name },
  risk: { key: `${id}.risk`, fallback: risk },
  limitation: { key: `${id}.limitation`, fallback: limitation },
})
const catalog = {
  $schema: ids.catalog,
  schemaVersion: 3,
  catalogVersion: '2026-08-30',
  entries: [
    ...catalogV1.entries.map(entry => ({ ...entry, resourceClass: 'non-dom', certifiedImplicitApproval: false })),
    {
      capability: 'ui.extension-points.render',
      providerFamily: 'ui',
      resourceClass: 'dom-rendering',
      certifiedImplicitApproval: true,
      sensitivity: 'general',
      recommendedPolicy: 'ask',
      persistentAllow: true,
      persistentDeny: true,
      maximumScope: { allowedDimensions: ['extensionPoints'], unscopedAllowed: false },
      scopeUpgrade: 'strict-expansion',
      installPrompt: 'explicit',
      runtimePrompt: 'dynamic-scope',
      presentation: presentation(
        'ui.extension-points.render',
        'Render controlled interface contributions',
        'Changes visible Host interface content.',
        'Only Protocol structured contributions are rendered.',
      ),
    },
    {
      capability: 'ui.host-dom.read',
      providerFamily: 'ui',
      resourceClass: 'host-dom',
      certifiedImplicitApproval: true,
      sensitivity: 'sensitive',
      recommendedPolicy: 'ask',
      persistentAllow: true,
      persistentDeny: true,
      maximumScope: { allowedDimensions: ['rootIds', 'operations'], unscopedAllowed: false },
      scopeUpgrade: 'strict-expansion',
      installPrompt: 'explicit',
      runtimePrompt: 'dynamic-scope',
      presentation: presentation(
        'ui.host-dom.read',
        'Read bounded Host interface state',
        'May expose visible user text and interface state.',
        'Only catalog roots, closed operations, bounded redacted projections, and opaque node references are available.',
      ),
    },
    {
      capability: 'ui.host-dom.modify',
      providerFamily: 'ui',
      resourceClass: 'host-dom',
      certifiedImplicitApproval: true,
      sensitivity: 'high-risk',
      recommendedPolicy: 'ask',
      persistentAllow: false,
      persistentDeny: true,
      maximumScope: { allowedDimensions: ['rootIds', 'operations'], unscopedAllowed: false },
      scopeUpgrade: 'strict-expansion',
      installPrompt: 'explicit',
      runtimePrompt: 'always',
      presentation: presentation(
        'ui.host-dom.modify',
        'Modify bounded Host interface state',
        'Changes visible content, owned children, attributes, or focus.',
        'No raw HTML, selector, style, script, event handler, node, callback, or private bridge is available.',
      ),
    },
  ],
}
expectValid(
  catalog,
  'v4 catalog must preserve 22 non-DOM entries and add exactly three separately classified DOM entries',
)
expect(catalog.entries.length === 25, 'v4 catalog must have exactly 25 entries')
expect(
  catalog.entries.slice(0, 22).every(entry =>
    entry.resourceClass === 'non-dom' && entry.certifiedImplicitApproval === false
  ),
  'the original 22 entries must remain non-DOM and ineligible',
)
expectInvalid({
  ...catalog,
  entries: catalog.entries.map(entry =>
    entry.capability === 'ui.host-dom.modify' ? { ...entry, persistentAllow: true } : entry
  ),
}, 'Host DOM modify catalog entry must never enable persistent allow')

const identity = Object.freeze({ source: 'https://plugins.example.test/host-dom-helper', pluginId: 'host-dom-helper' })
const artifact = Object.freeze({ ...identity, version: '1.2.3', integrity: `sha256:${'1'.repeat(64)}` })
const certificationPayload = Object.freeze({
  ...artifact,
  reviewPolicy: { id: 'cordisx-marketplace-review', version: '1.0.0' },
  reviewedAt: '2026-08-01T00:00:00Z',
  expiresAt: '2027-08-01T00:00:00Z',
  evidence: { kind: 'protected-marketplace-review', reference: 'https://github.com/cordisx/marketplace/pull/42' },
  feed: {
    generatedAt: '2026-08-30T00:00:00Z',
    root: 'https://marketplace.cordisx.dev/feed.json',
    authority: 'cordisx.marketplace.codeowners/v1',
  },
})
const certification = Object.freeze({
  $schema:
    'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/marketplace-certified-permission-projection.v1.schema.json',
  schemaVersion: 1,
  kind: 'cordisx-certified-permission-eligibility',
  status: 'active',
  ...certificationPayload,
  fingerprint: digest(certificationPayload),
  revision: certificationPayload.feed.generatedAt,
})
const binding = Object.freeze({
  operationId: 'host-dom-request-1',
  runtimeGeneration: 'runtime-9',
  moduleGeneration: 'module-4',
  requestId: 'host-dom-request-1',
})
const commonDeclaration = Object.freeze({
  required: false,
  securityFingerprint: `sha256:${'3'.repeat(64)}`,
  policy: 'ask',
  decisionRequired: false,
  authorizationMode: 'certified-implicit',
  resourceClass: 'host-dom',
  certifiedImplicitApproval: true,
  certification,
  sensitivity: 'sensitive',
  persistentAllow: true,
  persistentDeny: true,
  allowedDecisions: ['allow-once', 'allow-persistent', 'deny-once', 'deny-persistent'],
  defaultDecision: 'allow-once',
  presentation: catalog.entries.find(entry => entry.capability === 'ui.host-dom.read').presentation,
})
const readDeclaration = Object.freeze({
  ...commonDeclaration,
  capability: 'ui.host-dom.read',
  scope: { rootIds: ['workspace.composer'], operations: readOperations },
})
const certifiedPlan = Object.freeze({
  $schema: ids.plan,
  schemaVersion: 4,
  planId: 'host-dom-request-1',
  operation: 'runtime',
  profileId: 'work',
  identity,
  catalogVersion: catalog.catalogVersion,
  binding,
  declarations: [readDeclaration],
})
expectValid(certifiedPlan, 'exact Certified Host DOM read plan must be valid')
expectInvalid({ ...certifiedPlan, official: true }, 'Official must be absent from the permission plan')
expectInvalid(
  { ...certifiedPlan, identity: { ...identity, pluginId: 'other-plugin' } },
  'Certified projection must match the exact plugin identity',
)

const modifyDeclaration = {
  ...commonDeclaration,
  capability: 'ui.host-dom.modify',
  scope: { rootIds: ['workspace.composer'], operations: modifyOperations },
  sensitivity: 'high-risk',
  persistentAllow: false,
  allowedDecisions: ['allow-once', 'deny-once', 'deny-persistent'],
  presentation: catalog.entries.find(entry => entry.capability === 'ui.host-dom.modify').presentation,
}
expectValid(
  { ...certifiedPlan, declarations: [modifyDeclaration] },
  'exact Certified Host DOM modify plan must be valid',
)
expectInvalid({
  ...certifiedPlan,
  declarations: [{ ...modifyDeclaration, persistentAllow: true, allowedDecisions: ['allow-once', 'allow-persistent'] }],
}, 'Host DOM modify plan must not expose persistent allow')
expectInvalid({
  ...certifiedPlan,
  declarations: [{ ...readDeclaration, scope: { rootIds: ['workspace.composer'], operations: ['set-text'] } }],
}, 'read capability must reject modify operations')
expectInvalid({
  ...certifiedPlan,
  declarations: [{ ...modifyDeclaration, scope: { rootIds: ['workspace.composer'], operations: ['read-text'] } }],
}, 'modify capability must reject read operations')

const explicitRead = { ...readDeclaration, decisionRequired: true, authorizationMode: 'explicit-user' }
delete explicitRead.certification
expectValid(
  { ...certifiedPlan, declarations: [explicitRead] },
  'ordinary and Official-only Host DOM read must use explicit review',
)
expectInvalid(
  { ...certifiedPlan, declarations: [{ ...explicitRead, policy: 'deny-persistent' }] },
  'persistent denial must not be projected as an explicit-user prompt',
)
const explicitDecision = {
  $schema: ids.decision,
  schemaVersion: 4,
  origin: 'explicit-user',
  planId: certifiedPlan.planId,
  operation: 'runtime',
  profileId: 'work',
  identity,
  binding,
  decisions: [{
    capability: explicitRead.capability,
    scope: explicitRead.scope,
    securityFingerprint: explicitRead.securityFingerprint,
    decision: 'allow-once',
  }],
}
expectValid(explicitDecision, 'explicit Host DOM decision must be valid')
expectInvalid(
  { ...explicitDecision, origin: 'certified-implicit', certification },
  'serialized input must not forge Certified authority',
)
function decisionMatchesPlan(plan, decision) {
  if (
    decision.planId !== plan.planId || decision.operation !== plan.operation || decision.profileId !== plan.profileId
    || JSON.stringify(decision.identity) !== JSON.stringify(plan.identity)
    || JSON.stringify(decision.binding) !== JSON.stringify(plan.binding)
    || decision.decisions.length !== plan.declarations.length
  ) return false
  return plan.declarations.every(declaration => {
    const candidate = decision.decisions.find(item => item.capability === declaration.capability)
    return candidate !== undefined && digest(normalized(candidate.scope)) === digest(normalized(declaration.scope))
      && candidate.securityFingerprint === declaration.securityFingerprint
      && declaration.allowedDecisions.includes(candidate.decision)
  })
}
expect(
  decisionMatchesPlan({ ...certifiedPlan, declarations: [explicitRead] }, explicitDecision),
  'explicit decision must match every exact plan tuple once',
)
expect(
  !decisionMatchesPlan({ ...certifiedPlan, declarations: [explicitRead] }, { ...explicitDecision, decisions: [] }),
  'missing decision tuple must fail exact plan matching',
)
expect(
  !decisionMatchesPlan({ ...certifiedPlan, declarations: [explicitRead] }, {
    ...explicitDecision,
    decisions: [...explicitDecision.decisions, { ...explicitDecision.decisions[0], decision: 'deny-once' }],
  }),
  'conflicting duplicate decision tuple must fail exact plan matching',
)

const nonDom = {
  ...explicitRead,
  capability: 'tasks.content.read',
  scope: { sessions: [{ providerId: 'codex', remoteSessionId: 'session-1' }] },
  resourceClass: 'non-dom',
  certifiedImplicitApproval: false,
  presentation: catalog.entries.find(entry => entry.capability === 'tasks.content.read').presentation,
}
expectValid(
  { ...certifiedPlan, declarations: [nonDom] },
  'all four trust states must keep non-DOM permissions on explicit review',
)
expectInvalid({
  ...certifiedPlan,
  declarations: [{ ...readDeclaration, capability: 'tasks.content.read', resourceClass: 'non-dom' }],
}, 'a non-DOM capability must not use Certified implicit mode')

function exactCertification(projection, subject, now) {
  return projection !== undefined && projection.source === subject.source && projection.pluginId === subject.pluginId
    && projection.version === subject.version && projection.integrity === subject.integrity
    && Date.parse(projection.reviewedAt) <= now && now < Date.parse(projection.expiresAt)
}
function mode(
  {
    official: _official,
    projection,
    capability,
    policy = 'ask',
    subject = artifact,
    now = Date.parse('2026-08-30T12:00:00Z'),
  },
) {
  if (policy !== 'ask') return 'persistent-policy'
  const entry = catalog.entries.find(candidate => candidate.capability === capability)
  return entry?.certifiedImplicitApproval === true && exactCertification(projection, subject, now)
    ? 'certified-implicit'
    : 'explicit-user'
}
function authorizationOutcome(input) {
  if (input.policy === 'deny-persistent') return 'persistent-deny'
  if (input.policy === 'allow-persistent') return 'allowed'
  return mode(input) === 'explicit-user' ? 'prompt' : 'allowed'
}
for (const capability of ['ui.extension-points.render', 'ui.host-dom.read', 'ui.host-dom.modify']) {
  for (
    const [label, official, projection, expected] of [
      ['ordinary', false, undefined, 'explicit-user'],
      ['certified-only', false, certification, 'certified-implicit'],
      ['official-only', true, undefined, 'explicit-user'],
      ['official-certified', true, certification, 'certified-implicit'],
    ]
  ) {
    expect(
      mode({ official, projection, capability }) === expected,
      `${label} ${capability} authorization mode is incorrect`,
    )
  }
}
for (
  const [label, official, projection] of [
    ['ordinary', false, undefined],
    ['certified-only', false, certification],
    ['official-only', true, undefined],
    ['official-certified', true, certification],
  ]
) {
  expect(
    mode({ official, projection, capability: 'tasks.content.read' }) === 'explicit-user',
    `${label} non-DOM permission must remain explicit`,
  )
}
expect(
  mode({ official: false, projection: certification, capability: 'ui.host-dom.read', policy: 'deny-persistent' })
    === 'persistent-policy',
  'persistent denial must remain in the persistent-policy mode',
)
expect(
  authorizationOutcome({
    official: false,
    projection: certification,
    capability: 'ui.host-dom.read',
    policy: 'deny-persistent',
  }) === 'persistent-deny',
  'persistent denial must reject even an exact Certified artifact',
)
expect(
  mode({
    official: false,
    projection: { ...certification, integrity: `sha256:${'4'.repeat(64)}` },
    capability: 'ui.host-dom.read',
  }) === 'explicit-user',
  'digest mismatch must invalidate Certified eligibility',
)
expect(
  mode({
    official: false,
    projection: { ...certification, expiresAt: '2026-08-30T00:00:00Z' },
    capability: 'ui.host-dom.modify',
  }) === 'explicit-user',
  'expiry must invalidate Certified eligibility without waiting for a feed callback',
)
expect(
  mode({ official: false, projection: undefined, capability: 'ui.host-dom.modify' }) === 'explicit-user',
  'source or certification revocation must invalidate Certified eligibility',
)

const semanticCases = JSON.parse(await readFile(path.join(vectorRoot, 'invalid/semantic-cases.json'), 'utf8'))
expect(semanticCases.persistentDenyWins === true, 'semantic vector must require persistent deny precedence')
const catalogRoots = new Set([semanticCases.catalogRoot, 'manager.content', 'workspace.toolbar'])
const declaredRoots = new Set(semanticCases.declaredRoots)
const declaredOperations = new Set(semanticCases.declaredOperations)
function bridgeOutcome(candidate) {
  if (!catalogRoots.has(candidate.rootId)) return 'unknown-root'
  if (!declaredRoots.has(candidate.rootId)) return 'scope-denied'
  if (!declaredOperations.has(candidate.operation)) return 'operation-denied'
  return 'allowed'
}
for (const candidate of semanticCases.cases) {
  expect(
    bridgeOutcome(candidate) === candidate.expected,
    `${candidate.label} must fail closed with ${candidate.expected}`,
  )
}

const handleRecord = Object.freeze({
  handle: 'hdh_0123456789abcdef',
  clientId: 'client-1',
  profileId: 'work',
  identity,
  artifactVersion: artifact.version,
  artifactIntegrity: artifact.integrity,
  capability: 'ui.host-dom.read',
  rootId: 'workspace.composer',
  operations: new Set(['read-text']),
  scopeDigest: digest({ rootIds: ['workspace.composer'], operations: ['read-text'] }),
  securityFingerprint: readDeclaration.securityFingerprint,
  runtimeGeneration: binding.runtimeGeneration,
  moduleGeneration: binding.moduleGeneration,
  hostGeneration: 'host-12',
  certificationFingerprint: certification.fingerprint,
  certificationRevision: certification.revision,
  active: true,
})
const modifyHandleRecord = Object.freeze({
  ...handleRecord,
  handle: 'hdh_modifyroot0001',
  capability: 'ui.host-dom.modify',
  operations: new Set(['set-text']),
  scopeDigest: digest({ rootIds: ['workspace.composer'], operations: ['set-text'] }),
  securityFingerprint: modifyDeclaration.securityFingerprint,
})
const nodeRecords = new Map([
  ['hdn_0123456789abcdef', { handle: handleRecord.handle, rootId: handleRecord.rootId }],
  ['hdn_modifychild0001', { handle: modifyHandleRecord.handle, rootId: modifyHandleRecord.rootId }],
  ['hdn_crosshandle0001', { handle: 'hdh_otherhandle0001', rootId: handleRecord.rootId }],
  ['hdn_crossroot0000001', { handle: handleRecord.handle, rootId: 'manager.content' }],
])
const current = Object.freeze({
  clientId: handleRecord.clientId,
  profileId: handleRecord.profileId,
  identity: handleRecord.identity,
  artifactVersion: handleRecord.artifactVersion,
  artifactIntegrity: handleRecord.artifactIntegrity,
  scopeDigest: handleRecord.scopeDigest,
  securityFingerprint: handleRecord.securityFingerprint,
  runtimeGeneration: handleRecord.runtimeGeneration,
  moduleGeneration: handleRecord.moduleGeneration,
  hostGeneration: handleRecord.hostGeneration,
  certification,
  now: Date.parse('2026-08-30T12:00:00Z'),
  enabled: true,
  installed: true,
  rootAvailable: true,
  permissionActive: true,
})
const readCall = Object.freeze({ handle: handleRecord.handle, node: 'hdn_0123456789abcdef', operation: 'read-text' })
const modifyRootCall = Object.freeze({ handle: modifyHandleRecord.handle, operation: 'set-text' })
const modifyCurrent = Object.freeze({
  ...current,
  scopeDigest: modifyHandleRecord.scopeDigest,
  securityFingerprint: modifyHandleRecord.securityFingerprint,
})
let adapterDispatches = 0
let handlesMinted = 0
function acquireWithPolicy(policy, projection) {
  const outcome = authorizationOutcome({ official: true, policy, projection, capability: 'ui.host-dom.read' })
  if (outcome !== 'allowed') return outcome
  handlesMinted += 1
  return 'allowed'
}
expect(
  acquireWithPolicy('deny-persistent', certification) === 'persistent-deny',
  'deny-persistent must reject Certified acquisition',
)
expect(
  handlesMinted === 0 && adapterDispatches === 0,
  'persistent denial must not mint a handle or dispatch the adapter',
)
function executeBridge(record, call, state, nodes = nodeRecords) {
  if (!state.installed) return 'plugin-uninstalled'
  if (!state.enabled) return 'plugin-disabled'
  if (!state.rootAvailable) return 'root-unavailable'
  if (!record.active || call.handle !== record.handle) return 'stale-handle'
  if (
    state.clientId !== record.clientId || state.profileId !== record.profileId
    || state.identity.source !== record.identity.source || state.identity.pluginId !== record.identity.pluginId
  ) return 'owner-mismatch'
  if (
    state.hostGeneration !== record.hostGeneration || state.runtimeGeneration !== record.runtimeGeneration
    || state.moduleGeneration !== record.moduleGeneration
  ) return 'generation-replaced'
  if (!state.permissionActive) return 'permission-denied'
  if (
    state.artifactVersion !== record.artifactVersion || state.artifactIntegrity !== record.artifactIntegrity
    || state.scopeDigest !== record.scopeDigest || state.securityFingerprint !== record.securityFingerprint
  ) return 'stale-handle'
  if (
    !exactCertification(state.certification, {
      ...record.identity,
      version: record.artifactVersion,
      integrity: record.artifactIntegrity,
    }, state.now)
    || state.certification.fingerprint !== record.certificationFingerprint
    || state.certification.revision !== record.certificationRevision
  ) return 'stale-handle'
  const capability = readOperations.includes(call.operation) ? 'ui.host-dom.read' : 'ui.host-dom.modify'
  if (record.capability !== capability || !record.operations.has(call.operation)) return 'operation-denied'
  if (call.node !== undefined) {
    const node = nodes.get(call.node)
    if (node === undefined) return 'stale-handle'
    if (node.handle !== record.handle) return 'owner-mismatch'
    if (node.rootId !== record.rootId) return 'scope-denied'
  }
  adapterDispatches += 1
  return 'allowed'
}
expect(
  executeBridge(handleRecord, readCall, current) === 'allowed' && adapterDispatches === 1,
  'exact owner/profile/client/root/lease/generation handle must dispatch once',
)
expect(
  executeBridge(modifyHandleRecord, modifyRootCall, modifyCurrent) === 'allowed' && adapterDispatches === 2,
  'modify-only handle must target its exact acquired root without acquiring read or minting a node reference',
)
expect(
  executeBridge(modifyHandleRecord, { ...modifyRootCall, operation: 'read-text' }, modifyCurrent)
    === 'operation-denied',
  'modify-only handle must not gain read authority',
)
expect(
  executeBridge(modifyHandleRecord, { ...modifyRootCall, node: 'hdn_modifychild0001' }, modifyCurrent) === 'allowed',
  'modify handle must retain same-owner/root/generation opaque descendant targeting',
)
for (
  const [label, record, call, state, expected] of [
    ['stale handle', { ...handleRecord, active: false }, readCall, current, 'stale-handle'],
    ['unknown node', handleRecord, { ...readCall, node: 'hdn_unknown00000001' }, current, 'stale-handle'],
    ['cross-handle node', handleRecord, { ...readCall, node: 'hdn_crosshandle0001' }, current, 'owner-mismatch'],
    ['cross-root node', handleRecord, { ...readCall, node: 'hdn_crossroot0000001' }, current, 'scope-denied'],
    ['cross client', handleRecord, readCall, { ...current, clientId: 'client-2' }, 'owner-mismatch'],
    ['cross profile', handleRecord, readCall, { ...current, profileId: 'personal' }, 'owner-mismatch'],
    ['cross source', handleRecord, readCall, {
      ...current,
      identity: { ...identity, source: 'https://plugins.example.test/other' },
    }, 'owner-mismatch'],
    [
      'cross plugin',
      handleRecord,
      readCall,
      { ...current, identity: { ...identity, pluginId: 'other-plugin' } },
      'owner-mismatch',
    ],
    [
      'Host generation replacement',
      handleRecord,
      readCall,
      { ...current, hostGeneration: 'host-13' },
      'generation-replaced',
    ],
    [
      'runtime generation replacement',
      handleRecord,
      readCall,
      { ...current, runtimeGeneration: 'runtime-10' },
      'generation-replaced',
    ],
    [
      'module generation replacement',
      handleRecord,
      readCall,
      { ...current, moduleGeneration: 'module-5' },
      'generation-replaced',
    ],
    [
      'single-family lease revocation',
      handleRecord,
      readCall,
      { ...current, permissionActive: false },
      'permission-denied',
    ],
    ['read handle modify attempt', handleRecord, { ...readCall, operation: 'set-text' }, current, 'operation-denied'],
    ['artifact version change', handleRecord, readCall, { ...current, artifactVersion: '1.2.4' }, 'stale-handle'],
    [
      'artifact digest change',
      handleRecord,
      readCall,
      { ...current, artifactIntegrity: `sha256:${'4'.repeat(64)}` },
      'stale-handle',
    ],
    ['scope change', handleRecord, readCall, {
      ...current,
      scopeDigest: digest({ rootIds: ['workspace.composer', 'workspace.toolbar'], operations: ['read-text'] }),
    }, 'stale-handle'],
    ['security fingerprint change', handleRecord, readCall, {
      ...current,
      securityFingerprint: `sha256:${'5'.repeat(64)}`,
    }, 'stale-handle'],
    ['certification missing', handleRecord, readCall, { ...current, certification: undefined }, 'stale-handle'],
    [
      'certification expiry',
      handleRecord,
      readCall,
      { ...current, now: Date.parse(certification.expiresAt) },
      'stale-handle',
    ],
    ['certification fingerprint change', handleRecord, readCall, {
      ...current,
      certification: { ...certification, fingerprint: `sha256:${'6'.repeat(64)}` },
    }, 'stale-handle'],
    ['certification revision change', handleRecord, readCall, {
      ...current,
      certification: { ...certification, revision: '2026-08-30T01:00:00Z' },
    }, 'stale-handle'],
    ['plugin disabled', handleRecord, readCall, { ...current, enabled: false }, 'plugin-disabled'],
    ['plugin uninstalled', handleRecord, readCall, { ...current, installed: false }, 'plugin-uninstalled'],
    ['root availability loss', handleRecord, readCall, { ...current, rootAvailable: false }, 'root-unavailable'],
  ]
) {
  const before = adapterDispatches
  expect(executeBridge(record, call, state) === expected, `${label} must fail closed with ${expected}`)
  expect(adapterDispatches === before, `${label} must fail before adapter dispatch`)
}

const frozenManifestV4 = schemas.get(
  'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/plugin-manifest.v4.schema.json',
)
expect(
  !frozenManifestV4.$defs.capabilityName.enum.includes('ui.host-dom.read'),
  'frozen manifest v4 must not acquire Host DOM capabilities',
)
const frozenPackageV3 = schemas.get(
  'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/plugin-package.v3.schema.json',
)
expect(
  !frozenPackageV3.properties.runtimeManifest.properties.schema.enum.includes(ids.manifest),
  'frozen package v3 must not accept manifest v5',
)

if (failures > 0) throw new Error(`${failures} permission v4 conformance case(s) failed`)
console.log(
  'Permission authorization v4 conformance: Host DOM read/modify catalog, scope, trust, lease, bridge, and legacy fences passed',
)
