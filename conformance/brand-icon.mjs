import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'
import { cloneBrandIconV1 } from '../runtime/brand-icon.v1.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const schemaNames = [
  'ui-common.v1.schema.json',
  'raster-image-snapshot.v1.schema.json',
  'brand-icon.v1.schema.json',
  'page.v3.schema.json',
  'page.v4.schema.json',
]
const schemas = new Map()
for (const name of schemaNames) schemas.set(name, JSON.parse(await readFile(path.join(root, 'schemas', name), 'utf8')))

const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true })
addFormats(ajv)
for (const schema of schemas.values()) ajv.addSchema(schema)
const validator = name => {
  const validate = ajv.getSchema(schemas.get(name).$id)
  if (validate === undefined) throw new Error(`${name} was not registered`)
  return validate
}
const validateBrandIcon = validator('brand-icon.v1.schema.json')
const validatePageV3 = validator('page.v3.schema.json')
const validatePageV4 = validator('page.v4.schema.json')

const rasterImage = {
  $schema:
    'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/raster-image-snapshot.v1.schema.json',
  contract: 'cordisx.raster-image-snapshot/v1',
  schemaVersion: 1,
  mediaType: 'image/png',
  encoding: 'base64',
  data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  width: 1,
  height: 1,
}
const rasterIcon = { kind: 'raster-image', image: rasterImage }
const pageV4 = {
  $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/page.v4.schema.json',
  schemaVersion: 4,
  id: 'brand',
  title: { key: 'brand.title', fallback: 'Brand' },
  description: { key: 'brand.description', fallback: 'Manage the branded integration.' },
  icon: rasterIcon,
}

assert.equal(validateBrandIcon('host:settings'), true, 'existing host:* icons must remain valid')
assert.equal(validateBrandIcon(rasterIcon), true, JSON.stringify(validateBrandIcon.errors))
assert.equal(validatePageV4(pageV4), true, JSON.stringify(validatePageV4.errors))
assert.equal(validatePageV3(pageV4), false, 'page v3 must reject the page v4 successor identity')
assert.equal(
  validatePageV4({ ...pageV4, icon: 'host:settings' }),
  true,
  'page v4 must retain current host:* icon values',
)

const cloned = cloneBrandIconV1(rasterIcon)
assert.deepEqual(cloned, rasterIcon)
assert.notEqual(cloned, rasterIcon)
assert.notEqual(cloned.image, rasterIcon.image)
assert.equal(Object.isFrozen(cloned), true)
assert.equal(Object.isFrozen(cloned.image), true)

function expectRejected(label, value, { schema = true } = {}) {
  if (schema) assert.equal(validateBrandIcon(value), false, `${label} must fail schema validation`)
  assert.throws(() => cloneBrandIconV1(value), undefined, `${label} must fail runtime validation`)
}

expectRejected('network URL', 'https://example.test/icon.png')
expectRejected('data URL', `data:image/png;base64,${rasterImage.data}`)
expectRejected('blob URL', 'blob:https://example.test/00000000-0000-0000-0000-000000000000')
expectRejected('naked base64', rasterImage.data)
expectRejected('SVG media type', {
  ...rasterIcon,
  image: { ...rasterImage, mediaType: 'image/svg+xml' },
})
expectRejected('SVG bytes', {
  ...rasterIcon,
  image: { ...rasterImage, data: Buffer.from('<svg/>').toString('base64') },
}, { schema: false })
expectRejected('noncanonical base64', {
  ...rasterIcon,
  image: { ...rasterImage, data: 'AB==' },
}, { schema: false })
expectRejected('malformed PNG CRC', {
  ...rasterIcon,
  image: { ...rasterImage, data: `${rasterImage.data.slice(0, -5)}A${rasterImage.data.slice(-4)}` },
}, { schema: false })
expectRejected('declared dimension mismatch', {
  ...rasterIcon,
  image: { ...rasterImage, width: 2 },
}, { schema: false })
expectRejected('oversized decoded bytes', {
  ...rasterIcon,
  image: { ...rasterImage, data: Buffer.alloc(262_145).toString('base64') },
}, { schema: false })
expectRejected('unknown wrapper field', { ...rasterIcon, url: 'https://example.test/icon.png' })

function managerPageIconIsValid(page) {
  if (page?.schemaVersion === 3) {
    return validatePageV3(page) && typeof page.icon === 'string' && page.icon.startsWith('host:')
  }
  if (page?.schemaVersion !== 4 || !validatePageV4(page) || page.icon === undefined) return false
  try {
    cloneBrandIconV1(page.icon)
    return true
  } catch {
    return false
  }
}

assert.equal(managerPageIconIsValid(pageV4), true)
assert.equal(managerPageIconIsValid({ ...pageV4, icon: 'host:settings' }), true)
assert.equal(managerPageIconIsValid({ ...pageV4, icon: undefined }), false)
assert.equal(managerPageIconIsValid({ ...pageV4, icon: 'data:image/png;base64,AAAA' }), false)

console.log('Brand icon and Manager page metadata conformance: all cases passed')
