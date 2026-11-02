import assert from 'node:assert/strict'

// Narrow conformance model; real Host validation/secret-policy reuse belongs to Host tests.
// Unsupported schema forms reject rather than invent a complete Schemastery implementation.
const roles = new Set(['secret', 'credential', 'credential-ref', 'permission', 'capability'])
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value)
function safe(value) {
  if (value === null || ['string', 'boolean'].includes(typeof value)) return
  if (typeof value === 'number' && Number.isFinite(value)) return
  if (typeof value !== 'object') throw new Error('unsafe-json')
  if (!Array.isArray(value) && ![null, Object.prototype].includes(Object.getPrototypeOf(value))) {
    throw new Error('unsafe-json')
  }
  for (const descriptor of Object.values(Object.getOwnPropertyDescriptors(value))) {
    if (!('value' in descriptor)) throw new Error('unsafe-json')
    safe(descriptor.value)
  }
}
function inspect(node) {
  if (!isObject(node)) throw new Error('incomplete-projection')
  if (roles.has(node.meta?.role) && Object.hasOwn(node.meta ?? {}, 'default')) throw new Error('sensitive-default')
  if (node.type === 'object') {
    if (!isObject(node.dict)) throw new Error('incomplete-projection')
    for (const child of Object.values(node.dict)) inspect(child)
  } else if (node.type === 'array') {
    if (!node.inner) throw new Error('incomplete-projection')
    inspect(node.inner)
  } else if (!['string', 'number', 'boolean'].includes(node.type)) throw new Error('unsupported-projection')
  if (Object.hasOwn(node.meta ?? {}, 'default')) walk(node, node.meta.default, false)
}
function walk(node, value, redact) {
  if (roles.has(node.meta?.role)) {
    if (!redact) throw new Error('reserved-output')
    return undefined
  }
  if (node.type === 'object') {
    if (!isObject(value)) throw new Error('invalid-value')
    const output = {}
    for (const [key, child] of Object.entries(value)) {
      if (!Object.hasOwn(node.dict, key)) throw new Error('unknown-key')
      const next = walk(node.dict[key], child, redact)
      if (next !== undefined) output[key] = next
    }
    return output
  }
  if (node.type === 'array') {
    if (!Array.isArray(value)) throw new Error('invalid-value')
    return value.map(child => walk(node.inner, child, redact))
  }
  if (typeof value !== node.type) throw new Error('invalid-value')
  return value
}
function resolve(Config, raw) {
  if (raw === undefined) raw = {}
  safe(raw)
  if (!isObject(raw)) throw new Error('invalid-root')
  if (!Config && !Object.keys(raw).length) return undefined
  if (!Config || typeof Config.toJSON !== 'function' || Config['~standard']?.version !== 1) {
    throw new Error('schema-required')
  }
  const projection = Config.toJSON()
  safe(projection)
  inspect(projection)
  if (projection.type !== 'object' || Config.type !== 'object') throw new Error('invalid-root')
  const nonsecret = walk(projection, raw, true)
  const result = Config['~standard'].validate(structuredClone(nonsecret))
  if (result && typeof result.then === 'function') throw new Error('async-validator')
  if (!result || result.issues || !Object.hasOwn(result, 'value')) throw new Error('validation-failed')
  safe(result.value)
  return walk(projection, result.value, false)
}

const projection = {
  type: 'object',
  dict: {
    account: {
      type: 'object',
      dict: {
        root: { type: 'string' },
        tokens: { type: 'string', meta: { role: 'credential' } },
      },
    },
    accounts: { type: 'array', inner: { type: 'object', dict: { root: { type: 'string' } } } },
  },
}
let received
const Config = {
  type: 'object',
  toJSON: () => projection,
  '~standard': {
    version: 1,
    vendor: 'schemastery',
    validate: value => {
      received = value
      return { value }
    },
  },
}
assert.deepEqual(resolve(Config, { account: { root: './data', tokens: 'must-not-reach-validator' } }), {
  account: { root: './data' },
})
assert.equal(received.account.tokens, undefined)
assert.equal(resolve(undefined, undefined), undefined)
assert.equal(resolve(undefined, {}), undefined)
assert.throws(() => resolve(undefined, { account: {} }), /schema-required/)
assert.throws(() => resolve({ ...Config, toJSON: undefined }, { account: {} }), /schema-required/)
assert.throws(() => resolve({ ...Config, toJSON: () => ({}) }, {}), /unsupported-projection/)
assert.throws(() => resolve({ ...Config, toJSON: () => ({ type: 'object' }) }, {}), /incomplete-projection/)
assert.throws(() => resolve(Config, { account: { hidden: 'unknown' } }), /unknown-key/)
assert.throws(() => resolve(Config, { accounts: [{ root: './ok', hidden: 'unknown' }] }), /unknown-key/)
for (const role of roles) {
  const node = { type: 'object', dict: { hidden: { type: 'string', meta: { role } } } }
  assert.deepEqual(resolve({ ...Config, toJSON: () => node }, { hidden: 'excluded' }), {})
  node.dict.hidden.meta.default = 'secret-default'
  assert.throws(() => resolve({ ...Config, toJSON: () => node }, {}), /sensitive-default/)
}
for (const type of ['lazy', 'any', 'union']) {
  assert.throws(
    () => resolve({ ...Config, toJSON: () => ({ type: 'object', dict: { nested: { type } } }) }, {}),
    /unsupported-projection/,
  )
}
const withValidator = validate => ({ ...Config, '~standard': { ...Config['~standard'], validate } })
assert.throws(() => resolve(withValidator(async value => ({ value })), {}), /async-validator/)
assert.throws(() => resolve(withValidator(() => ({ then() {} })), {}), /async-validator/)
assert.throws(() => resolve(withValidator(() => ({ issues: [{ message: 'invalid' }] })), {}), /validation-failed/)
assert.throws(() => resolve(withValidator(() => ({ value: { extra: 'smuggled' } })), {}), /unknown-key/)
assert.throws(
  () => resolve(withValidator(() => ({ value: { account: { tokens: 'restored' } } })), {}),
  /reserved-output/,
)
assert.throws(() => resolve(withValidator(() => ({ value: { callback() {} } })), {}), /unsafe-json/)
console.log(
  'startup Node Config: complete projection, unknown fields, reserved roles/defaults, synchronous validation and output fencing passed',
)
