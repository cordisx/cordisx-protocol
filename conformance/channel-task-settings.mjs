import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import Ajv from 'ajv/dist/2020.js'
const root = new URL('../', import.meta.url)
const metadata = JSON.parse(await readFile(new URL('package.json', root), 'utf8'))
const declaration = await readFile(new URL('types/channel-manager.v12.d.ts', root), 'utf8')
const contract = await readFile(new URL('.agents/docs/channel-runtime/task-settings-v1.md', root), 'utf8')
for (
  const [entry, file] of [['channel-manager/v12', 'channel-manager.v12.d.ts'], [
    'channel-task-settings/v1',
    'channel-task-settings.v1.d.ts',
  ]]
) {
  assert.deepEqual(metadata.exports[`./${entry}`], { types: `./types/${file}` })
  assert.ok(metadata.files.includes(`types/${file}`))
}
assert.ok(declaration.includes('extends ChannelManagerV11'))
assert.ok(declaration.includes("'task-models'"))
assert.ok(declaration.includes('mountBindingModelForm'))
for (
  const phrase of [
    'Deny rules win',
    'authenticated Channel actor',
    'before the first native task turn',
    'Unknown native',
  ]
) assert.ok(contract.includes(phrase))
const schema = JSON.parse(await readFile(new URL('schemas/channel-task-config.v1.schema.json', root), 'utf8'))
const validate = new Ajv({ strict: false }).compile(schema)
assert.ok(
  validate({
    defaults: { providerId: 'openai', model: 'example', effort: 'high' },
    scopes: [],
    permissions: [{
      id: 'owners',
      effect: 'allow',
      userIds: ['user'],
      fields: ['model'],
      models: [{ providerId: 'openai', model: 'example' }],
    }],
  }),
)
for (
  const value of [{ defaults: { apiKey: 'secret' }, scopes: [], permissions: [] }, {
    defaults: {},
    scopes: [],
    permissions: [{ id: 'a', effect: 'allow', fields: ['approval'] }],
  }]
) assert.equal(validate(value), false)
assert.deepEqual(metadata.exports['./channel-provider-continuation/v1'], {
  types: './types/channel-provider-continuation.v1.d.ts',
})
assert.ok(metadata.files.includes('types/channel-provider-continuation.v1.d.ts'))
const forkContract = await readFile(new URL('.agents/docs/channel-runtime/provider-continuation-v1.md', root), 'utf8')
for (
  const phrase of ['explicitly select', 'must not silently expand', 'atomically moves', 'never\nautomatically repeated']
) {
  assert.ok(forkContract.includes(phrase))
}
const requestSchema = JSON.parse(
  await readFile(
    new URL('schemas/channel-provider-continuation-request.v1.schema.json', root),
    'utf8',
  ),
)
const resultSchema = JSON.parse(
  await readFile(
    new URL('schemas/channel-provider-continuation-result.v1.schema.json', root),
    'utf8',
  ),
)
const forkRequest = new Ajv({ strict: false }).compile(requestSchema)
const forkResult = new Ajv({ strict: false }).compile(resultSchema)
const request = {
  contract: 'cordisx.channel-provider-continuation/v1',
  operationId: 'op',
  sourceSessionId: 'old',
  expectedRevision: 1,
  target: { providerId: 'new', model: 'model' },
  history: 'inherit',
}
assert.ok(forkRequest(request))
assert.equal(forkRequest({ ...request, history: 'omit' }), false)
assert.equal(forkRequest({ ...request, apiKey: 'secret' }), false)
for (
  const [file, expected] of [
    ['valid/request.json', true],
    ['invalid/no-history-consent.json', false],
  ]
) {
  const vector = JSON.parse(await readFile(new URL(`test-vectors/channel-provider-continuation/${file}`, root), 'utf8'))
  assert.equal(forkRequest(vector), expected)
}
assert.ok(forkResult({ state: 'applied', operationId: 'op', destinationSessionId: 'new' }))
assert.ok(forkResult({ state: 'unknown', operationId: 'op' }))
assert.equal(forkResult({ state: 'applied', operationId: 'op' }), false)
assert.equal(forkResult({ state: 'rejected', operationId: 'op', destinationSessionId: 'new' }), false)
console.log('Channel task settings: versioned forms, permission shapes and credential exclusion passed.')
