import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const root = new URL('../', import.meta.url)
const metadata = JSON.parse(await readFile(new URL('package.json', root), 'utf8'))
const declaration = await readFile(new URL('types/channel-manager.v13.d.ts', root), 'utf8')
const contract = await readFile(new URL('.agents/docs/channel-runtime/manager-v13-creation-defaults.md', root), 'utf8')
assert.deepEqual(metadata.exports['./channel-manager/v13'], { types: './types/channel-manager.v13.d.ts' })
assert.ok(metadata.files.includes('types/channel-manager.v13.d.ts'))
assert.ok(declaration.includes('extends ChannelManagerV12'))
assert.ok(declaration.includes('mountChannelCreationDefaultsForm'))
for (
  const requirement of [
    'separate settings',
    'explicit `false`',
    'do not retroactively',
    'retain their general profile-default',
  ]
) {
  assert.ok(contract.includes(requirement))
}
console.log('Channel creation defaults: additive export, sparse inheritance and frozen predecessors passed.')
