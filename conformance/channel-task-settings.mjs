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
console.log('Channel task settings: versioned forms, permission shapes and credential exclusion passed.')
