import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const schemaNames = [
  'ui-common.v1.schema.json',
  'plugin-lifecycle-common.v1.schema.json',
  'commerce-descriptor.v1.schema.json',
  'marketplace-official.v1.schema.json',
  'marketplace-official.v2.schema.json',
  'marketplace-certification.v1.schema.json',
  'marketplace-certification.v2.schema.json',
  'marketplace-certified-permission-projection.v2.schema.json',
  'marketplace-plugin.v7.schema.json',
  'marketplace-feed.v7.schema.json',
]
const schemas = new Map(
  await Promise.all(schemaNames.map(async name => [
    name,
    JSON.parse(await readFile(path.join(root, 'schemas', name), 'utf8')),
  ])),
)
const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true })
addFormats(ajv)
for (const schema of schemas.values()) ajv.addSchema(schema)

const schemaId = name => schemas.get(name).$id
const validator = name => {
  const validate = ajv.getSchema(schemaId(name))
  if (validate === undefined) throw new Error(`${name} was not registered`)
  return validate
}
const validateOfficialV1 = validator('marketplace-official.v1.schema.json')
const validateOfficialV2 = validator('marketplace-official.v2.schema.json')
const validateCertificationV1 = validator('marketplace-certification.v1.schema.json')
const validateCertificationV2 = validator('marketplace-certification.v2.schema.json')
const validateProjectionV2 = validator('marketplace-certified-permission-projection.v2.schema.json')
const validateFeedV7 = validator('marketplace-feed.v7.schema.json')

let failures = 0
function expect(condition, message, errors) {
  if (condition) return
  console.error(message, errors ?? '')
  failures += 1
}
function expectValid(validate, value, message) {
  expect(validate(value), message, validate.errors)
}
function expectInvalid(validate, value, message) {
  expect(!validate(value), message, validate.errors)
}

const exactCeiling = {
  capability: 'ui.extension-points.render',
  scope: { extensionPoints: ['manager.settings.navigation-items', 'manager.content'] },
}
const sameJson = (left, right) => JSON.stringify(left) === JSON.stringify(right)
function exactCertification(record, plugin) {
  return record.identity.pluginId === plugin.id
    && record.identity.canonicalSource === plugin.source
    && record.identity.packageName === plugin.artifact.packageName
    && record.identity.version === plugin.version
    && record.identity.downloadUrl === plugin.artifact.downloadUrl
    && record.identity.integrity === plugin.artifact.integrity
    && sameJson(record.eligibilityCeiling, exactCeiling)
}
function exactOfficial(record, plugin) {
  return record.identity.pluginId === plugin.id
    && record.identity.canonicalSource === plugin.source
    && record.identity.publisherIdentity === plugin.artifact.publisherIdentity
    && record.identity.packageNamespace === plugin.artifact.packageNamespace
    && record.identity.packageName === plugin.artifact.packageName
}
function projectionFingerprintPayload(value) {
  return {
    canonicalSource: value.canonicalSource,
    pluginId: value.pluginId,
    packageName: value.packageName,
    version: value.version,
    downloadUrl: value.downloadUrl,
    integrity: value.integrity,
    sourceEvidence: value.sourceEvidence,
    reviewPolicy: value.reviewPolicy,
    reviewedAt: value.reviewedAt,
    expiresAt: value.expiresAt,
    evidence: value.evidence,
    eligibilityCeiling: value.eligibilityCeiling,
    feed: value.feed,
    revision: value.revision,
  }
}
function validProjectionFingerprint(value) {
  const digest = createHash('sha256').update(JSON.stringify(projectionFingerprintPayload(value))).digest('hex')
  return value.fingerprint === `sha256:${digest}` && value.revision === value.feed.generatedAt
}
function validExactFeed(feed) {
  if (!validateFeedV7(feed)) return false
  const entries = new Map(feed.plugins.map(plugin => [`${plugin.source}\u0000${plugin.id}`, plugin]))
  return feed.official.every(record => {
    const plugin = entries.get(`${record.identity.canonicalSource}\u0000${record.identity.pluginId}`)
    return plugin !== undefined && record.reviewer.authority === feed.trust.authority && exactOfficial(record, plugin)
  }) && feed.certifications.every(record => {
    const plugin = entries.get(`${record.identity.canonicalSource}\u0000${record.identity.pluginId}`)
    return plugin !== undefined
      && record.reviewer.authority === feed.trust.authority
      && exactCertification(record, plugin)
  })
}

const suite = JSON.parse(
  await readFile(path.join(root, 'test-vectors/marketplace-trust-v2/valid/internal-aiden-traex.json'), 'utf8'),
)
const modelsRead = JSON.parse(
  await readFile(path.join(root, 'test-vectors/marketplace-trust-v2/invalid/models-read-ceiling.json'), 'utf8'),
)
const expandedScope = JSON.parse(
  await readFile(path.join(root, 'test-vectors/marketplace-trust-v2/invalid/expanded-render-scope.json'), 'utf8'),
)
const { feed, projection } = suite
for (const record of feed.official) {
  expectValid(validateOfficialV2, record, `${record.identity.pluginId} internal Official identity must be valid`)
}
for (const record of feed.certifications) {
  expectValid(validateCertificationV2, record, `${record.identity.pluginId} exact certification must be valid`)
}
expect(validExactFeed(feed), 'v7 feed must compose exact Aiden and TraeX trust records', validateFeedV7.errors)
expectValid(validateProjectionV2, projection, 'exact internal certification projection must be valid')
expect(validProjectionFingerprint(projection), 'projection fingerprint must bind every exact field and revision')

const aidenOfficial = feed.official[0]
const aidenCertification = feed.certifications[0]
expectInvalid(
  validateOfficialV1,
  { ...aidenOfficial, $schema: schemaId('marketplace-official.v1.schema.json'), schemaVersion: 1 },
  'frozen Official v1 must not accept the internal publisher profile',
)
expectInvalid(
  validateOfficialV2,
  { ...aidenOfficial, eligibilityCeiling: exactCeiling },
  'Official must remain identity-only',
)
expectInvalid(
  validateOfficialV2,
  { ...aidenOfficial, permissions: ['models.read'] },
  'Official must not carry permissions',
)
expectInvalid(
  validateOfficialV2,
  { ...aidenOfficial, identity: { ...aidenOfficial.identity, packageName: '@byted/aiden' } },
  'Official v2 must bind the internal package prefix',
)

for (
  const changed of [
    { ...aidenCertification, eligibilityCeiling: modelsRead.eligibilityCeiling },
    { ...aidenCertification, eligibilityCeiling: expandedScope.eligibilityCeiling },
    {
      ...aidenCertification,
      identity: {
        ...aidenCertification.identity,
        sourceEvidence: { ...aidenCertification.identity.sourceEvidence, sourceCommit: 'main' },
      },
    },
  ]
) {
  expectInvalid(validateCertificationV2, changed, 'Certification v2 must remain closed over exact identity and ceiling')
}
for (
  const changed of [
    { ...aidenCertification, identity: { ...aidenCertification.identity, packageName: '@byted/cordisx-plugin-traex' } },
    { ...aidenCertification, identity: { ...aidenCertification.identity, version: '0.1.3' } },
    {
      ...aidenCertification,
      identity: { ...aidenCertification.identity, downloadUrl: 'https://example.invalid/aiden.tgz' },
    },
    { ...aidenCertification, identity: { ...aidenCertification.identity, integrity: `sha256:${'0'.repeat(64)}` } },
  ]
) {
  expect(
    !validExactFeed({ ...feed, certifications: [changed, feed.certifications[1]] }),
    'Certification v2 identity must match the exact feed artifact',
  )
}

for (
  const changed of [
    { ...projection, eligibilityCeiling: modelsRead.eligibilityCeiling },
    { ...projection, eligibilityCeiling: expandedScope.eligibilityCeiling },
    { ...projection, capabilities: ['models.read'] },
  ]
) {
  expectInvalid(validateProjectionV2, changed, 'Projection v2 must exclude broader or side-effect eligibility')
}
for (
  const changed of [
    { ...projection, packageName: '@byted/cordisx-plugin-traex' },
    { ...projection, downloadUrl: 'https://example.invalid/aiden.tgz' },
    { ...projection, integrity: `sha256:${'0'.repeat(64)}` },
    { ...projection, sourceEvidence: { ...projection.sourceEvidence, mergeCommit: '0'.repeat(40) } },
    {
      ...projection,
      evidence: { ...projection.evidence, reference: 'https://code.byted.org/fe/cordisx-marketplace/merge_requests/6' },
    },
    { ...projection, eligibilityCeiling: expandedScope.eligibilityCeiling },
    { ...projection, revision: '2026-09-18T08:00:01.000Z' },
  ]
) {
  expect(
    !validProjectionFingerprint(changed),
    'every artifact, evidence, ceiling and revision field must invalidate the fingerprint',
  )
}

const publicPlugin = {
  ...feed.plugins[0],
  id: 'notes',
  source: 'https://github.com/cordisx/plugin-notes',
  artifact: {
    ...feed.plugins[0].artifact,
    publisherIdentity: 'npm:@cordisx',
    packageNamespace: '@cordisx',
    packageName: '@cordisx/notes',
    downloadUrl: 'https://registry.npmjs.org/@cordisx/notes/-/notes-1.0.0.tgz',
  },
}
const publicOfficial = {
  $schema: schemaId('marketplace-official.v1.schema.json'),
  schemaVersion: 1,
  designation: 'cordisx-official',
  identity: {
    pluginId: publicPlugin.id,
    canonicalSource: publicPlugin.source,
    publisherIdentity: 'npm:@cordisx',
    packageNamespace: '@cordisx',
    packageName: '@cordisx/notes',
  },
  verificationPolicy: { id: 'cordisx-official-publisher', version: '1.0.0' },
  verifiedAt: '2026-09-18T07:00:00.000Z',
  reviewer: {
    authority: 'cordisx.marketplace.codeowners/v1',
    evidenceRef: 'https://github.com/cordisx/marketplace/pull/42',
  },
  status: 'active',
  label: { key: 'official.label', fallback: 'Official' },
  description: { key: 'official.description', fallback: 'Official publisher.' },
}
const publicCertification = {
  $schema: schemaId('marketplace-certification.v1.schema.json'),
  schemaVersion: 1,
  level: 'cordisx-certified',
  identity: {
    pluginId: publicPlugin.id,
    version: publicPlugin.version,
    canonicalSource: publicPlugin.source,
    integrity: publicPlugin.artifact.integrity,
  },
  reviewPolicy: { id: 'cordisx-marketplace-review', version: '1.0.0' },
  reviewedAt: '2026-09-18T07:00:00.000Z',
  expiresAt: '2027-09-18T07:00:00.000Z',
  reviewer: {
    authority: 'cordisx.marketplace.codeowners/v1',
    evidenceRef: 'https://github.com/cordisx/marketplace/pull/42',
  },
  status: 'active',
  label: { key: 'certified.label', fallback: 'Certified' },
  description: { key: 'certified.description', fallback: 'Certified exact artifact.' },
}
expectValid(validateOfficialV1, publicOfficial, 'frozen Official v1 remains valid')
expectValid(validateCertificationV1, publicCertification, 'frozen Certification v1 remains valid')
const publicFeed = {
  ...feed,
  trust: { ...feed.trust, authority: 'cordisx.marketplace.codeowners/v1' },
  plugins: [publicPlugin],
  official: [publicOfficial],
  certifications: [publicCertification],
}
expectValid(validateFeedV7, publicFeed, 'v7 public authority must retain v1 trust compatibility')
expectInvalid(
  validateFeedV7,
  { ...feed, official: [publicOfficial], certifications: [publicCertification] },
  'v7 internal authority must reject public v1 trust records',
)
expectInvalid(
  validateFeedV7,
  { ...publicFeed, official: [aidenOfficial], certifications: [aidenCertification] },
  'v7 public authority must reject internal v2 trust records',
)

if (failures > 0) throw new Error(`${failures} marketplace trust v2 conformance case(s) failed`)
console.log(
  'marketplace trust v2: exact artifact evidence, bounded eligibility, fingerprint and v1 compatibility passed',
)
