import { readFile, readdir } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const schemaNames = [
  'ui-common.v1.schema.json',
  'plugin-lifecycle-common.v1.schema.json',
  'marketplace-certification.v1.schema.json',
  'marketplace-certified-permission-projection.v1.schema.json',
  'marketplace-official.v1.schema.json',
  'marketplace-plugin.v3.schema.json',
  'marketplace-feed.v3.schema.json',
  'platform-model.v1.schema.json',
  'platform-session.v1.schema.json',
  'channel-common.v1.schema.json',
  'plugin-manifest.v3.schema.json',
]
const schemas = new Map(await Promise.all(schemaNames.map(async name => [
  name,
  JSON.parse(await readFile(path.join(root, 'schemas', name), 'utf8')),
])))
const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true })
addFormats(ajv)
for (const schema of schemas.values()) ajv.addSchema(schema)

const certificationSchema = schemas.get('marketplace-certification.v1.schema.json')
const validateCertificationSchema = ajv.getSchema(certificationSchema.$id)
if (validateCertificationSchema === undefined) throw new Error('certification schema was not registered')
const certifiedPermissionProjectionSchema = schemas.get('marketplace-certified-permission-projection.v1.schema.json')
const validateCertifiedPermissionProjectionSchema = ajv.getSchema(certifiedPermissionProjectionSchema.$id)
if (validateCertifiedPermissionProjectionSchema === undefined) throw new Error('certified permission projection schema was not registered')
const officialSchema = schemas.get('marketplace-official.v1.schema.json')
const validateOfficialSchema = ajv.getSchema(officialSchema.$id)
if (validateOfficialSchema === undefined) throw new Error('official publisher schema was not registered')
const feedSchema = schemas.get('marketplace-feed.v3.schema.json')
const validateFeedSchema = ajv.getSchema(feedSchema.$id)
if (validateFeedSchema === undefined) throw new Error('trusted feed schema was not registered')

function instant(value, field, errors) {
  const parsed = Date.parse(value)
  if (!Number.isFinite(parsed)) errors.push({ message: `${field} must be a valid date-time` })
  return parsed
}

function sameIdentity(left, right) {
  return left?.pluginId === right?.pluginId
    && left?.version === right?.version
    && left?.canonicalSource === right?.canonicalSource
    && left?.integrity === right?.integrity
}

function sameOfficialIdentity(left, right) {
  return left?.pluginId === right?.pluginId
    && left?.canonicalSource === right?.canonicalSource
    && left?.publisherIdentity === right?.publisherIdentity
    && left?.packageNamespace === right?.packageNamespace
    && left?.packageName === right?.packageName
}

export function validateCertification(value, options = {}) {
  const errors = []
  if (!validateCertificationSchema(value)) return validateCertificationSchema.errors ?? []
  if (typeof value.label.fallback !== 'string' || typeof value.description.fallback !== 'string') {
    errors.push({ message: 'certification label and description require localized fallbacks' })
  }

  if (options.subject !== undefined && !sameIdentity(value.identity, options.subject)) {
    errors.push({ message: 'certification identity must exactly match pluginId, version, canonicalSource, and integrity' })
  }

  const evaluatedAt = instant(options.evaluatedAt, 'evaluatedAt', errors)
  const reviewedAt = instant(value.reviewedAt, 'reviewedAt', errors)
  const expiresAt = instant(value.expiresAt, 'expiresAt', errors)
  const revokedAt = value.revokedAt === undefined ? undefined : instant(value.revokedAt, 'revokedAt', errors)
  if (errors.length > 0) return errors

  if (value.status === 'revoked' && revokedAt === undefined) errors.push({ message: 'revoked certification requires revokedAt' })
  if (value.status !== 'revoked' && revokedAt !== undefined) errors.push({ message: 'only revoked certification may include revokedAt' })
  if (errors.length > 0) return errors

  if (reviewedAt > evaluatedAt) errors.push({ message: 'reviewedAt must not be after evaluatedAt' })
  if (expiresAt <= reviewedAt) errors.push({ message: 'expiresAt must be after reviewedAt' })

  if (value.status === 'active' && expiresAt <= evaluatedAt) {
    errors.push({ message: 'an expired certification cannot remain active' })
  }
  if (value.status === 'expired' && expiresAt > evaluatedAt) {
    errors.push({ message: 'an unexpired certification cannot be marked expired' })
  }
  if (value.status === 'revoked') {
    if (revokedAt < reviewedAt) errors.push({ message: 'revokedAt must not be before reviewedAt' })
    if (revokedAt > evaluatedAt) errors.push({ message: 'revokedAt must not be after evaluatedAt' })
  }
  return errors
}

export function validateCertifiedPermissionProjection(value, options = {}) {
  const errors = []
  if (!validateCertifiedPermissionProjectionSchema(value)) return validateCertifiedPermissionProjectionSchema.errors ?? []
  if (options.subject !== undefined && !sameIdentity({
    pluginId: value.pluginId,
    version: value.version,
    canonicalSource: value.source,
    integrity: value.integrity,
  }, options.subject)) {
    errors.push({ message: 'certified permission projection must exactly match pluginId, version, canonicalSource, and integrity' })
  }

  const evaluatedAt = instant(options.evaluatedAt, 'evaluatedAt', errors)
  const feedGeneratedAt = instant(value.feed.generatedAt, 'feed.generatedAt', errors)
  const reviewedAt = instant(value.reviewedAt, 'reviewedAt', errors)
  const expiresAt = instant(value.expiresAt, 'expiresAt', errors)
  if (errors.length > 0) return errors

  if (feedGeneratedAt > evaluatedAt) errors.push({ message: 'feedGeneratedAt must not be after evaluatedAt' })
  if (reviewedAt > feedGeneratedAt) errors.push({ message: 'reviewedAt must not be after feedGeneratedAt' })
  if (expiresAt <= reviewedAt) errors.push({ message: 'expiresAt must be after reviewedAt' })
  if (expiresAt <= evaluatedAt) errors.push({ message: 'expired certification cannot produce an active permission projection' })
  if (value.revision !== value.feed.generatedAt) errors.push({ message: 'projection revision must equal the source feed generatedAt' })
  const fingerprintPayload = {
    source: value.source,
    pluginId: value.pluginId,
    version: value.version,
    integrity: value.integrity,
    reviewPolicy: value.reviewPolicy,
    reviewedAt: value.reviewedAt,
    expiresAt: value.expiresAt,
    evidence: value.evidence,
    feed: value.feed,
  }
  const fingerprint = `sha256:${createHash('sha256').update(JSON.stringify(fingerprintPayload)).digest('hex')}`
  if (value.fingerprint !== fingerprint) errors.push({ message: 'projection fingerprint must cover every security-relevant field in canonical order' })
  return errors
}

export function validateOfficial(value, options = {}) {
  const errors = []
  if (!validateOfficialSchema(value)) return validateOfficialSchema.errors ?? []
  if (typeof value.label.fallback !== 'string' || typeof value.description.fallback !== 'string') {
    errors.push({ message: 'official label and description require localized fallbacks' })
  }

  if (options.subject !== undefined && !sameOfficialIdentity(value.identity, options.subject)) {
    errors.push({ message: 'official identity must exactly match pluginId, canonicalSource, publisherIdentity, packageNamespace, and packageName' })
  }

  if (!value.identity.packageName.startsWith(`${value.identity.packageNamespace}/`)) {
    errors.push({ message: 'official packageName must belong to packageNamespace' })
  }

  const evaluatedAt = instant(options.evaluatedAt, 'evaluatedAt', errors)
  const verifiedAt = instant(value.verifiedAt, 'verifiedAt', errors)
  const revokedAt = value.revokedAt === undefined ? undefined : instant(value.revokedAt, 'revokedAt', errors)
  if (errors.length > 0) return errors

  if (value.status === 'revoked' && revokedAt === undefined) errors.push({ message: 'revoked official record requires revokedAt' })
  if (value.status !== 'revoked' && revokedAt !== undefined) errors.push({ message: 'only revoked official record may include revokedAt' })
  if (errors.length > 0) return errors

  if (verifiedAt > evaluatedAt) errors.push({ message: 'verifiedAt must not be after evaluatedAt' })
  if (value.status === 'revoked') {
    if (revokedAt < verifiedAt) errors.push({ message: 'revokedAt must not be before verifiedAt' })
    if (revokedAt > evaluatedAt) errors.push({ message: 'revokedAt must not be after evaluatedAt' })
  }
  return errors
}

function compareOfficial(left, right) {
  return left.identity.canonicalSource.localeCompare(right.identity.canonicalSource)
    || left.identity.pluginId.localeCompare(right.identity.pluginId)
    || left.identity.packageName.localeCompare(right.identity.packageName)
}

function compareCertification(left, right) {
  return left.identity.canonicalSource.localeCompare(right.identity.canonicalSource)
    || left.identity.pluginId.localeCompare(right.identity.pluginId)
    || left.identity.version.localeCompare(right.identity.version)
    || left.identity.integrity.localeCompare(right.identity.integrity)
}

export function validateTrustFeed(feed, options = {}) {
  const errors = []
  if (!validateFeedSchema(feed)) return validateFeedSchema.errors ?? []
  if (typeof options.sourceUrl !== 'string' || feed.trust.root !== options.sourceUrl) {
    errors.push({ message: 'trusted feed root must exactly match the configured Marketplace source URL' })
  }

  const generatedAt = Date.parse(feed.generatedAt)
  const evaluatedAt = options.evaluatedAt ?? feed.generatedAt
  if (Date.parse(evaluatedAt) < generatedAt) {
    errors.push({ message: 'trust evaluation time must not be before feed generatedAt' })
  }
  const plugins = new Map()
  for (const plugin of feed.plugins) {
    const key = `${plugin.source}\u0000${plugin.id}`
    if (plugins.has(key)) errors.push({ message: `duplicate plugin identity: ${plugin.source} + ${plugin.id}` })
    plugins.set(key, plugin)
    if (plugin.artifact !== undefined && !plugin.artifact.packageName.startsWith(`${plugin.artifact.packageNamespace}/`)) {
      errors.push({ message: `plugin ${plugin.id} packageName must belong to packageNamespace` })
    }
  }

  const officialKeys = new Set()
  for (const record of feed.official) {
    const key = JSON.stringify(record.identity)
    if (officialKeys.has(key)) errors.push({ message: `duplicate official identity: ${key}` })
    officialKeys.add(key)
    const plugin = plugins.get(`${record.identity.canonicalSource}\u0000${record.identity.pluginId}`)
    if (plugin?.artifact === undefined) {
      errors.push({ message: `official record has no matching plugin artifact: ${record.identity.pluginId}` })
      continue
    }
    errors.push(...validateOfficial(record, {
      evaluatedAt,
      subject: {
        pluginId: plugin.id,
        canonicalSource: plugin.source,
        publisherIdentity: plugin.artifact.publisherIdentity,
        packageNamespace: plugin.artifact.packageNamespace,
        packageName: plugin.artifact.packageName,
      },
    }))
  }

  const certificationKeys = new Set()
  for (const record of feed.certifications) {
    const key = JSON.stringify(record.identity)
    if (certificationKeys.has(key)) errors.push({ message: `duplicate certification identity: ${key}` })
    certificationKeys.add(key)
    const plugin = plugins.get(`${record.identity.canonicalSource}\u0000${record.identity.pluginId}`)
    if (plugin?.artifact === undefined || plugin.version !== record.identity.version) {
      errors.push({ message: `certification has no matching exact plugin artifact: ${record.identity.pluginId}@${record.identity.version}` })
      continue
    }
    errors.push(...validateCertification(record, {
      evaluatedAt,
      subject: {
        pluginId: plugin.id,
        version: plugin.version,
        canonicalSource: plugin.source,
        integrity: plugin.artifact.integrity,
      },
    }))
  }

  if (JSON.stringify([...feed.official].sort(compareOfficial)) !== JSON.stringify(feed.official)) {
    errors.push({ message: 'official records must use deterministic source/id/package ordering' })
  }
  if (JSON.stringify([...feed.certifications].sort(compareCertification)) !== JSON.stringify(feed.certifications)) {
    errors.push({ message: 'certification records must use deterministic source/id/version/integrity ordering' })
  }
  return errors
}

async function jsonFiles(directory) {
  return (await readdir(directory, { withFileTypes: true }))
    .filter(entry => entry.isFile() && entry.name.endsWith('.json'))
    .map(entry => path.join(directory, entry.name))
    .sort()
}

function validateVector(vector) {
  if (vector.case === 'manifest-self-claim') {
    const schemaUri = vector.value?.$schema
    const validateManifest = ajv.getSchema(schemaUri)
    if (validateManifest === undefined) return [{ message: `unknown manifest schema: ${schemaUri}` }]
    return validateManifest(vector.value) ? [] : validateManifest.errors ?? []
  }
  if (vector.kind === 'official') {
    return validateOfficial(vector.value, {
      evaluatedAt: vector.evaluatedAt,
      subject: vector.subject,
    })
  }
  return validateCertification(vector.value, {
    evaluatedAt: vector.evaluatedAt,
    subject: vector.subject,
  })
}

function validateProjectionVector(vector) {
  return validateCertifiedPermissionProjection(vector.value, {
    evaluatedAt: vector.evaluatedAt,
    subject: vector.subject,
  })
}

let failures = 0
for (const vectorGroup of ['marketplace-certification', 'marketplace-official']) {
  for (const kind of ['valid', 'invalid']) {
    for (const file of await jsonFiles(path.join(root, 'test-vectors', vectorGroup, kind))) {
      const vector = JSON.parse(await readFile(file, 'utf8'))
      const errors = validateVector(vector)
      const shouldPass = kind === 'valid'
      if ((errors.length === 0) !== shouldPass) {
        console.error(`${path.relative(root, file)} should ${shouldPass ? 'pass' : 'fail'}`, errors)
        failures += 1
      }
    }
  }
}

for (const kind of ['valid', 'invalid']) {
  for (const file of await jsonFiles(path.join(root, 'test-vectors/marketplace-certified-permission-projection', kind))) {
    const vector = JSON.parse(await readFile(file, 'utf8'))
    const errors = validateProjectionVector(vector)
    const shouldPass = kind === 'valid'
    if ((errors.length === 0) !== shouldPass) {
      console.error(`${path.relative(root, file)} should ${shouldPass ? 'pass' : 'fail'}`, errors)
      failures += 1
    }
  }
}

for (const file of await jsonFiles(path.join(root, 'test-vectors/marketplace-trust/feeds'))) {
  const vector = JSON.parse(await readFile(file, 'utf8'))
  const errors = validateTrustFeed(vector.value, { sourceUrl: vector.sourceUrl })
  const shouldPass = path.basename(file).startsWith('valid-')
  if ((errors.length === 0) !== shouldPass) {
    console.error(`${path.relative(root, file)} should ${shouldPass ? 'pass' : 'fail'}`, errors)
    failures += 1
  }
}

if (failures > 0) throw new Error(`${failures} marketplace trust conformance case(s) failed`)
console.log('marketplace trust conformance: all vectors passed')
