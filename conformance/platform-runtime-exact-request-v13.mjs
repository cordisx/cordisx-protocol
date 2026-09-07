import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'

const root = new URL('../', import.meta.url)
const schemaBase = 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/'
const ajv = new Ajv2020({ strict: true, allErrors: true, allowUnionTypes: true })
addFormats(ajv)
for (const file of await readdir(new URL('schemas/', root))) {
  if (file.endsWith('.schema.json')) {
    ajv.addSchema(JSON.parse(await readFile(new URL(`schemas/${file}`, root), 'utf8')))
  }
}

const manifestCases = JSON.parse(
  await readFile(new URL('test-vectors/platform/runtime-exact-request-v13.json', root), 'utf8'),
)

function hasUniqueCapabilityNames(manifest) {
  if (!Array.isArray(manifest.capabilities)) return false
  const names = manifest.capabilities.map(capability => capability?.name)
  return names.every(name => typeof name === 'string') && new Set(names).size === names.length
}

for (const test of manifestCases) {
  const validate = ajv.getSchema(`${schemaBase}${test.schema}.schema.json`)
  assert.ok(validate, test.name)
  const schemaValid = validate(test.value)
  const valid = schemaValid && (test.schema !== 'plugin-manifest.v13' || hasUniqueCapabilityNames(test.value))
  assert.equal(valid, test.valid, `${test.name}: ${JSON.stringify(validate.errors)}`)
}

const providerId = ajv.getSchema(`${schemaBase}plugin-manifest.v5.schema.json#/$defs/providerId`)
const sessionRef = ajv.getSchema(`${schemaBase}platform-session.v1.schema.json#/$defs/sessionRef`)
const permissionScope = ajv.getSchema(`${schemaBase}permission-common.v5.schema.json#/$defs/scope`)
assert.ok(providerId)
assert.ok(sessionRef)
assert.ok(permissionScope)
assert.equal(permissionScope({ runtime: 'exact-request' }), false, 'declaration marker is not a persisted scope')

const permissionCatalog = JSON.parse(
  await readFile(new URL('test-vectors/platform/permissions-v2/valid/catalog.json', root), 'utf8'),
)
const expectedPrompt = new Map([
  ['tasks.content.read', 'dynamic-scope'],
  ['tasks.create', 'dynamic-scope'],
  ['tasks.control', 'always'],
  ['turns.submit', 'dynamic-scope'],
  ['turns.control', 'always'],
])
for (const [capability, runtimePrompt] of expectedPrompt) {
  const entry = permissionCatalog.entries.find(candidate => candidate.capability === capability)
  assert.ok(entry, capability)
  assert.equal(entry.maximumScope.unscopedAllowed, false, `${capability} cannot become unbounded`)
  assert.equal(entry.runtimePrompt, runtimePrompt, `${capability} runtime prompt strategy`)
}

function partitionActivationReview(capabilities) {
  const authorizationDeclarations = []
  const runtimeExplanations = []
  for (const capability of capabilities) {
    if (capability?.scope?.runtime === 'exact-request') runtimeExplanations.push(capability.name)
    else authorizationDeclarations.push(capability.name)
  }
  const runtimeMarkerBlocksActivation = capabilities.some(
    capability => capability?.scope?.runtime === 'exact-request' && capability.required !== false,
  )
  return { authorizationDeclarations, runtimeExplanations, runtimeMarkerBlocksActivation }
}

const activationCases = JSON.parse(
  await readFile(new URL('test-vectors/platform/runtime-exact-request-activation-v13.json', root), 'utf8'),
)
for (const test of activationCases) {
  assert.deepEqual(partitionActivationReview(test.capabilities), {
    authorizationDeclarations: test.authorizationDeclarations,
    runtimeExplanations: test.runtimeExplanations,
    runtimeMarkerBlocksActivation: test.runtimeMarkerBlocksActivation,
  }, test.name)
}

function normalizeAbsoluteCwd(value, platform) {
  if (typeof value !== 'string' || /[\u0000-\u001f\u007f]/.test(value)) return undefined
  if (platform === 'posix') return path.posix.isAbsolute(value) ? path.posix.normalize(value) : undefined
  if (platform === 'win32') {
    const driveQualified = /^[A-Za-z]:[\\/]/.test(value)
    const unc = /^(?:\\\\|\/\/)([^\\/]+)[\\/]([^\\/]+)(?:[\\/]|$)/.exec(value)
    const invalidUncSegment = segment => segment === '.' || segment === '..' || segment === '?'
    const completeUnc = unc !== null && !invalidUncSegment(unc[1]) && !invalidUncSegment(unc[2])
    return (driveQualified || completeUnc) && path.win32.isAbsolute(value) ? path.win32.normalize(value) : undefined
  }
  return undefined
}

function materializeExactRequestScope(capability, request, platform) {
  if (capability === 'tasks.create') {
    const selectedProvider = request?.model?.providerId
    const cwd = normalizeAbsoluteCwd(request?.cwd, platform)
    if (!providerId(selectedProvider) || cwd === undefined) return undefined
    const scope = { providers: [selectedProvider], cwdRoots: [cwd] }
    return permissionScope(scope) ? scope : undefined
  }

  if (
    capability === 'tasks.content.read'
    || capability === 'tasks.control'
    || capability === 'turns.submit'
    || capability === 'turns.control'
  ) {
    if (!sessionRef(request?.session)) return undefined
    const scope = { sessions: [request.session] }
    return permissionScope(scope) ? scope : undefined
  }

  return undefined
}

function scopeFingerprintWitness(scope) {
  return createHash('sha256').update(JSON.stringify(scope)).digest('hex')
}

const materializationCases = JSON.parse(
  await readFile(new URL('test-vectors/platform/runtime-exact-request-materialization-v13.json', root), 'utf8'),
)
for (const test of materializationCases) {
  const actual = materializeExactRequestScope(test.capability, test.request, test.platform)
  assert.deepEqual(actual ?? null, test.scope, test.name)
  if (test.differentFingerprintFrom !== undefined) {
    const reference = materializationCases.find(candidate => candidate.name === test.differentFingerprintFrom)
    assert.ok(reference, test.differentFingerprintFrom)
    const referenceScope = materializeExactRequestScope(reference.capability, reference.request, reference.platform)
    assert.ok(actual)
    assert.ok(referenceScope)
    assert.notEqual(scopeFingerprintWitness(actual), scopeFingerprintWitness(referenceScope), test.name)
  }
}

console.log(
  `Platform runtime exact-request v13: ${manifestCases.length} document, ${activationCases.length} activation, and ${materializationCases.length} materialization vectors passed`,
)
