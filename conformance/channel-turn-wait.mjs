import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import Ajv from 'ajv/dist/2020.js'
const root = new URL('../', import.meta.url)
const metadata = JSON.parse(await readFile(new URL('package.json', root), 'utf8'))
assert.deepEqual(metadata.exports['./channel-turn-wait/v1'], { types: './types/channel-turn-wait.v1.d.ts' })
assert.ok(metadata.files.includes('types/channel-turn-wait.v1.d.ts'))
const schema = JSON.parse(await readFile(new URL('schemas/channel-turn-wait.v1.schema.json', root), 'utf8'))
const valid = new Ajv({ strict: false }).compile(schema)
assert.ok(valid({ revision: 0, enabled: false, firstResponseTimeoutMs: 120_000 }))
assert.ok(valid({ revision: 1, enabled: true, firstResponseTimeoutMs: 30_000 }))
for (
  const input of [
    { revision: -1, enabled: true, firstResponseTimeoutMs: 30_000 },
    { revision: 0, enabled: true, firstResponseTimeoutMs: 29_999 },
    { revision: 0, enabled: true, firstResponseTimeoutMs: 86_400_001 },
    { revision: 0, enabled: true, firstResponseTimeoutMs: 30_000, autoRetry: true },
    { revision: 0, enabled: 'true', firstResponseTimeoutMs: 30_000 },
  ]
) assert.equal(valid(input), false)
console.log('Channel turn wait: bounded opt-in policy and closed shape passed.')
