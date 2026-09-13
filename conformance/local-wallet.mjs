import assert from 'node:assert/strict'
import { createHash, generateKeyPairSync, sign, verify } from 'node:crypto'
import { readFileSync } from 'node:fs'
import Ajv from 'ajv/dist/2020.js'
import { localWalletBinding, localWalletBytes, localWalletChallenge } from '../runtime/local-wallet.v1.js'
import { managedSourceBytes } from '../runtime/managed-source.v1.js'
const vectors = JSON.parse(readFileSync(new URL('../test-vectors/local-wallet.v1.json', import.meta.url)))
const validate = new Ajv().compile(
  JSON.parse(readFileSync(new URL('../schemas/local-wallet.v1.schema.json', import.meta.url))),
)
for (const payload of vectors.valid) assert.equal(validate(payload), true, JSON.stringify(validate.errors))
for (const payload of vectors.invalid) assert.equal(validate(payload), false)
const challenge = vectors.valid[0]
const binding = localWalletBinding(challenge)
assert.deepEqual(localWalletChallenge(challenge, binding, 10_000), challenge)
for (
  const patch of [{ origin: 'http://localhost:3000' }, { origin: 'http://127.0.0.1:80' }, { instanceId: '' }, {
    audience: 'source-account',
  }]
) assert.throws(() => localWalletBinding({ ...binding, ...patch }))
for (
  const patch of [{ expiresAt: 10_000 }, { expiresAt: 40_001 }, { nonce: 'invalid' }, { sourceId: 'other' }, {
    accountId: 'forged',
  }]
) assert.throws(() => localWalletChallenge({ ...challenge, ...patch }, binding, 10_000))
assert.equal(
  Buffer.from(localWalletBytes({ z: 2, a: { y: 1, x: 0 } })).toString(),
  'cordisx.local-wallet/v1\n{"a":{"x":0,"y":1},"z":2}',
)
for (const value of [{ token: undefined }, { n: Infinity }, { n: 1.5 }, new Date()]) {
  assert.throws(() => localWalletBytes(value))
}
const key = generateKeyPairSync('ed25519'), root = generateKeyPairSync('ed25519')
const der = key.publicKey.export({ type: 'spki', format: 'der' })
const enrollment = {
  ...vectors.valid[1],
  publicKey: der.toString('base64'),
  subject: 'host-local:' + createHash('sha256').update(der).digest('base64url'),
}
assert.equal(validate(enrollment), true)
const bytes = localWalletBytes(enrollment), signature = sign(null, bytes, root.privateKey)
assert.equal(verify(null, bytes, root.publicKey, signature), true)
for (
  const patch of [
    { publicKey: root.publicKey.export({ type: 'spki', format: 'der' }).toString('base64') },
    { nativeSubject: 'codex:' + 'b'.repeat(43) },
    { subject: 'host-local:' + 'b'.repeat(43) },
    { nonce: 'b'.repeat(43) },
    { instanceId: 'other' },
  ]
) assert.equal(verify(null, localWalletBytes({ ...enrollment, ...patch }), root.publicKey, signature), false)
assert.equal(verify(null, managedSourceBytes(enrollment), root.publicKey, signature), false)
const assertion = { ...vectors.valid[2], subject: enrollment.subject }
const localSignature = sign(null, localWalletBytes(assertion), key.privateKey)
assert.equal(verify(null, localWalletBytes(assertion), key.publicKey, localSignature), true)
assert.equal(verify(null, localWalletBytes(assertion), root.publicKey, localSignature), false)
console.log('Local wallet closed payload, enrollment binding, signing domain, key and expiry vectors passed')
