import assert from 'node:assert/strict'

// A reference decision table, not evidence of any Host's implementation.
const admitted = value =>
  value.explicitConsent && value.currentGrant && value.singleDirectBinding
  && value.allQueuedInputsAuthorized && value.sourceIdle && value.sourceSelectionUnchanged
  && value.sourceProbe === 'unavailable' && value.targetProbe === 'healthy'
  && value.currentPermissions && value.nativeFenceReady
const base = {
  explicitConsent: true,
  currentGrant: true,
  singleDirectBinding: true,
  allQueuedInputsAuthorized: true,
  sourceIdle: true,
  sourceSelectionUnchanged: true,
  sourceProbe: 'unavailable',
  targetProbe: 'healthy',
  currentPermissions: true,
  nativeFenceReady: true,
}
assert.equal(admitted(base), true)
for (
  const field of [
    'explicitConsent',
    'currentGrant',
    'singleDirectBinding',
    'allQueuedInputsAuthorized',
    'sourceIdle',
    'sourceSelectionUnchanged',
    'currentPermissions',
    'nativeFenceReady',
  ]
) assert.equal(admitted({ ...base, [field]: false }), false, field)
for (const evidence of ['healthy', 'inconclusive', 'cancelled']) {
  assert.equal(admitted({ ...base, sourceProbe: evidence }), false, `source ${evidence}`)
}
for (const evidence of ['unavailable', 'inconclusive', 'cancelled']) {
  assert.equal(admitted({ ...base, targetProbe: evidence }), false, `target ${evidence}`)
}
const next = state => state === 'created-confirmed' ? 'commit' : state === 'effect-unknown' ? 'reconcile' : 'stop'
assert.equal(next('created-confirmed'), 'commit')
assert.equal(next('effect-unknown'), 'reconcile')
assert.equal(next('rejected'), 'stop')
console.log('Idle Channel priority: consent, probe evidence, source fencing and uncertain effects passed.')
