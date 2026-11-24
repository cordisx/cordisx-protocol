import assert from 'node:assert/strict'

// Reference rule: a group grant is not a sender's independent mutation permission.
const eligible = row => row.adminAuthorized && row.explicitGroupGrant && row.senderDispatch && !row.explicitDeny
const base = { adminAuthorized: true, explicitGroupGrant: true, senderDispatch: true, explicitDeny: false }
assert.equal(eligible(base), true)
for (const key of ['adminAuthorized', 'explicitGroupGrant', 'senderDispatch']) {
  assert.equal(eligible({ ...base, [key]: false }), false, key)
}
assert.equal(eligible({ ...base, explicitDeny: true }), false)
console.log('Group idle priority v2: admin rule, sender dispatch and explicit denials passed.')
