import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import Ajv from 'ajv/dist/2020.js'
const ajv = new Ajv({ strict: true, allErrors: true })
const base = 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/'
for (const name of ['entity-execution-binding', 'entity-execution-binding-write', 'entity-execution-context-request']) {
  ajv.addSchema(JSON.parse(await readFile(new URL(`../schemas/${name}.v1.schema.json`, import.meta.url), 'utf8')))
}
const binding = ajv.getSchema(base + 'entity-execution-binding.v1.schema.json')
assert(binding({ kind: 'projectless' }))
assert(binding({ kind: 'project', projectId: 'actual-host-project', cwd: '/work/project' }))
for (
  const value of [{}, { kind: 'projectless', cwd: '/host/source' }, { kind: 'project', projectId: '' }, {
    kind: 'project',
    projectId: 'p',
    cwd: 'relative',
  }]
) assert.equal(binding(value), false)
const identity = { agentId: 'leader', revision: 'exact' }
const resolve = ajv.getSchema(base + 'entity-execution-context-request.v1.schema.json')
assert(resolve({ identity, operationId: 'first-message' }))
assert.equal(resolve({ identity, operationId: 'first-message', owner: 'forged' }), false)
const write = ajv.getSchema(base + 'entity-execution-binding-write.v1.schema.json')
assert(write({ identity, expectedRevision: 0, mutationId: 'bind', binding: { kind: 'projectless' } }))
assert.equal(write({ identity, expectedRevision: -1, mutationId: 'bind', binding: { kind: 'projectless' } }), false)
console.log('entity execution context v1 schema conformance passed')
