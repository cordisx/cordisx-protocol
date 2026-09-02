import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { isDeepStrictEqual } from 'node:util'
import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'
import {
  AGENT_AVATAR_UNKNOWN_SEED,
  canonicalizeAgentAvatarSeed,
  cloneAgentAvatarRef,
  createGeneratedAgentAvatarRef,
  resolveAgentDefinitionAvatar,
} from '../runtime/agent-avatar.v1.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const schemaNames = [
  'session-common.v1.schema.json',
  'agents-common.v1.schema.json',
  'platform-model.v1.schema.json',
  'agent-avatar.v1.schema.json',
  'agent-avatar-resolution-result.v1.schema.json',
  'agent-definition.v1.schema.json',
]
const schemas = new Map()
for (const name of schemaNames) schemas.set(name, JSON.parse(await readFile(path.join(root, 'schemas', name), 'utf8')))
const packageManifest = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'))

const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true })
addFormats(ajv)
for (const schema of schemas.values()) ajv.addSchema(schema)

function schemaValidator(name) {
  const validator = ajv.getSchema(schemas.get(name).$id)
  if (validator === undefined) throw new Error(`${name} was not registered`)
  return validator
}

const validateAvatar = schemaValidator('agent-avatar.v1.schema.json')
const validateResolutionResult = schemaValidator('agent-avatar-resolution-result.v1.schema.json')
const validateDefinition = schemaValidator('agent-definition.v1.schema.json')
const errorsOf = validator => (validator.errors ?? []).map(error => `${error.instancePath || '/'} ${error.message}`)

function normalizeOneWorksRc8Seed(seed) {
  const trimmed = seed.trim()
  return trimmed === '' ? 'v1-0' : /^v\d+-/.test(trimmed) ? trimmed : `v1-${trimmed}`
}

function hashOneWorksRc8Seed(seed) {
  let hash = 0x811C9DC5
  for (const character of seed) {
    hash ^= character.codePointAt(0) ?? 0
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}
function generatedAvatar(agentId) {
  return createGeneratedAgentAvatarRef(agentId === null || agentId === undefined
    ? { namespace: 'unknown' }
    : { namespace: 'agent-definition', agentId })
}

function frozenErrors(value, label, errors) {
  if (value !== null && typeof value === 'object') {
    if (!Object.isFrozen(value)) errors.push(`${label} is not frozen`)
    for (const [key, child] of Object.entries(value)) frozenErrors(child, `${label}.${key}`, errors)
  }
}

function resolveReference(avatar, supportedKinds) {
  const cloned = cloneAgentAvatarRef(avatar)
  const base = {
    $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/agent-avatar-resolution-result.v1.schema.json',
    contract: 'cordisx.agent-avatar-resolution-result/v1',
    schemaVersion: 1,
  }
  return supportedKinds.includes(avatar.kind)
    ? Object.freeze({ ...base, status: 'resolved', avatar: cloned })
    : Object.freeze({ ...base, status: 'unsupported', avatar: cloned, code: avatar.kind === 'platform' ? 'unsupported-provider' : 'unsupported-kind' })
}

function resolveDefinitionAvatars(definitions) {
  const identityKey = identity => `${identity.agentId}\u0000${identity.revision}`
  const byId = new Map(definitions.map(definition => [identityKey(definition.identity), definition]))
  const cache = new Map()
  const resolving = new Set()
  function resolve(identity) {
    const key = identityKey(identity)
    if (cache.has(key)) return cache.get(key)
    if (resolving.has(key)) throw new Error(`avatar inheritance cycle at ${key}`)
    const definition = byId.get(key)
    if (definition === undefined) throw new Error(`missing avatar ancestor ${key}`)
    resolving.add(key)
    const parentAvatars = []
    for (const parent of definition.extends ?? []) {
      parentAvatars.push(resolve(parent))
    }
    const effective = resolveAgentDefinitionAvatar({
      agentId: definition.identity.agentId,
      inherit: definition.inherit.avatar ?? 'none',
      ...(definition.avatar === undefined ? {} : { avatar: definition.avatar }),
      ...(parentAvatars.length === 0 ? {} : { parentAvatars }),
    })
    resolving.delete(key)
    cache.set(key, effective)
    return effective
  }
  for (const definition of definitions) resolve(definition.identity)
  return cache
}

function validateRefCase(vector) {
  if (!validateAvatar(vector.value)) return errorsOf(validateAvatar)
  const errors = []
  try {
    const cloned = cloneAgentAvatarRef(vector.value)
    if (cloned === vector.value) errors.push('avatar ref was not cloned')
    if (!isDeepStrictEqual(cloned, vector.value)) errors.push('avatar clone changed the accepted ref')
    frozenErrors(cloned, 'avatar', errors)
  } catch (error) {
    errors.push(error.message)
  }
  return errors
}

function validateCanonicalCase(vector) {
  const errors = []
  let actualSeed
  try {
    actualSeed = canonicalizeAgentAvatarSeed(vector.agentId === null || vector.agentId === undefined
      ? { namespace: 'unknown' }
      : { namespace: 'agent-definition', agentId: vector.agentId })
  } catch (error) {
    errors.push(error.message)
  }
  if (actualSeed !== vector.expectedSeed) errors.push(`canonical seed mismatch: ${String(actualSeed)}`)
  if (actualSeed !== undefined && !validateAvatar(generatedAvatar(vector.agentId))) errors.push(...errorsOf(validateAvatar))
  return errors
}

function validateStabilityCase(vector) {
  const errors = []
  const seeds = new Set()
  for (let index = 0; index < (vector.observations?.length ?? 0); index += 1) {
    const observation = vector.observations[index]
    const ref = generatedAvatar(observation.agentId)
    seeds.add(ref.seed)
    if (!validateAvatar(ref)) errors.push(...errorsOf(validateAvatar).map(error => `observation[${index}] ${error}`))
    if (!isDeepStrictEqual(ref, vector.expected)) errors.push(`observation[${index}] generated ref drift`)
  }
  if (seeds.size !== 1) errors.push('business context changed the canonical identity seed')
  return errors
}

function validateDefinitionCase(vector) {
  const errors = []
  for (let index = 0; index < (vector.definitions?.length ?? 0); index += 1) {
    if (!validateDefinition(vector.definitions[index])) errors.push(...errorsOf(validateDefinition).map(error => `definition[${index}] ${error}`))
  }
  if (errors.length > 0) return errors
  let resolved
  try {
    resolved = resolveDefinitionAvatars(vector.definitions)
  } catch (error) {
    return [error.message]
  }
  for (const assertion of vector.assertions ?? []) {
    const key = `${assertion.agentId}\u0000${assertion.revision}`
    const actual = resolved.get(key)
    if (!isDeepStrictEqual(actual, assertion.expected)) errors.push(`${assertion.agentId}@${assertion.revision} avatar resolution drift`)
  }
  return errors
}

function validateResolverCase(vector) {
  const errors = []
  for (let index = 0; index < (vector.references?.length ?? 0); index += 1) {
    const entry = vector.references[index]
    if (!validateAvatar(entry.value)) {
      errors.push(...errorsOf(validateAvatar).map(error => `reference[${index}] ${error}`))
      continue
    }
    const source = structuredClone(entry.value)
    const result = resolveReference(source, vector.supportedKinds)
    if (!validateResolutionResult(result)) errors.push(...errorsOf(validateResolutionResult).map(error => `reference[${index}] result ${error}`))
    if (!isDeepStrictEqual(result, entry.expected)) errors.push(`reference[${index}] resolution drift`)
    if (result.avatar === source) errors.push(`reference[${index}] avatar was not cloned`)
    frozenErrors(result, `reference[${index}].result`, errors)
    const before = structuredClone(result)
    source.kind = 'mutated'
    if (!isDeepStrictEqual(result, before)) errors.push(`reference[${index}] result aliases mutable input`)
  }
  return errors
}

function validateOneWorksRc8Case(vector) {
  const errors = []
  if (vector.core?.spec !== '@oneworks/avatar@1.0.0-rc.8') errors.push('core package is not exact @oneworks/avatar rc.8')
  if (vector.core?.integrity !== 'sha512-9vKWfiPUlEfVzcO+6Q2QsCmqlINZb2CpXjN4M/JO2+v0IwqsGIcWGaxW44lf3moSQj70lEmnF6F7bZofw7mcXQ==') errors.push('core package integrity drifted from @oneworks/avatar rc.8')
  if (vector.core?.shasum !== 'd392232f850014c323f19a3a952c45d2d432b381') errors.push('core package shasum drifted from @oneworks/avatar rc.8')
  if (vector.react?.spec !== '@oneworks/avatar-react@1.0.0-rc.8') errors.push('React package is not exact @oneworks/avatar-react rc.8')
  if (vector.react?.integrity !== 'sha512-fJ+p2LLG5tb3YV5QAAm/3gnkEFuCfMSR/WttpvMv8xNp64Ou6TB4Tz5QE6LqOwgT7q67qrBluZMwDfQUjX++aw==') errors.push('React package integrity drifted from @oneworks/avatar-react rc.8')
  if (vector.react?.shasum !== '6a62a452fe4a3f1ffa40c057f09b186d29ba84ca') errors.push('React package shasum drifted from @oneworks/avatar-react rc.8')
  for (const packageName of ['@oneworks/avatar', '@oneworks/avatar-react']) {
    if (packageManifest.dependencies?.[packageName] !== undefined) errors.push(`${packageName} must not be a Protocol production dependency`)
    if (packageManifest.peerDependencies?.[packageName] !== undefined) errors.push(`${packageName} must not be a Protocol peer dependency`)
    if (packageManifest.optionalDependencies?.[packageName] !== undefined) errors.push(`${packageName} must not be a Protocol optional dependency`)
  }
  for (let index = 0; index < (vector.golden?.length ?? 0); index += 1) {
    const entry = vector.golden[index]
    try {
      cloneAgentAvatarRef({ kind: 'generated', algorithm: 'oneworks-avatar-seed', algorithmVersion: 1, seed: entry.canonicalSeed })
    } catch (error) {
      errors.push(`golden[${index}] ${error.message}`)
      continue
    }
    const normalized = normalizeOneWorksRc8Seed(entry.canonicalSeed)
    if (normalized !== entry.normalizedSeed) errors.push(`golden[${index}] rc.8 normalization drift`)
    if (hashOneWorksRc8Seed(entry.canonicalSeed) !== entry.rawHash) errors.push(`golden[${index}] rc.8 raw hash drift`)
    if (hashOneWorksRc8Seed(normalized) !== entry.normalizedHash) errors.push(`golden[${index}] rc.8 normalized hash drift`)
  }
  return errors
}

const caseValidators = {
  ref: validateRefCase,
  'canonical-seed': validateCanonicalCase,
  stability: validateStabilityCase,
  'definition-avatar': validateDefinitionCase,
  resolution: validateResolverCase,
  'oneworks-rc8': validateOneWorksRc8Case,
}

async function jsonFiles(directory) {
  return (await readdir(directory, { withFileTypes: true }))
    .filter(entry => entry.isFile() && entry.name.endsWith('.json'))
    .map(entry => path.join(directory, entry.name))
    .sort()
}

let failures = 0
for (const outcome of ['valid', 'invalid']) {
  for (const file of await jsonFiles(path.join(root, 'test-vectors', 'agent-avatar', outcome))) {
    const vector = JSON.parse(await readFile(file, 'utf8'))
    const validate = caseValidators[vector.case]
    const errors = validate === undefined ? [`unknown vector case: ${String(vector.case)}`] : validate(vector)
    if ((errors.length === 0) !== (outcome === 'valid')) {
      console.error(`${path.relative(root, file)} should be ${outcome}`, errors)
      failures += 1
    }
  }
}

if (failures > 0) throw new Error(`${failures} Agent Avatar conformance case(s) failed`)
console.log('Agent Avatar conformance: all vectors passed')
