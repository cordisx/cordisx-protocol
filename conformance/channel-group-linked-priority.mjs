import assert from 'node:assert/strict'

// Reference scope filter, not evidence of a Host implementation.
const inScope = (entry, scope) =>
  entry.adapterId === scope.adapterId && entry.accountId === scope.accountId
  && entry.tenantId === scope.tenantId && entry.groupId === scope.groupId
const scope = { adapterId: 'test', accountId: 'account', tenantId: 'tenant', groupId: 'group' }
const visible = entry =>
  inScope(entry, scope) && (entry.kind === 'accepted-input' && entry.dispatched
    || entry.kind === 'reply' && entry.confirmed)
assert.equal(visible({ ...scope, kind: 'accepted-input', dispatched: true }), true)
assert.equal(visible({ ...scope, kind: 'reply', confirmed: true }), true)
assert.equal(visible({ ...scope, groupId: 'other', kind: 'reply', confirmed: true }), false)
assert.equal(visible({ ...scope, kind: 'reply', confirmed: false }), false)
assert.equal(visible({ ...scope, kind: 'accepted-input', dispatched: false }), false)
assert.equal(visible({ ...scope, kind: 'native-unknown' }), false)
console.log('Group linked priority: provenance and confirmed-delivery scope passed.')
