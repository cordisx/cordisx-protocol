import assert from 'node:assert/strict'

// Reference admission table, not evidence of Host adoption.
const admits = row =>
  row.groupAdmin && row.exactBinding && row.currentRule && row.allSendersAllowed
  && row.idle && row.sourceEvidence === 'unavailable' && row.sameProvider && row.targetEvidence === 'healthy'
const base = {
  groupAdmin: true,
  exactBinding: true,
  currentRule: true,
  allSendersAllowed: true,
  idle: true,
  sourceEvidence: 'unavailable',
  sameProvider: true,
  targetEvidence: 'healthy',
}
assert.equal(admits(base), true)
for (const key of ['groupAdmin', 'exactBinding', 'currentRule', 'allSendersAllowed', 'idle', 'sameProvider']) {
  assert.equal(admits({ ...base, [key]: false }), false, key)
}
for (const sourceEvidence of ['healthy', 'inconclusive', 'cancelled']) {
  assert.equal(admits({ ...base, sourceEvidence }), false)
}
for (const targetEvidence of ['unavailable', 'inconclusive', 'cancelled']) {
  assert.equal(admits({ ...base, targetEvidence }), false)
}
const disposition = state => state === 'confirmed' ? 'dispatch' : state === 'unknown' ? 'reconcile' : 'stop'
assert.equal(disposition('confirmed'), 'dispatch')
assert.equal(disposition('unknown'), 'reconcile')
assert.equal(disposition('rejected'), 'stop')
console.log('Group idle priority: authority, exact scope and evidence checks passed.')
