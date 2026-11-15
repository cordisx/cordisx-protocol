import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'

const root = new URL('../', import.meta.url)
const base = 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/'
const ajv = new Ajv2020({ strict: true, allErrors: true, allowUnionTypes: true })
addFormats(ajv)
for (const file of await readdir(new URL('schemas/', root))) {
  if (file.endsWith('.schema.json')) ajv.addSchema(JSON.parse(await readFile(new URL(`schemas/${file}`, root), 'utf8')))
}
const validate = ajv.getSchema(`${base}plugin-manifest.v16.schema.json`)
const valid = value =>
  validate(value) && new Set(value.capabilities.map(item => item.name)).size === value.capabilities.length
const exact = name => ({ name, required: false, scope: { runtime: 'exact-request' } })
const manifest = {
  $schema: `${base}plugin-manifest.v16.schema.json`,
  schemaVersion: 16,
  id: 'channel',
  capabilities: [exact('channel.accounts.connect'), exact('channel.bindings.write')],
  services: [{
    id: 'runtime',
    kind: 'channel-adapter',
    entry: './dist/service.mjs',
    configuration: { kind: 'host', schema: `${base}channel-service-config.v1.schema.json`, configApplies: 'restart' },
  }],
}
assert.equal(valid(manifest), true, JSON.stringify(validate.errors))
for (const name of ['channel.events.receive', 'channel.messages.send', 'channel.attachments.read']) {
  assert.equal(valid({ ...manifest, capabilities: [exact(name)] }), false, name)
}
assert.equal(valid({ ...manifest, capabilities: [{ ...exact('channel.accounts.connect'), required: true }] }), false)
assert.equal(
  valid({
    ...manifest,
    capabilities: [{ ...exact('channel.accounts.connect'), scope: { runtime: 'exact-request', channelAccounts: [] } }],
  }),
  false,
)
assert.equal(
  valid({ ...manifest, capabilities: [exact('channel.accounts.connect'), exact('channel.accounts.connect')] }),
  false,
)
const old = ajv.getSchema(`${base}plugin-manifest.v13.schema.json`)
assert.equal(old({ ...manifest, $schema: `${base}plugin-manifest.v13.schema.json`, schemaVersion: 13 }), false)
const scope = ajv.getSchema(`${base}permission-common.v5.schema.json#/$defs/scope`)
assert.equal(scope({ runtime: 'exact-request' }), false)
assert.equal(scope({ channelAccounts: [{ adapterId: 'feishu', accountId: 'cli_test' }] }), true)
assert.equal(scope({ channelTenants: [{ adapterId: 'feishu', accountId: 'cli_test', tenantId: 'test' }] }), true)
const descriptor = {
  $schema: `${base}plugin-package.v16.schema.json`,
  schemaVersion: 16,
  id: 'channel',
  version: '0.1.1',
  entry: './dist/channel.js',
  distribution: { mode: 'explicit-local-v1', signature: 'unsupported' },
  compatibility: { runtimeAbi: 1, protocolSchemas: [manifest.$schema] },
  dependencies: [],
  runtimeManifest: {
    path: './runtime-manifest.json',
    schema: manifest.$schema,
    digest: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  },
}
const packageValid = ajv.getSchema(`${base}plugin-package.v16.schema.json`)
assert.equal(packageValid(descriptor), true, JSON.stringify(packageValid.errors))
assert.equal(
  ajv.getSchema(`${base}plugin-package.v15.schema.json`)({
    ...descriptor,
    $schema: `${base}plugin-package.v15.schema.json`,
    schemaVersion: 15,
  }),
  false,
)
console.log('Channel exact-request v16: manifest, predecessor rejection, concrete scope and package conformance passed')
