import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const schemaDirectory = path.join(root, 'schemas')
const names = (await readdir(schemaDirectory)).filter(name => name.endsWith('.schema.json')).sort()
const schemas = new Map()
for (const name of names) schemas.set(name, JSON.parse(await readFile(path.join(schemaDirectory, name), 'utf8')))
const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true })
addFormats(ajv)
for (const schema of schemas.values()) ajv.addSchema(schema)

const document = schemas.get('raster-image-snapshot.v1.schema.json')
const validate = ajv.getSchema(document.$id)
if (validate === undefined) throw new Error('raster image schema was not registered')

const valid = {
  $schema: document.$id,
  contract: 'cordisx.raster-image-snapshot/v1',
  schemaVersion: 1,
  mediaType: 'image/png',
  encoding: 'base64',
  data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  width: 1,
  height: 1,
}

let failures = 0
function expect(label, value, expected) {
  const received = validate(value)
  if (received === expected) return
  console.error(`${label}: expected ${expected ? 'valid' : 'invalid'}`, validate.errors)
  failures += 1
}

function hasMatchingPngHeader(value) {
  const bytes = Buffer.from(value.data, 'base64')
  if (bytes.length < 24) return false
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  return bytes.subarray(0, signature.length).equals(signature)
    && bytes.toString('ascii', 12, 16) === 'IHDR'
    && bytes.readUInt32BE(16) === value.width
    && bytes.readUInt32BE(20) === value.height
}

expect('bounded PNG', valid, true)
for (
  const [label, mutate] of [
    ['network URL', value => {
      value.url = 'https://example.test/avatar.png'
    }],
    ['data URL', value => {
      value.data = `data:image/png;base64,${value.data}`
    }],
    ['SVG media type', value => {
      value.mediaType = 'image/svg+xml'
    }],
    ['unknown encoding', value => {
      value.encoding = 'base64url'
    }],
    ['zero width', value => {
      value.width = 0
    }],
    ['oversized height', value => {
      value.height = 257
    }],
    ['unknown field', value => {
      value.avatar = { kind: 'generated' }
    }],
  ]
) {
  const candidate = structuredClone(valid)
  mutate(candidate)
  expect(label, candidate, false)
}

if (!hasMatchingPngHeader(valid)) {
  console.error('bounded PNG: expected matching PNG signature and IHDR dimensions')
  failures += 1
}
const svgPayload = structuredClone(valid)
svgPayload.data = Buffer.from('<svg/>').toString('base64')
if (hasMatchingPngHeader(svgPayload)) {
  console.error('SVG payload: expected semantic PNG validation to reject payload')
  failures += 1
}

if (failures > 0) throw new Error(`${failures} raster image conformance case(s) failed`)
console.log('Raster image conformance: all cases passed')
