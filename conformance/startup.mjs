import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import Ajv from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'
import {
  admit,
  availability,
  conditionSatisfied,
  key,
  ObserverStream,
  plan,
  Preparation,
  publicationAllowed,
  Reporter,
  summarize,
} from './startup-reference-model.mjs'

const root = new URL('../', import.meta.url)
const fixture = JSON.parse(readFileSync(new URL('test-vectors/startup.v1.json', root)))
const clone = value => structuredClone(value)
const base = 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/'
const ajv = new Ajv({ strict: false, allErrors: true })
addFormats(ajv)
for (const file of readdirSync(new URL('schemas/', root)).filter(f => f.endsWith('.json'))) {
  ajv.addSchema(JSON.parse(readFileSync(new URL(`schemas/${file}`, root))))
}
const valid = (name, value, expected = true) => {
  const validate = ajv.getSchema(`${base}${name}.schema.json`)
  assert.equal(validate(value), expected, `${name}: ${JSON.stringify(validate.errors)}`)
}
const { plugins, snapshot, report } = fixture
const manifest = plugins[0].manifest
valid('plugin-manifest.v15', manifest)
valid('startup-declaration.v1', manifest.startup)
valid('startup-snapshot.v1', snapshot)
valid('startup-milestone.v1', report)
valid('startup-event.v1', { kind: 'snapshot', reason: 'initial', snapshot })
valid('startup-event.v1', { kind: 'closed', reason: 'scope-revoked', cursor: snapshot.cursor })
valid('plugin-manifest.v14', manifest, false)
const legacy = { ...manifest, schemaVersion: 14, $schema: `${base}plugin-manifest.v14.schema.json` }
delete legacy.startup
valid('plugin-manifest.v14', legacy)
valid('plugin-manifest.v14', { ...legacy, startup: manifest.startup }, false)
valid('plugin-manifest.v15', { ...manifest, startup: undefined }, false)
for (const field of ['port', 'endpoint', 'token', 'binding', 'registrationHandle', 'brokerHandle']) {
  const changed = clone(snapshot)
  changed.entries[0][field] = 'unsafe'
  valid('startup-snapshot.v1', changed, false)
}
for (const sequence of [-1, 1.1, Number.MAX_SAFE_INTEGER + 1]) {
  valid('startup-snapshot.v1', { ...snapshot, cursor: { ...snapshot.cursor, sequence } }, false)
}
for (const field of ['ready', 'authentication', 'providerId']) {
  valid('startup-milestone.v1', { ...report, [field]: true }, false)
}
valid('startup-milestone.v1', { ...report, sequence: 0 }, false)
valid('startup-snapshot.v1', {
  ...snapshot,
  entries: [{ ...snapshot.entries[0], catalog: { state: 'known', generation: 'catalog-1', modelIds: [] } }],
})
valid('startup-snapshot.v1', {
  ...snapshot,
  entries: [{ ...snapshot.entries[0], actions: { ...snapshot.entries[0].actions, execute: { available: false } } }],
}, false)

const graph = admit(plugins)
const ref = capabilityId => ({ pluginId: 'example', capabilityId })
const primary = graph.get(key(ref('primary')))
const secondary = graph.get(key(ref('secondary')))
const invalidGraph = (change, reason) => {
  const candidate = clone(plugins)
  change(candidate[0].manifest, candidate)
  assert.throws(() => admit(candidate), new RegExp(reason))
}
invalidGraph(m => m.startup.capabilities.push(clone(m.startup.capabilities[0])), 'duplicate-capability')
invalidGraph(m => m.startup.capabilities[1].providerId = 'example.primary', 'duplicate-provider')
invalidGraph(m => m.startup.capabilities[0].serviceId = 'missing', 'unknown-service')
invalidGraph(m => m.startup.capabilities[0].dependsOn.push(ref('missing')), 'unknown-dependency')
invalidGraph(m => m.startup.capabilities[0].dependsOn.push(ref('primary')), 'dependency-cycle')
invalidGraph(m => {
  m.startup.capabilities[0].dependsOn.push(ref('secondary'))
  m.startup.capabilities[1].dependsOn.push(ref('primary'))
}, 'dependency-cycle')
invalidGraph(
  m => m.startup.capabilities[0].success.allOf.push({ kind: 'milestone', milestoneId: 'missing' }),
  'undeclared-milestone',
)
invalidGraph(m => m.startup.capabilities[2].success.allOf.push({ kind: 'catalog-known' }), 'provider-only-condition')
invalidGraph(m => m.startup.capabilities[0].success.allOf.shift(), 'missing-service-condition')
invalidGraph(m => m.startup.capabilities[0].success.allOf.splice(2, 1), 'missing-provider-condition')
invalidGraph(m => m.startup.pages[0].actions.push(clone(m.startup.pages[0].actions[0])), 'duplicate-action')
invalidGraph(m => m.startup.pages[0].observes.push(ref('missing')), 'unknown-dependency')
invalidGraph((m, all) => {
  const other = clone(all[0])
  other.manifest.id = 'dependency'
  other.manifest.startup.pages = []
  other.manifest.startup.capabilities = [clone(m.startup.capabilities[2])]
  all.push(other)
  m.startup.capabilities[0].dependsOn.push({ pluginId: 'dependency', capabilityId: 'index' })
}, 'undeclared-package-dependency')

const ordinary = plan(graph, plugins, 'interactive')
assert.deepEqual(ordinary.wait, [key(ref('index'))])
assert.equal(ordinary.start.length, 3)
assert.deepEqual(plan(graph, plugins, 'command', ref('primary')).wait, [key(ref('primary'))])
assert.equal(plan(graph, plugins, 'command').start.length, 3, 'when-selected still prepares in background')
assert.throws(() => plan(graph, plugins, 'command', ref('missing')), /unknown-target/)
const dependent = clone(plugins)
dependent[0].manifest.startup.capabilities[0].dependsOn.push(ref('index'))
assert.deepEqual(plan(admit(dependent), dependent, 'command', ref('primary')).wait, [
  key(ref('primary')),
  key(ref('index')),
])
assert.deepEqual(plan(admit([{ manifest: legacy, dependencies: [] }]), [{ manifest: legacy }], 'interactive').legacy, [
  'example/backend',
  'example/indexer',
])

const evidence = {
  started: true,
  service: 'ready',
  process: 'running',
  health: 'ready',
  authentication: 'authenticated',
  requiresAuthentication: true,
  authenticationSupported: true,
  binding: true,
  catalog: { state: 'known', generation: 'catalog-1', modelIds: ['model-a'] },
  provider: 'published',
  milestones: { 'catalog-validated': 'satisfied' },
}
assert.equal(summarize(primary, evidence), 'ready')
assert.equal(summarize(null, evidence), 'unknown')
assert.equal(summarize(primary, { ...evidence, started: false }), 'declared')
assert.equal(summarize(primary, { ...evidence, authentication: 'missing' }), 'auth-required')
assert.equal(summarize(primary, { ...evidence, catalog: { state: 'pending' } }), 'catalog-pending')
assert.equal(summarize(primary, { ...evidence, service: 'registered' }), 'preparing')
assert.equal(summarize(primary, { ...evidence, service: 'failed' }), 'failed')
assert.equal(summarize(primary, { ...evidence, service: 'stopped' }), 'stopped')
assert.equal(summarize(primary, { ...evidence, revoked: true }), 'revoked')
assert.equal(summarize(primary, evidence, false), 'preparing')
assert.equal(availability(primary, { ...evidence, authentication: 'missing' }).reason, 'authentication-required')
assert.equal(
  availability(primary, { ...evidence, authentication: 'missing' }, { action: 'authenticate' }).available,
  true,
)
assert.equal(availability(primary, evidence, { permitted: false }).reason, 'permission-denied')
assert.equal(availability(primary, { ...evidence, binding: false }).reason, 'binding-unavailable')
assert.equal(availability(primary, evidence, { modelId: 'other-model' }).reason, 'model-unavailable')
const empty = {
  ...evidence,
  catalog: { state: 'known', generation: 'catalog-empty', modelIds: [] },
  provider: 'unpublished',
}
assert.equal(conditionSatisfied({ kind: 'catalog-known' }, empty), true)
assert.notEqual(summarize(primary, empty), 'catalog-pending')
assert.equal(availability(primary, empty).reason, 'catalog-empty')
assert.equal(availability(secondary, evidence).available, true, 'same-service provider success stays independent')
assert.equal(availability(primary, { ...evidence, milestones: {} }).available, false)

const owner = {
  pluginId: 'example',
  hostGeneration: 'host-1',
  pluginGeneration: 'plugin-1',
  serviceGeneration: 'service-1',
}
const publication = {
  providerId: primary.providerId,
  compositionOrigin: 'api',
  owner,
  service: { serviceId: 'backend', serviceGeneration: 'service-1' },
}
assert.equal(publicationAllowed(primary, owner, publication, ['api']), true)
for (
  const change of [
    { providerId: 'branding-only' },
    { compositionOrigin: 'undeclared' },
    { owner: { ...owner, pluginId: 'other' } },
    { owner: { ...owner, pluginGeneration: 'old' } },
    { service: { serviceId: 'indexer', serviceGeneration: 'service-1' } },
    { service: { serviceId: 'backend', serviceGeneration: 'old' } },
  ]
) assert.equal(publicationAllowed(primary, owner, { ...publication, ...change }, ['api']), false)

const reporter = new Reporter(primary, report.generation)
const caller = { pluginId: 'example', serviceId: 'backend' }
assert.equal(reporter.report(report, { ...caller, serviceId: 'indexer' }).reason, 'not-owner')
assert.equal(reporter.report({ ...report, milestoneId: 'fake' }, caller).reason, 'undeclared')
assert.equal(
  reporter.report({ ...report, generation: { ...report.generation, service: 'old' } }, caller).reason,
  'stale-generation',
)
assert.equal(reporter.report(report, caller).status, 'accepted')
assert.equal(reporter.report(report, caller).reason, 'stale-sequence')
assert.equal(reporter.report({ ...report, sequence: 2, state: 'failed' }, caller).status, 'accepted')
assert.equal(reporter.states.get(report.milestoneId), 'failed')
reporter.revoked = true
assert.equal(reporter.report({ ...report, sequence: 3 }, caller).reason, 'revoked')

const stream = new ObserverStream(snapshot)
const events = []
const subscription = stream.subscribe(event => events.push(event))
stream.publish([{ ...snapshot.entries[0], state: 'stopped' }])
assert.equal(events.at(-1).kind, 'snapshot', 'one stopped target does not terminate scope')
const read = stream.read()
stream.publish([{ ...snapshot.entries[0], generation: { ...report.generation, service: 'service-2' } }])
const caughtUp = []
stream.subscribe(event => caughtUp.push(event), read.cursor)
assert.equal(caughtUp[0].snapshot.cursor.sequence, 2, 'atomic replay covers read/subscribe race')
assert.equal(caughtUp[0].snapshot.entries[0].generation.service, 'service-2')
stream.publish([])
stream.publish([])
const gap = []
stream.subscribe(event => gap.push(event), snapshot.cursor)
assert.equal(gap[0].reason, 'gap')
assert.deepEqual(gap[0].snapshot.entries, [])
const future = []
stream.subscribe(event => future.push(event), { ...stream.read().cursor, sequence: 99 })
assert.equal(future[0].reason, 'gap')
assert.throws(() => stream.subscribe(() => {}, { ...read.cursor, scopeId: 'other' }), /scope-mismatch/)
assert.throws(() => stream.subscribe(() => {}, { ...read.cursor, hostGeneration: 'other' }), /scope-mismatch/)
stream.publish([], 'epoch-2')
assert.equal(events.at(-1).reason, 'epoch-changed')
const reset = []
stream.subscribe(event => reset.push(event), read.cursor)
assert.equal(reset[0].reason, 'epoch-changed')
subscription.close()
subscription.close()
const closedCount = events.length
stream.publish([])
assert.equal(events.length, closedCount)
assert.equal(events.filter(e => e.kind === 'closed').length, 1)
stream.terminate('host-replaced')
assert.equal(reset.at(-1).reason, 'host-replaced')
assert.equal(stream.publish([]), false)
assert.throws(() => stream.read(), /scope-revoked/)
assert.throws(() => stream.subscribe(() => {}), /scope-revoked/)

const preparation = new Preparation('generation-1')
preparation.join('cli-a')
preparation.join('cli-b')
assert.equal(preparation.starts, 1)
preparation.cancel('cli-a')
assert.deepEqual(preparation.complete('old-generation'), [])
assert.deepEqual(preparation.complete('generation-1'), ['cli-b'])
preparation.release('cli-a')
assert.equal(preparation.leases.has('cli-b'), true)
assert.equal(preparation.running, true)
console.log(
  'startup v1: schemas, ownership/graph, target barriers, independent actions, milestones, cursor recovery, terminal and waiter fencing passed',
)

const { checkCatalogAndPreparation } = await import('./startup-catalog.mjs')
await checkCatalogAndPreparation(fixture, graph, ajv.getSchema(`${base}startup-catalog-report.v1.schema.json`))
console.log(
  'startup v1: awaited base apply, per-capability prepare, empty discovery, digest and Node catalog authority passed',
)

for (
  const connection of [
    { state: 'connected' },
    { state: 'disconnected', reason: 'timeout' },
    { state: 'reconnecting', reason: 'transport-unavailable' },
  ]
) valid('startup-event.v1', { kind: 'connection', connection })
valid(
  'startup-event.v1',
  { kind: 'connection', connection: { state: 'disconnected', reason: 'raw-http-error' } },
  false,
)
valid('startup-event.v1', { kind: 'connection', connection: { state: 'connected' }, cursor: snapshot.cursor }, false)
const retained = clone(snapshot)
const connectionEvents = [{ state: 'disconnected', reason: 'timeout' }, {
  state: 'reconnecting',
  reason: 'transport-unavailable',
}, { state: 'connected' }]
for (const connection of connectionEvents) {
  valid('startup-event.v1', { kind: 'connection', connection })
  assert.deepEqual(retained, snapshot, 'transport status cannot manufacture authority sequence or state')
}
