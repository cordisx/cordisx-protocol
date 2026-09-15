import assert from 'node:assert/strict'

const bind = principal => ({
  async openOwnPluginConfiguration() {
    if (!principal.active()) return 'unavailable'
    const generation = principal.generation()
    if (!principal.actionable()) return 'unavailable'
    if (!principal.active() || principal.generation() !== generation) return 'unavailable'
    try {
      principal.open()
      return 'opened'
    } catch {
      return 'unavailable'
    }
  },
})

let active = true
let actionable = true
let generation = 'g1'
let opens = 0
let receiver = () => {
  opens += 1
}
const service = bind({
  active: () => active,
  actionable: () => actionable,
  generation: () => generation,
  open: () => receiver(),
})

assert.equal(await service.openOwnPluginConfiguration(), 'opened')
assert.equal(opens, 1)
actionable = false
assert.equal(await service.openOwnPluginConfiguration(), 'unavailable')
assert.equal(opens, 1)
actionable = true
active = false
assert.equal(await service.openOwnPluginConfiguration(), 'unavailable')
assert.equal(opens, 1)
active = true
receiver = () => {
  throw new Error('Manager receiver unavailable')
}
assert.equal(await service.openOwnPluginConfiguration(), 'unavailable')
assert.equal(opens, 1)

const replacedDuringResolution = bind({
  active: () => true,
  actionable: () => {
    generation = 'g2'
    return true
  },
  generation: () => generation,
  open: () => {
    throw new Error('stale generation must not dispatch')
  },
})
generation = 'g1'
assert.equal(await replacedDuringResolution.openOwnPluginConfiguration(), 'unavailable')

console.log('manager self-configuration v1 conformance passed')
