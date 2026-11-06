import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
import Ajv from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'
import {
  canonicalOrigin,
  createHandle,
  proof,
  proofContract,
  readEntry,
  validateSource,
} from './managed-service-web-entry-model.mjs'

const root = new URL('../', import.meta.url)
const schemaRoot = 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/'
const ajv = new Ajv({ strict: true, allErrors: true, allowUnionTypes: true })
addFormats(ajv)
for (const name of readdirSync(new URL('schemas/', root)).filter(n => n.endsWith('.json'))) {
  ajv.addSchema(JSON.parse(readFileSync(new URL(`schemas/${name}`, root))))
}
const validator = name => ajv.getSchema(`${schemaRoot}managed-service-web-entry-${name}.v1.schema.json`)
const sourceDeclaration = {
  contract: 'cordisx.managed-service-web-entry-source/v1',
  serviceId: 'gateway',
  operationId: 'console.info',
  verification: { kind: 'shared-instance-hmac-sha256', path: '/api/cordisx-web-entry-proof' },
}
const definition = {
  serviceId: 'gateway',
  httpAuthentication: { mode: 'authorization-header' },
  operations: [{
    operationId: 'console.info',
    method: 'GET',
    path: '/cordisx/console',
    requestEncoding: 'query',
    responseSchema: `${schemaRoot}managed-service-web-entry-source-result.v1.schema.json`,
  }],
}
validateSource(sourceDeclaration, definition, validator('source'))
validateSource(sourceDeclaration, {
  ...definition,
  operations: [{
    ...definition.operations[0],
    requestSchema: `${schemaRoot}managed-service-web-entry-challenge.v1.schema.json`,
  }],
}, validator('source'))
for (
  const mutation of [
    { method: 'POST' },
    { requestEncoding: 'json-body' },
    { requestSchema: `${schemaRoot}other.json` },
    { responseSchema: `${schemaRoot}other.json` },
    { httpAuthentication: { mode: 'none' } },
  ]
) {
  assert.throws(() =>
    validateSource(
      sourceDeclaration,
      { ...definition, operations: [{ ...definition.operations[0], ...mutation }] },
      validator('source'),
    ), /invalid-source/)
}
assert.throws(
  () => validateSource({ ...sourceDeclaration, serviceId: 'foreign' }, definition, validator('source')),
  /invalid-source/,
)
const admitted = new Set()
validateSource(sourceDeclaration, definition, validator('source'), admitted)
assert.throws(() => validateSource(sourceDeclaration, definition, validator('source'), admitted), /invalid-source/)
assert.throws(
  () => validateSource({ ...sourceDeclaration, operationId: 'missing' }, definition, validator('source')),
  /invalid-source/,
)
assert.throws(
  () => validateSource(sourceDeclaration, { ...definition, httpAuthentication: { mode: 'none' } }, validator('source')),
  /invalid-source/,
)
assert.equal(validator('source')({ ...sourceDeclaration, origin: 'http://127.0.0.1' }), false)
assert.equal(validator('challenge')({ challenge: 'a'.repeat(64) }), true)
for (
  const query of [{}, { challenge: 'a'.repeat(63) }, { challenge: 'A'.repeat(64) }, { challenge: 'z'.repeat(64) }, {
    challenge: 'a'.repeat(64),
    origin: 'http://127.0.0.1',
  }]
) assert.equal(validator('challenge')(query), false)
for (const path of ['//foreign', '/proof?url=x', '/a/../b', '/proof#x', '/%2e/proof', 'http://127.0.0.1']) {
  assert.equal(
    validator('source')({ ...sourceDeclaration, verification: { ...sourceDeclaration.verification, path } }),
    false,
  )
}
for (const origin of ['http://127.0.0.1:3010', 'https://[::1]:9443', 'http://127.0.0.1', 'https://[::1]']) {
  assert.ok(canonicalOrigin(origin))
}
for (
  const origin of [
    'http://127.0.0.1:0',
    'http://127.0.0.1:65536',
    'http://127.0.0.1:80',
    'http://127.0.0.1/',
    'http://127.0.0.1:3010/path',
    'http://127.0.0.1:3010?x=1',
    'http://127.0.0.1:3010#x',
    'http://user:secret@127.0.0.1:3010',
    'http://localhost:3010',
    'http://127.1:3010',
    'http://2130706433:3010',
    'http://0x7f000001:3010',
    'http://127.0.0.2:3010',
    'http://example.test',
    'file:///tmp/x',
    'http://127.0.0.1:03010',
    'http://127.0.0.1\\@evil.test',
    'http://%31%32%37.0.0.1',
  ]
) assert.equal(canonicalOrigin(origin), false, origin)

const challenge = 'a'.repeat(64)
const secret = Buffer.alloc(32, 0x71)
function fixture(index = 1) {
  const instanceSecret = Buffer.alloc(32, 0x70 + index)
  const record = {
    binding: {
      bindingId: `binding-${index}`,
      identity: { pluginId: `plugin-${index}`, serviceId: 'gateway' },
      scope: { profileId: 'profile', generation: 'host-1' },
    },
    serviceGeneration: `service-${index}`,
    pluginGeneration: 'plugin-1',
    hostGeneration: 'host-1',
    registration: {},
    source: structuredClone(sourceDeclaration),
    running: true,
    endpointOwned: true,
    status: 'ready',
    origin: `http://127.0.0.1:${3000 + index}`,
  }
  const origin = `http://127.0.0.1:${4000 + index}`
  const instance = `instance-${index}`
  const handle = createHandle(record)
  const calls = []
  const state = { current: record, owner: `owner-${index}`, now: () => 0, deadline: 1000, disposed: false }
  const source = {
    contract: 'cordisx.managed-service-web-entry-source-result/v1',
    status: 'available',
    origin,
    verification: { instance, proof: proof(instanceSecret, challenge, origin, instance) },
  }
  const secondary = { contract: proofContract, ...source.verification }
  const options = {
    state,
    caller: state.owner,
    challenge,
    request: {
      contract: 'cordisx.managed-service-web-entry-read/v1',
      binding: handle.binding,
      serviceGeneration: handle.serviceGeneration,
    },
    validateRequest: validator('read'),
    validateResult: validator('source-result'),
    validateProof: validator('proof'),
    transport: {
      source: async request => {
        calls.push({ kind: 'source', request })
        return { value: source, bytes: 256 }
      },
      secondary: async request => {
        calls.push({ kind: 'secondary', request })
        return { value: secondary, bytes: 192 }
      },
    },
  }
  return { record, handle, calls, state, source, secondary, options }
}
const read = f => readEntry(f.handle, f.options)
const a = fixture(1), b = fixture(2)
const [resultA, resultB] = await Promise.all([read(a), read(b)])
assert.equal(resultA.origin, 'http://127.0.0.1:4001')
assert.equal(resultB.origin, 'http://127.0.0.1:4002')
assert.notDeepEqual(resultA.binding, resultB.binding)
assert.notEqual(resultA.binding.bindingId, a.record.binding.bindingId)
assert.deepEqual(resultA.binding.identity, a.record.binding.identity)
assert.deepEqual(resultA.binding.scope, a.record.binding.scope)
assert.equal(validator('result')(resultA), true)
for (const field of ['instance', 'proof', 'pid', 'path', 'token', 'registration', 'challenge']) {
  assert.equal(Object.hasOwn(resultA, field), false)
  assert.equal(validator('result')({ ...resultA, [field]: 'forbidden' }), false)
}
assert.deepEqual(a.calls[1].request.query, { challenge })
assert.equal(a.calls[1].request.authorization, undefined)
assert.equal(a.calls[0].request.authorization, 'current-broker')
assert.ok(a.calls.every(c => c.request.redirect === 'error' && c.request.credentials === 'omit'))
assert.equal(Object.values(a.calls[1].request).includes(a.source.verification.proof), false)
const sameOrigin = fixture()
sameOrigin.source.origin = sameOrigin.record.origin
delete sameOrigin.source.verification
assert.equal((await read(sameOrigin)).status, 'available')
assert.equal(sameOrigin.calls.length, 1)
const absent = fixture()
absent.record.source = undefined
absent.handle = createHandle(absent.record)
assert.equal((await read(absent)).code, 'unsupported')
assert.equal(absent.calls.length, 0)
for (const status of ['failed', 'stopping', 'stopped', 'disposed']) {
  const f = fixture()
  f.record.status = status
  assert.equal((await read(f)).code, 'service-unavailable')
  assert.equal(f.calls.length, 0)
}
for (
  const change of [
    f => f.options.caller = 'foreign',
    f => f.record.endpointOwned = false,
    f => f.record.serviceGeneration = 'new',
    f => f.state.disposed = true,
    f => f.options.request = { ...f.options.request, serviceGeneration: 'forged' },
  ]
) {
  const f = fixture()
  change(f)
  assert.equal((await read(f)).status, 'unavailable')
  assert.equal(f.calls.length, 0)
}
for (
  const change of [
    f => delete f.source.verification,
    f => f.secondary.proof = proof(Buffer.alloc(32, 1), challenge, f.source.origin, f.secondary.instance),
    f => f.secondary.instance = 'other',
    f => f.secondary.proof = proof(secret, 'b'.repeat(64), f.source.origin, f.secondary.instance),
    f => f.secondary.proof = proof(secret, challenge, 'http://127.0.0.1:4444', f.secondary.instance),
  ]
) {
  const f = fixture()
  change(f)
  assert.equal((await read(f)).code, 'ownership-unverified')
}
const noProofDeclaration = fixture()
delete noProofDeclaration.record.source.verification
assert.equal((await read(noProofDeclaration)).code, 'ownership-unverified')
for (const source of [{ ...fixture().source, origin: 'http://example.test' }, { ...fixture().source, token: 'bad' }]) {
  const f = fixture()
  f.options.transport.source = async () => ({ value: source, bytes: 200 })
  assert.equal((await read(f)).code, 'invalid-source')
  assert.equal(f.calls.filter(call => call.kind === 'secondary').length, 0)
}
for (const stage of ['source', 'secondary']) {
  for (const extra of [{ bytes: 65537 }, { redirected: true }]) {
    const f = fixture()
    const original = f.options.transport[stage]
    f.options.transport[stage] = async request => ({ ...await original(request), ...extra })
    assert.equal((await read(f)).code, 'invalid-source')
  }
  for (
    const mutation of [
      f => f.record.serviceGeneration = 'new',
      f => f.record.hostGeneration = 'new',
      f => f.record.pluginGeneration = 'new',
      f => f.record.binding.scope.profileId = 'new-profile',
      f => f.record.binding.scope.generation = 'new-host',
      f => f.state.owner = 'new-owner',
      f => f.record.endpointOwned = false,
      f => f.record.registration = {},
      f => f.record.source = { ...f.record.source },
      f => f.record.origin = 'http://127.0.0.1:9999',
      f => f.record.status = 'stopped',
      f => f.state.disposed = true,
      f => f.state.current = { ...f.record },
    ]
  ) {
    const f = fixture()
    const original = f.options.transport[stage]
    f.options.transport[stage] = async request => {
      const result = await original(request)
      mutation(f)
      return result
    }
    const result = await read(f)
    assert.equal(result.status, 'unavailable')
    assert.equal(result.origin, undefined)
  }
}
const timeout = fixture()
timeout.options.transport.source = async () => {
  timeout.state.now = () => 1001
  return { value: timeout.source, bytes: 100 }
}
assert.equal((await read(timeout)).code, 'timeout')
const cancelled = fixture()
const controller = new AbortController()
cancelled.options.signal = controller.signal
cancelled.options.transport.secondary = async () => {
  controller.abort()
  return { value: cancelled.secondary, bytes: 100 }
}
assert.equal((await read(cancelled)).code, 'cancelled')
assert.equal((await read(fixture(2))).status, 'available', 'cancel one read does not cancel another')
const unavailableSource = fixture()
unavailableSource.source = { contract: 'cordisx.managed-service-web-entry-source-result/v1', status: 'unavailable' }
unavailableSource.options.transport.source = async () => ({ value: unavailableSource.source, bytes: 100 })
assert.equal((await read(unavailableSource)).code, 'service-unavailable')
const stale = fixture()
assert.equal((await read(stale)).status, 'available')
stale.record.serviceGeneration = 'replacement'
const staleResult = await read(stale)
assert.equal(staleResult.code, 'stale-generation')
assert.equal(staleResult.serviceGeneration, 'service-1')
assert.equal(staleResult.origin, undefined)
assert.equal(validator('result')(staleResult), true)
assert.equal(validator('result')({ ...staleResult, origin: 'http://127.0.0.1:4001' }), false)
const restart = fixture()
const parentBinding = structuredClone(restart.record.binding)
const oldHandle = restart.handle
restart.record.serviceGeneration = 'replacement'
// A correct current generation value cannot repair an old issued binding.
const forgedHandle = { ...oldHandle, serviceGeneration: 'replacement' }
const forgedOptions = { ...restart.options, request: { ...restart.options.request, serviceGeneration: 'replacement' } }
assert.equal((await readEntry(forgedHandle, forgedOptions)).status, 'unavailable')
assert.equal(restart.calls.length, 0)
const freshHandle = createHandle(restart.record)
assert.notEqual(freshHandle.binding.bindingId, oldHandle.binding.bindingId)
assert.deepEqual(restart.record.binding, parentBinding, 'parent binding stays unchanged on restart')
assert.deepEqual(freshHandle.binding.identity, parentBinding.identity)
assert.deepEqual(freshHandle.binding.scope, parentBinding.scope)
assert.equal((await readEntry(forgedHandle, forgedOptions)).status, 'unavailable')
const freshOptions = { ...restart.options, request: { ...restart.options.request, binding: freshHandle.binding, serviceGeneration: 'replacement' } }
const parentForgedHandle = { ...freshHandle, binding: parentBinding }
assert.equal((await readEntry(parentForgedHandle, { ...freshOptions, request: { ...freshOptions.request, binding: parentBinding } })).status, 'unavailable')
assert.equal(restart.calls.length, 0)
assert.equal((await readEntry(freshHandle, freshOptions)).status, 'available')
assert.equal(validator('read')(freshOptions.request), true, 'same wire shape supports the independently issued binding')
const login = fixture()
login.record.status = 'authentication-required'
assert.equal((await read(login)).status, 'available')
const replay = fixture()
replay.options.challenge = randomBytes(32).toString('hex')
replay.source.verification.proof = proof(
  secret,
  replay.options.challenge,
  replay.source.origin,
  replay.source.verification.instance,
)
assert.equal((await read(replay)).code, 'ownership-unverified', 'old secondary proof fails a new challenge')
for (const cause of ['timeout', 'cancelled', 'disposed']) {
  const f = fixture()
  const aborter = new AbortController()
  const disposer = new AbortController()
  f.options.signal = aborter.signal
  f.state.signal = disposer.signal
  f.state.now = Date.now
  f.state.deadline = Date.now() + (cause === 'timeout' ? 15 : 1000)
  let requestSignal
  f.options.transport.source = async request => {
    requestSignal = request.signal
    if (cause === 'cancelled') aborter.abort()
    if (cause === 'disposed') disposer.abort()
    return new Promise(() => {})
  }
  assert.equal((await read(f)).code, cause, 'pending transport must settle on invalidation')
  assert.equal(requestSignal.aborted, true, 'pending owned request is aborted')
}
// Concurrent reads of one handle have separate cancellation and no shared result cache.
const concurrent = fixture()
const cancelledRead = new AbortController()
const firstOptions = {
  ...concurrent.options,
  signal: cancelledRead.signal,
  transport: {
    ...concurrent.options.transport,
    source: async request => {
      cancelledRead.abort()
      assert.equal(request.signal.aborted, true)
      return new Promise(() => {})
    },
  },
}
const concurrentResults = await Promise.all([readEntry(concurrent.handle, firstOptions), read(concurrent)])
assert.equal(concurrentResults[0].code, 'cancelled')
assert.equal(concurrentResults[1].status, 'available')
const vectors = JSON.parse(readFileSync(new URL('test-vectors/managed-service-web-entry.v1.json', root)))
for (const vector of vectors.proofs) {
  assert.equal(
    proof(Buffer.from(vector.secretHex, 'hex'), vector.challenge, vector.origin, vector.instance),
    vector.proof,
  )
}
console.log(
  'web entry v1: owner/generation fences, two origins, HMAC/replay rejection, canonical URLs, limits and safe read-only transport passed',
)
