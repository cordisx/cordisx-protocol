import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'

const schemas = new URL('../schemas/', import.meta.url)
const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true })
addFormats(ajv)
for (const name of (await readdir(schemas)).filter(name => name.endsWith('.schema.json'))) {
  ajv.addSchema(JSON.parse(await readFile(new URL(name, schemas), 'utf8')))
}
const base = 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/'
const planSchema = `${base}permission-authorization-plan.v7.schema.json`
const decisionSchema = `${base}permission-authorization-decision.v7.schema.json`
const validPlan = ajv.getSchema(planSchema)
const validDecision = ajv.getSchema(decisionSchema)
const text = { key: 'permission.test', fallback: 'Test permission' }
const optional = {
  capability: 'models.read',
  required: false,
  scope: {},
  securityFingerprint: `sha256:${'a'.repeat(64)}`,
  policy: 'ask',
  decisionRequired: false,
  authorizationMode: 'deferred',
  resourceClass: 'non-dom',
  certifiedImplicitApproval: false,
  sensitivity: 'low',
  persistentAllow: true,
  persistentDeny: true,
  allowedDecisions: ['allow-once', 'allow-persistent', 'deny-once', 'deny-persistent'],
  defaultDecision: 'allow-persistent',
  presentation: { name: text, description: text, risk: text, limitation: text },
}
const required = {
  ...optional,
  capability: 'tasks.catalog.read',
  required: true,
  decisionRequired: true,
  authorizationMode: 'explicit-user',
  securityFingerprint: `sha256:${'b'.repeat(64)}`,
}
const plan = {
  $schema: planSchema,
  schemaVersion: 7,
  planId: 'install-1',
  operation: 'install',
  profileId: 'test',
  identity: { source: 'file:///plugin', pluginId: 'example' },
  catalogVersion: '2026-08-24',
  binding: { operationId: 'install-1', runtimeGeneration: 'runtime-1' },
  declarations: [optional, required],
}
const decision = {
  $schema: decisionSchema,
  schemaVersion: 7,
  origin: 'explicit-user',
  planId: plan.planId,
  operation: plan.operation,
  profileId: plan.profileId,
  identity: plan.identity,
  binding: plan.binding,
  decisions: [{
    capability: required.capability,
    scope: required.scope,
    securityFingerprint: required.securityFingerprint,
    decision: 'allow-once',
  }],
}

assert.ok(validPlan(plan), JSON.stringify(validPlan.errors))
assert.ok(validDecision(decision), JSON.stringify(validDecision.errors))
const bundleItem = {
  ...optional,
  reviewIntent: 'bundle-policy',
  authorizationMode: 'explicit-user',
  decisionRequired: true,
}
assert.equal(validPlan({ ...plan, declarations: [bundleItem] }), true)
assert.equal(validPlan({ ...plan, declarations: [{ ...bundleItem, required: true }] }), false)
assert.equal(validPlan({ ...plan, operation: 'runtime', declarations: [bundleItem] }), false)
assert.equal(validPlan({ ...plan, declarations: [{ ...bundleItem, reviewIntent: undefined }] }), false)
assert.equal(validDecision({ ...decision, origin: 'bundle-policy' }), true)
assert.equal(validDecision({ ...decision, origin: 'bundle-policy', decisions: [] }), false)
assert.equal(
  validPlan({
    ...plan,
    declarations: [{ ...required, legacyReason: { key: 'legacy-reason', fallback: 'Plugin explanation' } }],
  }),
  true,
)
for (
  const invalid of [
    { ...plan, declarations: [{ ...optional, required: true }] },
    { ...plan, declarations: [{ ...optional, decisionRequired: true }] },
    { ...plan, declarations: [{ ...optional, policy: 'allow-persistent' }] },
    { ...plan, operation: 'runtime' },
  ]
) assert.equal(validPlan(invalid), false)
assert.equal(validDecision({ ...decision, origin: 'host-no-decision' }), false)
assert.equal(validDecision({ ...decision, origin: 'host-no-decision', decisions: [] }), true)
assert.equal(
  ajv.getSchema(`${base}permission-authorization-plan.v4.schema.json`)(
    { ...plan, $schema: `${base}permission-authorization-plan.v4.schema.json`, schemaVersion: 4 },
  ),
  false,
)

// A schema cannot check a decision against a different document; consumers must
// bind it to the complete, freshly rebuilt plan before applying any choices.
function matches(candidatePlan, candidateDecision, bundleChoices) {
  if (!validPlan(candidatePlan) || !validDecision(candidateDecision)) return false
  if (
    (candidateDecision.origin === 'bundle-policy' || candidatePlan.declarations.some(item => item.reviewIntent))
    && bundleChoices === undefined
  ) return false
  if (
    bundleChoices !== undefined && candidateDecision.origin !== 'bundle-policy'
    && candidateDecision.origin !== 'host-no-decision'
  ) return false
  if (
    ['planId', 'operation', 'profileId', 'identity', 'binding'].some(field =>
      JSON.stringify(candidatePlan[field]) !== JSON.stringify(candidateDecision[field])
    )
  ) return false
  const pending = candidatePlan.declarations.filter(item => item.decisionRequired)
  if (candidateDecision.origin === 'host-no-decision' && pending.length > 0) return false
  if (pending.length !== candidateDecision.decisions.length) return false
  return pending.every(item =>
    candidateDecision.decisions.filter(selected =>
      selected.capability === item.capability && JSON.stringify(selected.scope) === JSON.stringify(item.scope)
      && selected.securityFingerprint === item.securityFingerprint && item.allowedDecisions.includes(selected.decision)
      && (bundleChoices === undefined || selected.decision.startsWith(bundleChoices[selected.capability] ?? 'invalid'))
    ).length === 1
  )
}
assert.equal(matches(plan, decision), true)
const bundlePlan = { ...plan, declarations: [bundleItem] }
const bundleDecision = {
  ...decision,
  origin: 'bundle-policy',
  decisions: [{
    capability: bundleItem.capability,
    scope: bundleItem.scope,
    securityFingerprint: bundleItem.securityFingerprint,
    decision: 'allow-once',
  }],
}
assert.equal(matches(bundlePlan, bundleDecision), false)
assert.equal(matches(bundlePlan, bundleDecision, { 'models.read': 'deny' }), false)
assert.equal(matches(bundlePlan, bundleDecision, { 'models.read': 'allow' }), true)
assert.equal(matches(plan, { ...decision, decisions: [] }), false)
assert.equal(
  matches(plan, {
    ...decision,
    decisions: [{
      capability: optional.capability,
      scope: optional.scope,
      securityFingerprint: optional.securityFingerprint,
      decision: 'allow-persistent',
    }],
  }),
  false,
)
assert.equal(matches(plan, { ...decision, binding: { ...decision.binding, runtimeGeneration: 'other' } }), false)
assert.equal(
  matches({ ...plan, declarations: [optional] }, { ...decision, origin: 'host-no-decision', decisions: [] }),
  true,
)
function activates(candidatePlan, candidateDecision) {
  if (!matches(candidatePlan, candidateDecision)) return false
  return !candidatePlan.declarations.some(item =>
    item.required
    && (item.policy === 'deny-persistent' || candidateDecision.decisions.some(selected =>
      selected.capability === item.capability && selected.decision.startsWith('deny')
    ))
  )
}
assert.equal(activates(plan, decision), true)
assert.equal(activates(plan, { ...decision, decisions: [{ ...decision.decisions[0], decision: 'deny-once' }] }), false)
const savedDeny = { ...optional, authorizationMode: 'persistent-policy', policy: 'deny-persistent' }
assert.equal(
  activates({ ...plan, declarations: [savedDeny] }, {
    ...decision,
    origin: 'host-no-decision',
    decisions: [],
  }),
  true,
)
assert.equal(
  activates({ ...plan, declarations: [{ ...savedDeny, required: true }] }, {
    ...decision,
    origin: 'host-no-decision',
    decisions: [],
  }),
  false,
)

console.log('Permission deferral v7 schema and plan-binding conformance passed')
