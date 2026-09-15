const hostIconPattern = /^host:[a-z][a-z0-9.-]{0,63}$/
const base64Pattern = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/
const base64Alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
const pngSignature = [137, 80, 78, 71, 13, 10, 26, 10]
const maxDecodedBytes = 262_144
const maxDimension = 256
const maxPixels = 65_536

function assertPlainObject(value, label) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object`)
  }
  const prototype = Object.getPrototypeOf(value)
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError(`${label} must use a plain or null prototype`)
  }
}

function assertExactDataProperties(value, required, label) {
  assertPlainObject(value, label)
  const expected = new Set(required)
  for (const key of required) {
    if (!Object.hasOwn(value, key)) throw new TypeError(`${label} is missing ${key}`)
  }
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== 'string' || !expected.has(key)) throw new TypeError(`${label} has an unknown field`)
    const descriptor = Object.getOwnPropertyDescriptor(value, key)
    if (descriptor === undefined || !descriptor.enumerable || !('value' in descriptor)) {
      throw new TypeError(`${label}.${key} must be an enumerable data property`)
    }
  }
}

function decodeBase64(value) {
  if (typeof value !== 'string' || value.length < 4 || value.length > 349_528 || !base64Pattern.test(value)) {
    throw new TypeError('Raster image data must be canonical base64')
  }
  const padding = value.endsWith('==') ? 2 : value.endsWith('=') ? 1 : 0
  const bytes = new Uint8Array(value.length / 4 * 3 - padding)
  let offset = 0
  for (let index = 0; index < value.length; index += 4) {
    const a = base64Alphabet.indexOf(value[index])
    const b = base64Alphabet.indexOf(value[index + 1])
    const c = value[index + 2] === '=' ? 0 : base64Alphabet.indexOf(value[index + 2])
    const d = value[index + 3] === '=' ? 0 : base64Alphabet.indexOf(value[index + 3])
    const bits = a << 18 | b << 12 | c << 6 | d
    if (offset < bytes.length) bytes[offset++] = bits >>> 16
    if (offset < bytes.length) bytes[offset++] = bits >>> 8 & 0xFF
    if (offset < bytes.length) bytes[offset++] = bits & 0xFF
  }
  if (encodeBase64(bytes) !== value) throw new TypeError('Raster image data must be canonical base64')
  if (bytes.byteLength > maxDecodedBytes) throw new RangeError(`Raster image exceeds ${maxDecodedBytes} bytes`)
  return bytes
}

function encodeBase64(bytes) {
  let result = ''
  for (let index = 0; index < bytes.length; index += 3) {
    const remaining = bytes.length - index
    const bits = bytes[index] << 16
      | (remaining > 1 ? bytes[index + 1] << 8 : 0)
      | (remaining > 2 ? bytes[index + 2] : 0)
    result += base64Alphabet[bits >>> 18 & 63]
    result += base64Alphabet[bits >>> 12 & 63]
    result += remaining > 1 ? base64Alphabet[bits >>> 6 & 63] : '='
    result += remaining > 2 ? base64Alphabet[bits & 63] : '='
  }
  return result
}

function readUint32(bytes, offset) {
  return bytes[offset] * 0x1000000
    + (bytes[offset + 1] << 16)
    + (bytes[offset + 2] << 8)
    + bytes[offset + 3]
}

function crc32(bytes, start, end) {
  let crc = 0xFFFFFFFF
  for (let index = start; index < end; index += 1) {
    crc ^= bytes[index]
    for (let bit = 0; bit < 8; bit += 1) crc = crc >>> 1 ^ (crc & 1 ? 0xEDB88320 : 0)
  }
  return (crc ^ 0xFFFFFFFF) >>> 0
}

function assertPng(bytes, width, height) {
  if (bytes.length < 57 || !pngSignature.every((byte, index) => bytes[index] === byte)) {
    throw new TypeError('Raster image data must contain a PNG signature and complete chunks')
  }
  let offset = pngSignature.length
  let chunkIndex = 0
  let sawIdat = false
  let sawIend = false
  while (offset < bytes.length) {
    if (offset + 12 > bytes.length) throw new TypeError('Raster image has a truncated PNG chunk')
    const length = readUint32(bytes, offset)
    const typeStart = offset + 4
    const dataStart = offset + 8
    const dataEnd = dataStart + length
    const chunkEnd = dataEnd + 4
    if (!Number.isSafeInteger(chunkEnd) || chunkEnd > bytes.length) {
      throw new TypeError('Raster image has an invalid PNG chunk boundary')
    }
    const typeBytes = bytes.subarray(typeStart, dataStart)
    if ([...typeBytes].some(byte => !((byte >= 65 && byte <= 90) || (byte >= 97 && byte <= 122)))) {
      throw new TypeError('Raster image has an invalid PNG chunk type')
    }
    if (typeBytes[2] >= 97 && typeBytes[2] <= 122) throw new TypeError('Raster image uses a reserved PNG chunk type')
    const type = String.fromCharCode(...typeBytes)
    if (readUint32(bytes, dataEnd) !== crc32(bytes, typeStart, dataEnd)) {
      throw new TypeError(`Raster image ${type} chunk has an invalid CRC`)
    }
    if (chunkIndex === 0) {
      if (type !== 'IHDR' || length !== 13) throw new TypeError('Raster image must begin with one 13-byte IHDR')
      const encodedWidth = readUint32(bytes, dataStart)
      const encodedHeight = readUint32(bytes, dataStart + 4)
      if (encodedWidth !== width || encodedHeight !== height) {
        throw new TypeError('Raster image dimensions do not match its IHDR')
      }
      const bitDepth = bytes[dataStart + 8]
      const colorType = bytes[dataStart + 9]
      const supportedDepths = new Map([
        [0, [1, 2, 4, 8, 16]],
        [2, [8, 16]],
        [3, [1, 2, 4, 8]],
        [4, [8, 16]],
        [6, [8, 16]],
      ])
      if (!supportedDepths.get(colorType)?.includes(bitDepth)) throw new TypeError('Raster image uses an invalid PNG color format')
      if (bytes[dataStart + 10] !== 0 || bytes[dataStart + 11] !== 0 || ![0, 1].includes(bytes[dataStart + 12])) {
        throw new TypeError('Raster image uses an unsupported PNG method')
      }
    } else if (type === 'IHDR') throw new TypeError('Raster image contains more than one IHDR')

    if (['acTL', 'fcTL', 'fdAT'].includes(type)) throw new TypeError('Raster image must not contain APNG chunks')
    if (type === 'IDAT') sawIdat = true
    else if (type === 'IEND') {
      if (length !== 0 || !sawIdat || chunkEnd !== bytes.length) {
        throw new TypeError('Raster image must end with one zero-byte IEND after IDAT')
      }
      sawIend = true
    } else if (typeBytes[0] >= 65 && typeBytes[0] <= 90 && !['IHDR', 'PLTE'].includes(type)) {
      throw new TypeError(`Raster image uses unsupported critical chunk ${type}`)
    }
    if (sawIend && chunkEnd !== bytes.length) throw new TypeError('Raster image contains bytes after IEND')
    offset = chunkEnd
    chunkIndex += 1
  }
  if (!sawIdat || !sawIend) throw new TypeError('Raster image must contain IDAT and terminal IEND chunks')
}

function cloneRasterImageSnapshotV1(value) {
  const fields = ['$schema', 'contract', 'schemaVersion', 'mediaType', 'encoding', 'data', 'width', 'height']
  assertExactDataProperties(value, fields, 'Raster image snapshot')
  if (
    value.$schema
      !== 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/raster-image-snapshot.v1.schema.json'
    || value.contract !== 'cordisx.raster-image-snapshot/v1'
    || value.schemaVersion !== 1
    || value.mediaType !== 'image/png'
    || value.encoding !== 'base64'
  ) throw new TypeError('Raster image snapshot has an unsupported contract identity')
  if (!Number.isInteger(value.width) || value.width < 1 || value.width > maxDimension) {
    throw new RangeError(`Raster image width must be an integer from 1 through ${maxDimension}`)
  }
  if (!Number.isInteger(value.height) || value.height < 1 || value.height > maxDimension) {
    throw new RangeError(`Raster image height must be an integer from 1 through ${maxDimension}`)
  }
  if (value.width * value.height > maxPixels) throw new RangeError(`Raster image exceeds ${maxPixels} pixels`)
  assertPng(decodeBase64(value.data), value.width, value.height)
  return Object.freeze(Object.fromEntries(fields.map(field => [field, value[field]])))
}

/** Validate, detach, and freeze one Host semantic or bounded raster brand icon. */
export function cloneBrandIconV1(value) {
  if (typeof value === 'string') {
    if (!hostIconPattern.test(value)) throw new TypeError('Brand icon string must be a host:* icon token')
    return value
  }
  assertExactDataProperties(value, ['kind', 'image'], 'Raster brand icon')
  if (value.kind !== 'raster-image') throw new TypeError('Brand icon kind is unsupported')
  return Object.freeze({ kind: 'raster-image', image: cloneRasterImageSnapshotV1(value.image) })
}
