import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import Ajv from 'ajv/dist/2020.js'

const schema = JSON.parse(await readFile(new URL('../schemas/agent-tools.v1.schema.json', import.meta.url), 'utf8'))
const validate = new Ajv().compile(schema)
const valid = {
  contract: 'cordisx.agent-tools/v1',
  skills: [{ id: 'room', path: './skills/room' }],
  commands: [{ id: 'send', entry: './cli/send.mjs', skillId: 'room' }],
}
assert.equal(validate(valid), true)
for (
  const invalid of [
    { ...valid, token: 'never-a-resource' },
    { ...valid, skills: [{ id: 'room', path: '/outside' }] },
    { ...valid, commands: [{ id: 'send', entry: './cli/send.mjs', skillId: 'room', owner: 'another-plugin' }] },
    { ...valid, contract: 'cordisx.agent-tools/v2' },
  ]
) assert.equal(validate(invalid), false)
console.log('Agent tools v1 resource conformance passed')
