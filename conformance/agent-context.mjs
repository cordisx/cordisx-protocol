import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const root = new URL('../', import.meta.url)
const pkg = JSON.parse(await readFile(new URL('package.json', root)))
for (const name of ['agent-context/v1', 'agent-turn-control/v1', 'channel-manager/v14']) {
  const path = `types/${name.replace('/', '.')}.d.ts`
  assert.deepEqual(pkg.exports[`./${name}`], { types: `./${path}` })
  assert.ok(pkg.files.includes(path))
}
// Reference evaluator for the normative threshold state machine; Host tests
// must independently exercise its production implementation and event fences.
function watch(threshold) {
  if (!Number.isFinite(threshold) || threshold <= 0 || threshold > 0.95) throw new RangeError('threshold')
  let epoch, below
  return sample => {
    if (!sample.fresh || !sample.budget) {
      epoch = undefined
      below = undefined
      return undefined
    }
    const key = `${sample.reset}/${sample.config}`
    const above = sample.used / sample.budget >= threshold
    if (key !== epoch) {
      epoch = key
      below = !above
      return above ? 'epoch-initial' : undefined
    }
    if (!above) {
      below = true
      return undefined
    }
    if (below) {
      below = false
      return 'crossed'
    }
  }
}
const sample = (used, extra = {}) => ({ used, budget: 80000, reset: 'r1', config: 'c1', fresh: true, ...extra })
for (const [ratio, tokens] of [[0.5, 40000], [0.9, 72000], [0.95, 76000], [0.119, 9520]]) {
  const next = watch(ratio)
  assert.equal(next(sample(tokens - 1)), undefined)
  assert.equal(next(sample(tokens)), 'crossed')
  assert.equal(next(sample(tokens)), undefined)
}
for (const ratio of [0, -1, 0.99, NaN, Infinity]) assert.throws(() => watch(ratio), RangeError)
const next = watch(0.5)
assert.equal(next(sample(50000, { budget: 0 })), undefined)
assert.equal(next(sample(50000)), 'epoch-initial')
assert.equal(next(sample(50000)), undefined)
assert.equal(next(sample(50000, { reset: 'r2' })), 'epoch-initial')
assert.equal(next(sample(50000, { reset: 'r2', config: 'c2', budget: 120000 })), undefined)
assert.equal(next(sample(60000, { reset: 'r2', config: 'c2', budget: 120000 })), 'crossed')
assert.equal(next(sample(70000, { fresh: false })), undefined)
assert.equal(next(sample(70000, { reset: 'r2', config: 'c2', budget: 120000 })), 'epoch-initial')
const spec = await readFile(new URL('.agents/docs/agent-context/README.md', root), 'utf8')
for (
  const phrase of [
    'current connection',
    'agent.events.read',
    'out-of-order',
    'never redirects',
    'reported-snapshot',
    'estimated-current',
    '0.95',
  ]
) {
  assert.ok(spec.includes(phrase))
}
console.log('Agent context: threshold, epoch, invalid budget, freshness and export vectors passed.')
