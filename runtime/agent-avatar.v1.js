export const AGENT_AVATAR_UNKNOWN_SEED = 'cordisx.agent-avatar.seed/v1:unknown:0:'

const seedPrefix = 'cordisx.agent-avatar.seed/v1:agent-definition:'
const opaqueRefPattern = /^(?!(?:https?|data|blob|file|base64):)[a-z][a-z0-9-]{0,31}:[A-Za-z0-9][A-Za-z0-9._~-]{0,478}$/
const providerPattern = /^[A-Za-z0-9][A-Za-z0-9._~-]{0,127}$/
const maxIdentityBytes = 512

function ownKeys(value) {
  return Object.keys(value).sort()
}

function assertExactKeys(value, required, optional = []) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new TypeError('Agent avatar value must be an object')
  const allowed = new Set([...required, ...optional])
  for (const key of required) if (!Object.hasOwn(value, key)) throw new TypeError(`Agent avatar value is missing ${key}`)
  for (const key of ownKeys(value)) if (!allowed.has(key)) throw new TypeError(`Agent avatar value has unknown field ${key}`)
}

function assertOpaqueRef(value, field) {
  if (typeof value !== 'string' || !opaqueRefPattern.test(value)) throw new TypeError(`${field} must be a qualified opaque ref`)
  return value
}

function assertOptionalOpaqueRef(value, field) {
  return value === undefined ? undefined : assertOpaqueRef(value, field)
}

function assertCanonicalSeed(seed) {
  if (seed === AGENT_AVATAR_UNKNOWN_SEED) return seed
  if (typeof seed !== 'string' || !seed.startsWith(seedPrefix) || seed.length > 1024) throw new TypeError('seed is not a canonical Agent avatar seed')
  const suffix = seed.slice(seedPrefix.length)
  const separator = suffix.indexOf(':')
  if (separator <= 0) throw new TypeError('seed omits its UTF-8 byte length')
  const declared = suffix.slice(0, separator)
  const identity = suffix.slice(separator + 1)
  if (!/^(?:0|[1-9][0-9]{0,3})$/.test(declared)) throw new TypeError('seed has an invalid UTF-8 byte length')
  if (hasUnpairedSurrogate(identity)) throw new TypeError('seed identity must contain only Unicode scalar values')
  if (identity.length === 0 || identity !== identity.trim().normalize('NFC')) throw new TypeError('seed identity is not trimmed NFC')
  const actual = new TextEncoder().encode(identity).byteLength
  if (actual === 0 || actual > maxIdentityBytes || Number(declared) !== actual) throw new TypeError('seed UTF-8 byte length does not match its identity')
  return seed
}

function hasUnpairedSurrogate(value) {
  for (let index = 0; index < value.length; index += 1) {
    const unit = value.charCodeAt(index)
    if (unit >= 0xD800 && unit <= 0xDBFF) {
      const next = value.charCodeAt(index + 1)
      if (!(next >= 0xDC00 && next <= 0xDFFF)) return true
      index += 1
    } else if (unit >= 0xDC00 && unit <= 0xDFFF) return true
  }
  return false
}

export function canonicalizeAgentAvatarSeed(input) {
  assertExactKeys(input, ['namespace'], input?.namespace === 'agent-definition' ? ['agentId'] : [])
  if (input.namespace === 'unknown') return AGENT_AVATAR_UNKNOWN_SEED
  if (input.namespace !== 'agent-definition' || typeof input.agentId !== 'string') throw new TypeError('Agent avatar seed input is invalid')
  if (hasUnpairedSurrogate(input.agentId)) throw new TypeError('Agent avatar identity must contain only Unicode scalar values')
  const identity = input.agentId.trim().normalize('NFC')
  if (identity.length === 0) return AGENT_AVATAR_UNKNOWN_SEED
  const length = new TextEncoder().encode(identity).byteLength
  if (length > maxIdentityBytes) throw new RangeError(`Agent avatar identity exceeds ${maxIdentityBytes} UTF-8 bytes`)
  return `${seedPrefix}${length}:${identity}`
}

export function cloneAgentAvatarRef(ref) {
  if (ref === null || typeof ref !== 'object' || Array.isArray(ref)) throw new TypeError('Agent avatar ref must be an object')
  if (ref.kind === 'generated') {
    assertExactKeys(ref, ['kind', 'algorithm', 'algorithmVersion', 'seed'])
    if (ref.algorithm !== 'oneworks-avatar-seed' || ref.algorithmVersion !== 1) throw new TypeError('Generated Agent avatar algorithm is unsupported')
    return Object.freeze({ kind: 'generated', algorithm: 'oneworks-avatar-seed', algorithmVersion: 1, seed: assertCanonicalSeed(ref.seed) })
  }
  if (ref.kind === 'asset') {
    assertExactKeys(ref, ['kind', 'ref'], ['revision'])
    const revision = assertOptionalOpaqueRef(ref.revision, 'revision')
    return Object.freeze({ kind: 'asset', ref: assertOpaqueRef(ref.ref, 'ref'), ...(revision === undefined ? {} : { revision }) })
  }
  if (ref.kind === 'definition') {
    assertExactKeys(ref, ['kind', 'ref', 'schema', 'definitionVersion'], ['revision'])
    if (ref.schema !== 'oneworks.avatar' || ref.definitionVersion !== 1) throw new TypeError('Agent avatar definition schema or version is unsupported')
    const revision = assertOptionalOpaqueRef(ref.revision, 'revision')
    return Object.freeze({ kind: 'definition', ref: assertOpaqueRef(ref.ref, 'ref'), schema: 'oneworks.avatar', definitionVersion: 1, ...(revision === undefined ? {} : { revision }) })
  }
  if (ref.kind === 'platform') {
    assertExactKeys(ref, ['kind', 'provider', 'identityRef'], ['revision'])
    if (typeof ref.provider !== 'string' || !providerPattern.test(ref.provider)) throw new TypeError('provider must be an opaque provider identity')
    const revision = assertOptionalOpaqueRef(ref.revision, 'revision')
    return Object.freeze({ kind: 'platform', provider: ref.provider, identityRef: assertOpaqueRef(ref.identityRef, 'identityRef'), ...(revision === undefined ? {} : { revision }) })
  }
  throw new TypeError('Agent avatar ref kind is unsupported')
}

export function createGeneratedAgentAvatarRef(input) {
  return Object.freeze({
    kind: 'generated',
    algorithm: 'oneworks-avatar-seed',
    algorithmVersion: 1,
    seed: canonicalizeAgentAvatarSeed(input),
  })
}

export function resolveAgentDefinitionAvatar(input) {
  assertExactKeys(input, ['agentId', 'inherit'], ['avatar', 'parentAvatars'])
  if (typeof input.agentId !== 'string' || !['inherit', 'none'].includes(input.inherit)) throw new TypeError('Agent avatar definition resolution input is invalid')
  if (input.avatar !== undefined) return cloneAgentAvatarRef(input.avatar)
  if (input.parentAvatars !== undefined && !Array.isArray(input.parentAvatars)) throw new TypeError('parentAvatars must be an array')
  if (input.inherit === 'inherit') {
    let inherited
    for (const parentAvatar of input.parentAvatars ?? []) {
      const candidate = cloneAgentAvatarRef(parentAvatar)
      if (candidate.kind !== 'generated') inherited = candidate
    }
    if (inherited !== undefined) return inherited
  }
  return createGeneratedAgentAvatarRef({ namespace: 'agent-definition', agentId: input.agentId })
}
