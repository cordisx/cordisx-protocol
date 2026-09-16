import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createHash, createPublicKey, verify } from 'node:crypto'
import Ajv from 'ajv/dist/2020.js'
const root = new URL('../', import.meta.url)
const json = async path => JSON.parse(await readFile(new URL(path, root), 'utf8'))
const canonical = x =>
  x && typeof x === 'object'
    ? Array.isArray(x)
      ? `[${x.map(canonical).join(',')}]`
      : `{${Object.keys(x).sort().map(k => `${JSON.stringify(k)}:${canonical(x[k])}`).join(',')}}`
    : JSON.stringify(x)
const fixture = await json('test-vectors/wallet-spend.v1.json')
const validate = new Ajv().compile(await json('schemas/wallet-spend-source.v1.schema.json'))
assert.equal(validate(fixture.source), true)
assert.equal(validate({ ...fixture.source, approved: true }), false)
assert.equal(validate({ ...fixture.source, serviceOrigin: 'http://localhost:8788' }), true)
assert.equal(validate({ ...fixture.source, serviceOrigin: 'http://remote.example:8788' }), false)
for (const [name, envelope] of Object.entries(fixture.envelopes)) {
  const publicKey = name === 'terms' || name === 'decision' || name === 'challenge'
    ? fixture.source.servicePublicKey
    : fixture.identity.walletPublicKey
  const key = createPublicKey({ key: Buffer.from(publicKey, 'base64url'), type: 'spki', format: 'der' })
  assert(
    verify(
      null,
      Buffer.from(envelope.payload.contract + '\0' + canonical(envelope.payload)),
      key,
      Buffer.from(envelope.signature, 'base64url'),
    ),
  )
  assert(
    !verify(
      null,
      Buffer.from('wrong-domain\0' + canonical(envelope.payload)),
      key,
      Buffer.from(envelope.signature, 'base64url'),
    ),
  )
}
assert.equal(createHash('sha256').update(canonical(fixture.envelopes.terms.payload)).digest('hex'), fixture.termsHash)
assert.equal(
  fixture.envelopes.decision.payload.entries[0].captureAmount <= fixture.envelopes.reservation.payload.amount,
  true,
)
const manifest = await json('package.json')
assert(manifest.files.includes('types/wallet-spend.v1.d.ts'))
assert.equal(manifest.exports['./wallet-spend/v1'].types, './types/wallet-spend.v1.d.ts')
console.log('wallet-spend/v1 source, signatures, hashes and package exports PASS')
