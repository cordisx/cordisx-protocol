import assert from 'node:assert/strict'

// Contract-only model; Host selection/redaction and package validation are separate.
function snapshotForInstance(selection, instance) {
  if (selection.profileId !== instance.profileId || selection.pluginId !== instance.pluginId) {
    throw new Error('wrong-instance')
  }
  if (instance.value === undefined) return undefined
  if (!instance.secretPolicyKnown) throw new Error('unknown-secret-policy')
  const seen = new Set()
  const copy = value => {
    if (value === null || typeof value === 'string' || typeof value === 'boolean') return value
    if (typeof value === 'number' && Number.isFinite(value)) return value
    if (typeof value !== 'object' || seen.has(value)) throw new Error('invalid-json')
    const prototype = Object.getPrototypeOf(value)
    if (!Array.isArray(value) && prototype !== Object.prototype && prototype !== null) throw new Error('invalid-json')
    seen.add(value)
    const result = Array.isArray(value) ? [] : Object.create(null)
    for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(value))) {
      if (Array.isArray(value) && key === 'length') continue
      if (!('value' in descriptor)) throw new Error('invalid-json')
      result[key] = copy(descriptor.value)
    }
    seen.delete(value)
    return Object.freeze(result)
  }
  if (!instance.value || Array.isArray(instance.value) || typeof instance.value !== 'object') {
    throw new Error('invalid-root')
  }
  if (![Object.prototype, null].includes(Object.getPrototypeOf(instance.value))) throw new Error('invalid-root')
  const safe = Object.create(null)
  for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(instance.value))) {
    // Declared sensitive fields are excluded by existing policy, not guessed by name.
    if (instance.secretFields.includes(key)) continue
    if (!('value' in descriptor)) throw new Error('invalid-json')
    safe[key] = descriptor.value
  }
  return Object.freeze({ contract: 'cordisx.managed-service-instance-configuration/v1', value: copy(safe) })
}

const selection = { profileId: 'profile-a', pluginId: 'example' }
const instance = {
  ...selection,
  secretPolicyKnown: true,
  secretFields: ['credential'],
  value: {
    root: './account-data',
    storage: { mode: 'service-home' },
    credential: 'excluded-secret',
  },
}
const snapshot = snapshotForInstance(selection, instance)
assert.equal(snapshot.value.credential, undefined)
assert.equal(snapshot.value.root, './account-data')
assert.throws(() => {
  snapshot.value.storage.mode = 'global'
}, TypeError)
instance.value.root = './changed-after-selection'
assert.equal(snapshot.value.root, './account-data')
assert.equal(snapshotForInstance(selection, { ...instance, value: undefined }), undefined)
assert.deepEqual(Object.keys(snapshotForInstance(selection, { ...instance, value: {} }).value), [])
assert.throws(() => snapshotForInstance({ ...selection, profileId: 'other' }, instance), /wrong-instance/)
assert.throws(() => snapshotForInstance(selection, { ...instance, secretPolicyKnown: false }), /unknown-secret-policy/)
for (
  const invalid of [NaN, Infinity, () => {}, new Date(), {
    get root() {
      throw new Error('must-not-run')
    },
  }]
) {
  assert.throws(() => snapshotForInstance(selection, { ...instance, value: { bad: invalid } }), /invalid-json/)
}
const cycle = {}
cycle.self = cycle
assert.throws(() => snapshotForInstance(selection, { ...instance, value: cycle }), /invalid-json/)
const define = configuration => {
  const value = configuration?.value ?? {}
  if (value.storage && value.storage.mode !== 'service-home') throw new Error('unsupported-storage')
  return { statusRoot: value.root ?? 'service-home-default', gatewayRoot: value.root ?? 'service-home-default' }
}
assert.equal(define(undefined).statusRoot, 'service-home-default')
assert.equal(define({ ...snapshot, value: {} }).gatewayRoot, 'service-home-default')
assert.throws(() => define({ ...snapshot, value: { storage: { mode: 'global' } } }), /unsupported-storage/)
const applyInput = { configuration: snapshot }
const prepareInput = { configuration: snapshot }
assert.equal(applyInput.configuration, prepareInput.configuration)
assert.deepEqual(define(applyInput.configuration), define(prepareInput.configuration))
const replacement = snapshotForInstance(selection, instance)
assert.notEqual(replacement, snapshot)
assert.equal(snapshot.value.root, './account-data')
console.log(
  'startup instance configuration: selected owner, optional defaults, redaction, immutable generation and product validation passed',
)

await import('./startup-node-config.mjs')
