import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { generateKeyPairSync, sign, verify } from 'node:crypto'
import Ajv from 'ajv/dist/2020.js'
import { localWalletBytes } from '../runtime/local-wallet.v1.js'
import { localWorkSettlementReceipt } from '../runtime/local-work-settlement.v1.js'
const vectors = JSON.parse(readFileSync(new URL('../test-vectors/local-work-settlement.v1.json', import.meta.url)))
const validate = new Ajv().compile(
  JSON.parse(readFileSync(new URL('../schemas/local-work-settlement.v1.schema.json', import.meta.url))),
)
for (const payload of vectors.valid) assert.equal(validate(payload), true, JSON.stringify(validate.errors))
for (const payload of vectors.invalid) assert.equal(validate(payload), false)
const payload = vectors.valid[0], snapshot = payload.snapshot
assert.equal(Buffer.from(localWalletBytes(payload)).toString(), vectors.canonical)
const key = generateKeyPairSync('ed25519'), signature = sign(null, localWalletBytes(payload), key.privateKey)
assert.equal(verify(null, localWalletBytes(payload), key.publicKey, signature), true)
for (
  const patch of [{ contract: 'cordisx.local-work-observation/v1' }, { nonce: 'b'.repeat(43) }, {
    snapshot: { ...snapshot, eligibleTokens: snapshot.eligibleTokens + 1 },
  }]
) {
  assert.equal(verify(null, localWalletBytes({ ...payload, ...patch }), key.publicKey, signature), false)
}
const receipt = {
  eventId: 'work:' + 'a'.repeat(64),
  binding: { instanceId: payload.instanceId, accountId: 'original', scopeId: snapshot.scopeId },
  amount: 0,
  remainder: 9999,
  cursor: {
    scopeId: snapshot.scopeId,
    sourceId: snapshot.sourceId,
    epoch: snapshot.epoch,
    revision: snapshot.revision,
    tokens: snapshot.eligibleTokens,
    observedThrough: snapshot.observedThrough,
  },
  coverage: 'partial',
  policy: 'durable-admitted-v1',
}
assert.deepEqual(localWorkSettlementReceipt(receipt, snapshot, payload, 'original'), receipt)
for (
  const patch of [
    { policy: 'leased' },
    { remainder: 10000 },
    { amount: -1 },
    { cursor: { ...receipt.cursor, tokens: receipt.cursor.tokens + 1 } },
    { binding: { ...receipt.binding, accountId: 'other' } },
    { baseline: true },
  ]
) {
  assert.throws(() => localWorkSettlementReceipt({ ...receipt, ...patch }, snapshot, payload, 'original'))
}
console.log('Durable work settlement version isolation, signatures and receipt pins passed')
