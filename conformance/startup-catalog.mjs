import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { Adoption, Reporter } from './startup-reference-model.mjs'

export const catalogDigest = catalog =>
  `sha256:${
    createHash('sha256').update(JSON.stringify([
      catalog.generation,
      [...catalog.modelIds].sort((a, b) =>
        Buffer.compare(Buffer.from(a), Buffer.from(b)) || (a < b ? -1 : a > b ? 1 : 0)
      ),
    ])).digest('hex')
  }`

class CatalogReporter extends Reporter {
  constructor(...args) {
    super(...args)
    this.catalogSequence = 0
    this.catalog = { state: 'pending' }
    this.publicationActive = false
  }
  reportCatalog(input, caller, validate) {
    const reject = reason => ({ status: 'rejected', reason })
    if (this.revoked) return reject('revoked')
    if (caller.pluginId !== this.capability.pluginId || caller.serviceId !== this.capability.serviceId) {
      return reject('not-owner')
    }
    if (this.capability.kind !== 'provider') return reject('not-provider')
    if (input.target.pluginId !== this.capability.pluginId || input.target.capabilityId !== this.capability.id) {
      return reject('undeclared')
    }
    if (JSON.stringify(input.generation) !== JSON.stringify(this.generation)) return reject('stale-generation')
    if (input.sequence <= this.catalogSequence) return reject('stale-sequence')
    if (
      !validate(input) || (input.catalog.state === 'known' && input.catalog.digest !== catalogDigest(input.catalog))
    ) {
      return reject('invalid-catalog')
    }
    if (JSON.stringify(input.catalog) !== JSON.stringify(this.catalog)) this.publicationActive = false
    this.catalogSequence = input.sequence
    this.catalog = structuredClone(input.catalog)
    return { status: 'accepted' }
  }
}

export async function checkCatalogAndPreparation(fixture, graph, validate) {
  const capability = graph.values().next().value
  const { report } = fixture
  const owner = { pluginId: 'example', serviceId: 'backend' }
  const reporter = new CatalogReporter(capability, report.generation)
  const known = { state: 'known', generation: 'catalog-empty', modelIds: [] }
  known.digest = catalogDigest(known)
  const input = {
    contract: 'cordisx.startup-catalog-report/v1',
    target: report.target,
    generation: report.generation,
    sequence: 1,
    catalog: known,
  }
  assert.equal(reporter.reportCatalog(input, { ...owner, serviceId: 'other' }, validate).reason, 'not-owner')
  assert.equal(
    reporter.reportCatalog({ ...input, target: { ...input.target, capabilityId: 'other' } }, owner, validate).reason,
    'undeclared',
  )
  assert.equal(
    reporter.reportCatalog({ ...input, generation: { ...report.generation, host: 'old' } }, owner, validate).reason,
    'stale-generation',
  )
  assert.equal(
    reporter.reportCatalog({ ...input, catalog: { ...known, digest: `sha256:${'0'.repeat(64)}` } }, owner, validate)
      .reason,
    'invalid-catalog',
  )
  assert.equal(reporter.catalogSequence, 0)
  assert.equal(reporter.reportCatalog(input, owner, validate).status, 'accepted')
  assert.deepEqual(reporter.catalog.modelIds, [])
  assert.equal(reporter.reportCatalog(input, owner, validate).reason, 'stale-sequence')
  const nonempty = { state: 'known', generation: 'catalog-2', modelIds: ['b', 'a'] }
  nonempty.digest = catalogDigest(nonempty)
  assert.equal(nonempty.digest, catalogDigest({ ...nonempty, modelIds: ['a', 'b'] }))
  const sameUtf8 = { generation: 'utf8-tie', modelIds: [String.fromCharCode(0xd800), String.fromCharCode(0xfffd)] }
  const sameUtf8Digest = 'sha256:f423f1285a060369c5d7ad6cd7bbe3dc316c23aac6e244e1fbe7af3a01d78fff'
  assert.equal(catalogDigest(sameUtf8), sameUtf8Digest)
  assert.equal(catalogDigest({ ...sameUtf8, modelIds: [...sameUtf8.modelIds].reverse() }), sameUtf8Digest)
  assert.equal(reporter.reportCatalog({ ...input, sequence: 2, catalog: nonempty }, owner, validate).status, 'accepted')
  assert.equal(reporter.publicationActive, false, 'catalog report alone never publishes routes')
  reporter.publicationActive = true
  assert.equal(
    reporter.reportCatalog({ ...input, sequence: 3, catalog: { state: 'pending' } }, owner, validate).status,
    'accepted',
  )
  assert.equal(reporter.publicationActive, false)
  assert.equal(
    reporter.reportCatalog({ ...input, sequence: 4, catalog: { state: 'failed' } }, owner, validate).status,
    'accepted',
  )
  const duplicate = { ...nonempty, modelIds: ['a', 'a'] }
  duplicate.digest = catalogDigest(duplicate)
  assert.equal(
    reporter.reportCatalog({ ...input, sequence: 5, catalog: duplicate }, owner, validate).reason,
    'invalid-catalog',
  )
  assert.equal(
    reporter.reportCatalog(
      { ...input, sequence: 5, catalog: { ...known, endpoint: 'http://localhost' } },
      owner,
      validate,
    ).reason,
    'invalid-catalog',
  )
  reporter.revoked = true
  assert.equal(reporter.reportCatalog({ ...input, sequence: 5 }, owner, validate).reason, 'revoked')

  let finishApply
  const order = []
  const module = {
    apply: () =>
      new Promise(resolve => {
        finishApply = resolve
      }),
    prepare: async ({ capability: target }) => {
      order.push(target.id)
    },
  }
  const adoption = new Adoption()
  const base = adoption.apply(module)
  await assert.rejects(adoption.prepare(module, capability, true), /not-adopted/)
  finishApply()
  await base
  await assert.rejects(adoption.prepare(module, capability, false), /dependency-not-ready/)
  await adoption.prepare(module, capability, true)
  await adoption.prepare(module, capability, true)
  assert.deepEqual(order, ['primary'])
  assert.equal(adoption.state, 'adopted', 'prepare completion does not fabricate ready')
  adoption.disposed = true
  await assert.rejects(adoption.prepare(module, capability, true), /not-adopted/)
}
