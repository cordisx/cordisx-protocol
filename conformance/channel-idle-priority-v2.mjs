import assert from 'node:assert/strict'

// A reference decision table; this does not establish Host adoption.
const select = (authorized, results, current = true) => {
  if (!current) return undefined
  for (const candidate of authorized) {
    if (results[candidate] === 'cancelled') return undefined
    if (results[candidate] === 'healthy') return candidate
  }
  return undefined
}
const disclosed = ['first', 'second', 'third']
assert.equal(select(disclosed, { first: 'unavailable', second: 'inconclusive', third: 'healthy' }), 'third')
assert.equal(select(disclosed, { first: 'healthy', second: 'healthy' }), 'first')
assert.equal(select(disclosed, { first: 'unavailable', second: 'inconclusive' }), undefined)
assert.equal(select(disclosed, { fourth: 'healthy' }), undefined)
assert.equal(select(disclosed, { first: 'cancelled', second: 'healthy' }), undefined)
assert.equal(select(disclosed, { first: 'healthy' }, false), undefined)
console.log('Idle Channel priority v2: disclosed order, healthy evidence and current grant passed.')
