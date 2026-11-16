import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const root = new URL('../', import.meta.url)
const metadata = JSON.parse(await readFile(new URL('package.json', root), 'utf8'))
const declaration = await readFile(new URL('types/channel-manager.v11.d.ts', root), 'utf8')
const contract = await readFile(new URL('.agents/docs/channel-runtime/manager-v11-settings.md', root), 'utf8')
assert.deepEqual(metadata.exports['./channel-manager/v11'], { types: './types/channel-manager.v11.d.ts' })
assert.ok(metadata.files.includes('types/channel-manager.v11.d.ts'))
for (const section of ['new-chats', 'messages', 'permissions', 'organization']) {
  assert.ok(declaration.includes(`'${section}'`))
  assert.ok(contract.includes(`\`${section}\``))
}
assert.ok(declaration.includes('extends ChannelManagerV10'))
assert.ok(contract.includes('actual caller source and generation'))
assert.ok(contract.includes('Revocation, disposal or generation retirement restores'))
console.log('Channel settings: versioned sections, packaged entry and caller/lifecycle boundaries passed.')
