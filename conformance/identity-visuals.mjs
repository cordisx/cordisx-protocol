import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import Ajv from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'
import { cloneBrandIconV1 } from '../runtime/brand-icon.v1.js'

const names = [
  'ui-common.v1',
  'agent-avatar.v1',
  'navigation-collection-actions.v1',
  'manager-collection-common.v1',
  'manager-collection-common.v2',
  'manager-collection-snapshot.v1',
  'manager-collection-snapshot.v2',
  'raster-image-snapshot.v1',
  'brand-icon.v1',
  'channel-common.v1',
  'channel-service-config.v1',
  'channel-manager-common.v2',
  'channel-runtime-snapshot.v3',
  'channel-runtime-snapshot.v4',
]
const ajv = new Ajv({ strict: true, strictRequired: false, allowUnionTypes: true, allErrors: true })
addFormats(ajv)
for (const name of names) {
  ajv.addSchema(JSON.parse(await readFile(new URL(`../schemas/${name}.schema.json`, import.meta.url), 'utf8')))
}
const id = name => `https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/${name}.schema.json`
const validate = name => ajv.getSchema(id(name))
const image = JSON.parse(
  await readFile(new URL('../test-vectors/identity-visuals/avatar.json', import.meta.url), 'utf8'),
)
cloneBrandIconV1({ kind: 'raster-image', image })

const collection = {
  $schema: id('manager-collection-snapshot.v2'),
  contract: 'cordisx.manager-collection-snapshot/v2',
  schemaVersion: 2,
  collectionId: 'connections',
  queryRevision: 7,
  view: 'all',
  normalizedSearch: '',
  revision: 3,
  items: [{
    id: 'one',
    title: { key: 'connection', fallback: 'Account' },
    summary: { key: 'summary', fallback: 'Platform' },
    leadingVisual: { kind: 'identity', icon: 'host:chat', avatar: image },
    route: { id: 'detail' },
    order: 0,
    disabled: { value: false },
    actions: [],
  }],
}
assert.equal(validate('manager-collection-snapshot.v2')(collection), true)
const platformOnly = structuredClone(collection)
delete platformOnly.items[0].leadingVisual.avatar
assert.equal(validate('manager-collection-snapshot.v2')(platformOnly), true)
const rasterBrand = structuredClone(collection)
rasterBrand.items[0].leadingVisual.icon = { kind: 'raster-image', image }
assert.equal(validate('manager-collection-snapshot.v2')(rasterBrand), true)
const older = {
  ...collection,
  $schema: id('manager-collection-snapshot.v1'),
  contract: 'cordisx.manager-collection-snapshot/v1',
  schemaVersion: 1,
}
assert.equal(validate('manager-collection-snapshot.v1')(older), false)
for (
  const visual of [
    { kind: 'identity', icon: 'https://example.test/icon.png' },
    { kind: 'identity', icon: 'host:chat', avatar: 'https://example.test/avatar.png' },
    { kind: 'identity', icon: 'host:chat', accountId: 'private' },
    { kind: 'identity', icon: 'host:chat', style: { borderRadius: 12 } },
    { kind: 'identity', icon: 'host:chat', avatar: { ...image, width: 257 } },
  ]
) {
  assert.equal(
    validate('manager-collection-snapshot.v2')({
      ...collection,
      items: [{ ...collection.items[0], leadingVisual: visual }],
    }),
    false,
  )
}
assert.throws(() => cloneBrandIconV1({ kind: 'raster-image', image: { ...image, data: `${image.data}AAAA` } }))

const account = {
  connectionToken: `chm1_${'a'.repeat(43)}`,
  adapterKind: 'feishu',
  implementationStatus: 'implemented',
  connectionState: 'ready',
  configurationState: 'ready',
  generation: 1,
  lastGoodRevision: 1,
  inbound: { pending: 0, retrying: 0, deadLetter: 0 },
  outbound: { pending: 0, retrying: 0, deadLetter: 0 },
  availableOperations: [],
  accountName: 'Connection bot',
  accountAvatar: image,
}
const channel = {
  contract: 'cordisx.channel-runtime-snapshot/v4',
  schemaVersion: 4,
  profileId: 'default',
  hostGeneration: 'generation-1',
  revision: 7,
  observedAt: '2026-11-14T14:00:00.000Z',
  availableOperations: [],
  accounts: [account],
  bindings: [],
  pendingAuthorizations: [],
}
assert.equal(validate('channel-runtime-snapshot.v4')(channel), true)
assert.equal(
  validate('channel-runtime-snapshot.v3')({
    ...channel,
    contract: 'cordisx.channel-runtime-snapshot/v3',
    schemaVersion: 3,
  }),
  false,
)
for (
  const fields of [
    { accountAvatar: 'https://example.test/avatar.png' },
    { accountId: 'private' },
    { accountName: '' },
    { accountAvatar: { ...image, cookie: 'private' } },
  ]
) {
  assert.equal(validate('channel-runtime-snapshot.v4')({ ...channel, accounts: [{ ...account, ...fields }] }), false)
}
console.log(
  'Identity visuals: explicit versioning, platform fallback, raster brands and private-field rejection passed.',
)
