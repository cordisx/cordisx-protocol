import { createHash } from 'node:crypto'
import { readFile, readdir } from 'node:fs/promises'
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
  catalog: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/permission-capability-catalog.v2.schema.json',
  decision: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/permission-authorization-decision.v3.schema.json',
  manifest: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/plugin-manifest.v4.schema.json',
  plan: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/permission-authorization-plan.v3.schema.json',
  policy: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/permission-policy.v3.schema.json',
})
function digest(value) { return `sha256:${createHash('sha256').update(JSON.stringify(value)).digest('hex')}` }

function errors(value) {
  const validate = ajv.getSchema(value?.$schema)
  if (validate === undefined) return ['unknown schema']
  const issues = validate(value)
    ? []
    : (validate.errors ?? []).map(error => `${error.instancePath || '/'} ${error.message}`)
  if (value?.$schema !== ids.plan || !Array.isArray(value.declarations)) return issues
  for (const declaration of value.declarations) {
    const projection = declaration.certification
    if (projection === undefined) continue
    if (projection.source !== value.identity?.source || projection.pluginId !== value.identity?.pluginId) {
      issues.push(`${declaration.capability} certification does not match plan identity`)
    }
    if (!(Date.parse(projection.reviewedAt) < Date.parse(projection.expiresAt))) {
      issues.push(`${declaration.capability} certification review interval is invalid`)
    }
    if (Date.parse(projection.feed?.generatedAt) < Date.parse(projection.reviewedAt)) {
      issues.push(`${declaration.capability} feed predates certification review`)
    }
  }
  return issues
}

let failures = 0
function expect(condition, message) {
  if (condition) return
  console.error(message)
  failures += 1
}
function expectValid(value, message) {
  const issues = errors(value)
  expect(issues.length === 0, `${message}: ${issues.join('; ')}`)
}
function expectInvalid(value, message) {
  expect(errors(value).length > 0, message)
}

const catalogV1 = JSON.parse(await readFile(path.join(root, 'test-vectors/platform/permissions-v2/valid/catalog.json'), 'utf8'))
const presentation = Object.freeze({
  name: { key: 'ui.extension-points.render.name', fallback: 'Render controlled interface contributions' },
  description: { key: 'ui.extension-points.render.description', fallback: 'Render structured contributions at allowed Host extension points.' },
  risk: { key: 'ui.extension-points.render.risk', fallback: 'The contribution changes visible Host interface content.' },
  limitation: { key: 'ui.extension-points.render.limitation', fallback: 'Raw DOM selectors, nodes, scripts, styles, and bridges remain unavailable.' },
})
const catalog = {
  $schema: ids.catalog,
  schemaVersion: 2,
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
      presentation,
    },
  ],
}
expectValid(catalog, 'v3 catalog must be schema-valid')
expect(catalog.entries.length === 28, 'v3 catalog must retain 27 non-DOM entries and add exactly one controlled DOM entry')
expect(catalog.entries.filter(entry => entry.certifiedImplicitApproval).map(entry => entry.capability).join(',') === 'ui.extension-points.render', 'only controlled DOM rendering may be certification-eligible')

const identity = Object.freeze({ source: 'https://plugins.example.test/example-plugin', pluginId: 'example-plugin' })
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
  $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/marketplace-certified-permission-projection.v1.schema.json',
  schemaVersion: 1,
  kind: 'cordisx-certified-permission-eligibility',
  status: 'active',
  ...certificationPayload,
  fingerprint: digest(certificationPayload),
  revision: certificationPayload.feed.generatedAt,
})
const binding = Object.freeze({ operationId: 'render-request-1', runtimeGeneration: 'runtime-9', moduleGeneration: 'module-4', requestId: 'render-request-1' })
const domDeclaration = Object.freeze({
  capability: 'ui.extension-points.render',
  required: false,
  scope: { extensionPoints: ['workspace.toolbar.items'] },
  securityFingerprint: `sha256:${'3'.repeat(64)}`,
  policy: 'ask',
  decisionRequired: false,
  authorizationMode: 'certified-implicit',
  resourceClass: 'dom-rendering',
  certifiedImplicitApproval: true,
  certification,
  sensitivity: 'general',
  persistentAllow: true,
  persistentDeny: true,
  allowedDecisions: ['allow-once', 'allow-persistent', 'deny-once', 'deny-persistent'],
  defaultDecision: 'allow-once',
  presentation,
})
const certifiedPlan = Object.freeze({
  $schema: ids.plan,
  schemaVersion: 3,
  planId: 'render-request-1',
  operation: 'runtime',
  profileId: 'work',
  identity,
  catalogVersion: catalog.catalogVersion,
  binding,
  declarations: [domDeclaration],
})
expectValid(certifiedPlan, 'exact Certified DOM plan must be valid')
expectInvalid({ ...certifiedPlan, identity: { ...identity, pluginId: 'other-plugin' } }, 'certification projection must bind the exact plan plugin identity')

const explicitPlan = {
  ...certifiedPlan,
  declarations: [{
    ...domDeclaration,
    decisionRequired: true,
    authorizationMode: 'explicit-user',
    certification: undefined,
  }],
}
delete explicitPlan.declarations[0].certification
expectValid(explicitPlan, 'ordinary or Official-only DOM plan must require explicit review')

const explicitDecision = Object.freeze({
  $schema: ids.decision,
  schemaVersion: 3,
  origin: 'explicit-user',
  planId: explicitPlan.planId,
  operation: explicitPlan.operation,
  profileId: explicitPlan.profileId,
  identity: explicitPlan.identity,
  binding: explicitPlan.binding,
  decisions: [{
    capability: explicitPlan.declarations[0].capability,
    scope: explicitPlan.declarations[0].scope,
    securityFingerprint: explicitPlan.declarations[0].securityFingerprint,
    decision: 'allow-once',
  }],
})
expectValid(explicitDecision, 'explicit DOM decision must be valid')
expectInvalid({ ...explicitDecision, origin: 'certified-implicit', certification }, 'a serialized decision must not forge certified implicit authority')
expectInvalid({ ...certifiedPlan, official: true }, 'Official must not enter a permission plan')

const nonDomDeclaration = {
  ...domDeclaration,
  capability: 'tasks.content.read',
  scope: { sessions: [{ providerId: 'codex', remoteSessionId: 'session-1' }] },
  decisionRequired: true,
  authorizationMode: 'explicit-user',
  resourceClass: 'non-dom',
  certifiedImplicitApproval: false,
}
delete nonDomDeclaration.certification
expectValid({ ...explicitPlan, declarations: [nonDomDeclaration] }, 'Certified and Official non-DOM permissions must still use explicit review')
expectInvalid({ ...certifiedPlan, declarations: [{ ...domDeclaration, capability: 'tasks.content.read', resourceClass: 'non-dom' }] }, 'non-DOM permissions must not use certified implicit mode')
expectInvalid({ ...certifiedPlan, declarations: [{ ...domDeclaration, scope: { extensionPoints: ['workspace.toolbar.items'], providers: ['codex'] } }] }, 'controlled DOM scope must not gain non-DOM dimensions')

const manifest = JSON.parse(await readFile(path.join(root, 'test-vectors/platform/permissions-v2/valid/manifest-v4.json'), 'utf8'))
expectInvalid({ ...manifest, official: true }, 'plugin manifest self-reported Official must be rejected')
expectInvalid({ ...manifest, certified: true }, 'plugin manifest self-reported Certified must be rejected')
expectInvalid({
  ...manifest,
  capabilities: [...manifest.capabilities, { name: 'ui.extension-points.render', required: false, scope: { extensionPoints: ['workspace.toolbar.items'] } }],
}, 'manifest v4 must not self-declare the runtime-only controlled DOM capability')

function exactCertification(projection, subject, now) {
  return projection !== undefined
    && projection.source === subject.source
    && projection.pluginId === subject.pluginId
    && projection.version === subject.version
    && projection.integrity === subject.integrity
    && Date.parse(projection.reviewedAt) <= now
    && now < Date.parse(projection.expiresAt)
}
function mode({ official: _official, projection, capability, policy = 'ask', subject = artifact, now = Date.parse('2026-08-30T12:00:00Z') }) {
  if (policy !== 'ask') return 'persistent-policy'
  const entry = catalog.entries.find(candidate => candidate.capability === capability)
  return entry?.resourceClass === 'dom-rendering'
    && entry.certifiedImplicitApproval
    && exactCertification(projection, subject, now)
    ? 'certified-implicit'
    : 'explicit-user'
}

const matrix = JSON.parse(await readFile(path.join(root, 'test-vectors/platform/permissions-v3/authorization-matrix.json'), 'utf8'))
for (const state of matrix.trustStates) {
  expect(mode({
    official: state.official,
    projection: state.certified ? certification : undefined,
    capability: state.capability,
  }) === state.expectedMode, `${state.label} authorization mode is incorrect`)
}
expect(mode({ official: false, projection: certification, capability: 'ui.extension-points.render', policy: 'deny-persistent' }) === 'persistent-policy', 'explicit persistent denial must win over certification')
expect(mode({ official: true, projection: undefined, capability: 'ui.extension-points.render' }) === 'explicit-user', 'Official-only must never bypass DOM review')
expect(mode({ official: false, projection: { ...certification, integrity: `sha256:${'4'.repeat(64)}` }, capability: 'ui.extension-points.render' }) === 'explicit-user', 'artifact digest mismatch must invalidate certification')
expect(mode({ official: false, projection: { ...certification, source: 'https://plugins.example.test/other' }, capability: 'ui.extension-points.render' }) === 'explicit-user', 'source mismatch or revocation must invalidate certification')
expect(mode({ official: false, projection: { ...certification, expiresAt: '2026-08-30T00:00:00Z' }, capability: 'ui.extension-points.render' }) === 'explicit-user', 'expired certification must invalidate implicit approval')
expect(mode({ official: false, projection: undefined, capability: 'ui.extension-points.render' }) === 'explicit-user', 'missing or revoked certification must invalidate implicit approval')

const lease = Object.freeze({
  profileId: 'work', identity, capability: 'ui.extension-points.render', scope: domDeclaration.scope,
  securityFingerprint: domDeclaration.securityFingerprint, runtimeGeneration: binding.runtimeGeneration,
  moduleGeneration: binding.moduleGeneration, certificationFingerprint: certification.fingerprint,
  certificationRevision: certification.revision,
})
const validLease = candidate => digest(candidate) === digest(lease)
expect(validLease({ ...lease }), 'exact certification lease must remain valid')
for (const [label, candidate] of [
  ['scope expansion', { ...lease, scope: { extensionPoints: ['workspace.toolbar.items', 'sidebar.footer.menu'] } }],
  ['runtime generation replacement', { ...lease, runtimeGeneration: 'runtime-10' }],
  ['module generation replacement', { ...lease, moduleGeneration: 'module-5' }],
  ['certification revocation/replacement', { ...lease, certificationRevision: '2026-08-30T01:00:00Z' }],
  ['certification fingerprint change', { ...lease, certificationFingerprint: `sha256:${'5'.repeat(64)}` }],
]) expect(!validLease(candidate), `${label} must invalidate the exact lease`)

const policy = Object.freeze({
  $schema: ids.policy,
  schemaVersion: 3,
  key: {
    profileId: 'work', identity, capability: 'ui.extension-points.render', scope: domDeclaration.scope,
    securityFingerprint: domDeclaration.securityFingerprint,
  },
  policy: 'ask',
})
expectValid(policy, 'v3 DOM policy must use the same profile ledger key shape')

if (failures > 0) throw new Error(`${failures} permission v3 conformance case(s) failed`)
console.log('Permission authorization v3 conformance: four trust states and certified controlled rendering passed')
