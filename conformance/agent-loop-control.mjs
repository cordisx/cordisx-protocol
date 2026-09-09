import assert from 'node:assert/strict'

// Minimal state machine for deadline/terminal races. A stop result is not invented.
function controller(interrupt) {
  let state = 'running'
  return {
    state: () => state,
    complete() {
      if (state === 'running') state = 'completed'
    },
    async cancel(deadline = false) {
      if (state !== 'running') return 'already-terminal'
      if (!await interrupt()) return 'unavailable'
      if (state !== 'running') return 'already-terminal'
      state = deadline ? 'deadline-exceeded' : 'cancelled'
      return 'cancelled'
    },
  }
}
let calls = 0
const expires = controller(async () => {
  calls++
  return true
})
assert.equal(await expires.cancel(true), 'cancelled')
expires.complete()
assert.equal(expires.state(), 'deadline-exceeded')
assert.equal(await expires.cancel(), 'already-terminal')
assert.equal(calls, 1)
const rejects = controller(async () => false)
assert.equal(await rejects.cancel(), 'unavailable')
assert.equal(rejects.state(), 'running')
const finished = controller(async () => {
  throw new Error('must not interrupt completed turn')
})
finished.complete()
assert.equal(await finished.cancel(), 'already-terminal')
console.log('AgentLoop control v1 completion, interrupt refusal and deadline vectors passed')
