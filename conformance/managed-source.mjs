import assert from 'node:assert/strict'
import { generateKeyPairSync, sign, verify } from 'node:crypto'
import { readFileSync } from 'node:fs'
import Ajv from 'ajv/dist/2020.js'
import { managedSourceBinding, managedSourceBytes, managedSourceChallenge } from '../runtime/managed-source.v1.js'
const binding = { origin: 'http://127.0.0.1:3000', sourceId: 'local', instanceId: 'formal', audience: 'source-account' }
const challenge = {
  ...binding,
  contract: 'cordisx.managed-source-challenge/v1',
  nonce: 'a'.repeat(43),
  expiresAt: 20_000,
}
const validate = new Ajv().compile(
  JSON.parse(readFileSync(new URL('../schemas/managed-source.v1.schema.json', import.meta.url))),
)
assert.equal(validate(challenge), true)
assert.deepEqual(managedSourceChallenge(challenge, binding, 10_000), challenge)
for (const patch of [{ origin: 'http://localhost:3000' }, { instanceId: '' }, { audience: 'other' }]) {
  assert.throws(() => managedSourceBinding({ ...binding, ...patch }))
}
for (
  const patch of [{ expiresAt: 10_000 }, { expiresAt: 40_001 }, { nonce: 'invalid' }, { instanceId: 'other' }, {
    accountId: 'forged',
  }]
) {
  assert.throws(() => managedSourceChallenge({ ...challenge, ...patch }, binding, 10_000))
}
assert.equal(
  Buffer.from(managedSourceBytes({ z: 2, a: { y: 1, x: 0 } })).toString(),
  'cordisx.managed-source/v1\n{"a":{"x":0,"y":1},"z":2}',
)
assert.deepEqual(
  managedSourceBytes(challenge),
  managedSourceBytes(Object.fromEntries(Object.entries(challenge).reverse())),
)
assert.equal(
  Buffer.from(managedSourceBytes({ 2: 'two', 10: 'ten' })).toString(),
  'cordisx.managed-source/v1\n{"10":"ten","2":"two"}',
)
for (const value of [{ token: undefined }, { n: Infinity }, { n: 1.5 }, new Date()]) {
  assert.throws(() => managedSourceBytes(value))
}
const key = generateKeyPairSync('ed25519'),
  bytes = managedSourceBytes(challenge),
  signature = sign(null, bytes, key.privateKey)
assert.equal(verify(null, bytes, key.publicKey, signature), true)
assert.equal(verify(null, managedSourceBytes({ ...challenge, sourceId: 'other' }), key.publicKey, signature), false)
assert.equal(verify(null, bytes, generateKeyPairSync('ed25519').publicKey, signature), false)
console.log('Managed source binding, canonicalization, signature and expiry vectors passed')
const remote = { ...binding, origin: 'https://game.example' }
assert.deepEqual(managedSourceBinding(remote), remote)
assert.equal(validate({ ...challenge, ...remote }), true)
for (
  const origin of [
    'http://game.example',
    'https://game.example/',
    'https://user@game.example',
    'https://game.example?x=1',
  ]
) {
  assert.throws(() => managedSourceBinding({ ...remote, origin }))
}
assert.throws(() => managedSourceBinding({ ...remote, audience: 'work-income' }))
assert.equal(validate({ ...challenge, ...remote, audience: 'work-income' }), false)
assert.throws(() => managedSourceChallenge({ ...challenge, ...remote }, binding, 10000))
