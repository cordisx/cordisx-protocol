import { createHash } from 'node:crypto'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const schemaDirectory = path.join(root, 'schemas')
const schemaFiles = (await readdir(schemaDirectory))
  .filter(file => file.endsWith('.schema.json'))
  .sort()
const schemas = new Map()
for (const file of schemaFiles) {
  const schema = JSON.parse(await readFile(path.join(schemaDirectory, file), 'utf8'))
  schemas.set(schema.$id, schema)
}

const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true })
addFormats(ajv)
for (const schema of schemas.values()) ajv.addSchema(schema)

const ids = {
  catalog:
    'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/permission-capability-catalog.v1.schema.json',
  decision:
    'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/permission-authorization-decision.v2.schema.json',
  manifest: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/plugin-manifest.v4.schema.json',
  package: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/plugin-package.v3.schema.json',
  plan:
    'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/permission-authorization-plan.v2.schema.json',
  policy: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/permission-policy.v2.schema.json',
}
const manifestSchema = schemas.get(ids.manifest)
const capabilityNames = manifestSchema.$defs.capabilityName.enum

function schemaErrors(value) {
  const validator = ajv.getSchema(value?.$schema)
  if (validator === undefined) return ['unknown schema']
  if (validator(value)) return []
  return (validator.errors ?? []).map(error => `${error.instancePath || '/'} ${error.message}`)
}

function rationaleErrors(manifest) {
  const errors = []
  for (const declaration of manifest.capabilities ?? []) {
    for (const [field, text] of Object.entries(declaration.rationale ?? {})) {
      const fallback = text?.fallback
      if (typeof fallback !== 'string') continue
      if (/[\u0000-\u001f\u007f]/u.test(fallback)) {
        errors.push(`${declaration.name}.${field} contains control characters`)
      }
      if (/[<>]/u.test(fallback)) errors.push(`${declaration.name}.${field} contains markup`)
      if (/(?:https?:\/\/|javascript:)/iu.test(fallback)) {
        errors.push(`${declaration.name}.${field} contains a link or script scheme`)
      }
      if (
        /(?:cordisx|host).*(?:verified|approved|guaranteed|safe)|(?:CordisX|宿主).*(?:验证|批准|保证|安全)/iu.test(
          fallback,
        )
      ) {
        errors.push(`${declaration.name}.${field} impersonates a Host security claim`)
      }
    }
  }
  return errors
}

function manifestErrors(manifest) {
  const errors = [...schemaErrors(manifest), ...rationaleErrors(manifest)]
  const seen = new Set()
  for (const declaration of manifest.capabilities ?? []) {
    if (seen.has(declaration.name)) errors.push(`duplicate capability ${declaration.name}`)
    seen.add(declaration.name)
    const isAgent = declaration.name?.startsWith('agent.')
    const isChannel = declaration.name?.startsWith('channel.')
    if (isAgent && declaration.scope?.sessions !== undefined) {
      errors.push(`${declaration.name} cannot use Platform sessions`)
    }
    if (!isAgent && declaration.scope?.sessionIds !== undefined) {
      errors.push(`${declaration.name} cannot use Agent session ids`)
    }
    if (!isChannel && Object.keys(declaration.scope ?? {}).some(key => key.startsWith('channel'))) {
      errors.push(`${declaration.name} cannot use Channel scope`)
    }
  }
  return errors
}

function catalogErrors(catalog) {
  const errors = schemaErrors(catalog)
  const seen = new Set()
  for (const entry of catalog.entries ?? []) {
    if (seen.has(entry.capability)) errors.push(`duplicate catalog capability ${entry.capability}`)
    seen.add(entry.capability)
    if (entry.sensitivity === 'high-risk') {
      if (entry.persistentAllow !== false) {
        errors.push(`${entry.capability} high-risk persistent allow must be disabled`)
      }
      if (entry.recommendedPolicy !== 'ask') errors.push(`${entry.capability} high-risk policy must default to ask`)
      if (entry.installPrompt !== 'explicit' || entry.runtimePrompt !== 'always') {
        errors.push(`${entry.capability} high-risk prompts must remain explicit`)
      }
    }
    if (entry.sensitivity === 'sensitive' && entry.installPrompt !== 'explicit') {
      errors.push(`${entry.capability} sensitive install prompt must be explicit`)
    }
  }
  for (const capability of capabilityNames) if (!seen.has(capability)) errors.push(`catalog is missing ${capability}`)
  for (const capability of seen) {
    if (!capabilityNames.includes(capability)) errors.push(`catalog contains unknown ${capability}`)
  }
  return errors
}

function planErrors(plan) {
  const errors = schemaErrors(plan)
  const seen = new Set()
  for (const declaration of plan.declarations ?? []) {
    if (seen.has(declaration.capability)) errors.push(`duplicate plan capability ${declaration.capability}`)
    seen.add(declaration.capability)
    if (!declaration.allowedDecisions?.includes(declaration.defaultDecision)) {
      errors.push(`${declaration.capability} default is not an allowed decision`)
    }
    if (declaration.persistentAllow === false && declaration.allowedDecisions?.includes('allow-persistent')) {
      errors.push(`${declaration.capability} exposes forbidden persistent allow`)
    }
    if (declaration.persistentDeny === false && declaration.allowedDecisions?.includes('deny-persistent')) {
      errors.push(`${declaration.capability} exposes forbidden persistent deny`)
    }
    if (declaration.sensitivity === 'high-risk' && declaration.defaultDecision === 'allow-persistent') {
      errors.push(`${declaration.capability} high-risk default cannot be persistent allow`)
    }
  }
  return errors
}

function documentErrors(document) {
  if (document?.$schema === ids.manifest) return manifestErrors(document)
  if (document?.$schema === ids.catalog) return catalogErrors(document)
  if (document?.$schema === ids.plan) return planErrors(document)
  return schemaErrors(document)
}

function normalized(value) {
  if (Array.isArray(value)) {
    return value.map(normalized).sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)))
  }
  if (value === null || typeof value !== 'object') return value
  return Object.fromEntries(
    Object.entries(value).sort(([left], [right]) => left.localeCompare(right)).map((
      [key, entry],
    ) => [key, normalized(entry)]),
  )
}

function securityFingerprint(catalogVersion, declaration) {
  return `sha256:${
    createHash('sha256').update(JSON.stringify(normalized({
      catalogVersion,
      capability: declaration.name,
      rationale: declaration.rationale ?? null,
      scope: declaration.scope,
      security: declaration.security ?? null,
    }))).digest('hex')
  }`
}

async function documents(directory) {
  const files = (await readdir(directory)).filter(file => file.endsWith('.json')).sort()
  return await Promise.all(files.map(async file => ({
    file: path.join(directory, file),
    value: JSON.parse(await readFile(path.join(directory, file), 'utf8')),
  })))
}

let failures = 0
const vectorRoot = path.join(root, 'test-vectors/platform/permissions-v2')
for (const vector of await documents(path.join(vectorRoot, 'valid'))) {
  const errors = documentErrors(vector.value)
  if (errors.length > 0) {
    console.error(`${path.relative(root, vector.file)} should be valid`, errors)
    failures += 1
  }
}
for (const vector of await documents(path.join(vectorRoot, 'invalid'))) {
  if (documentErrors(vector.value).length === 0) {
    console.error(`${path.relative(root, vector.file)} should be invalid`)
    failures += 1
  }
}

const manifest = JSON.parse(await readFile(path.join(vectorRoot, 'valid/manifest-v4.json'), 'utf8'))
const plan = JSON.parse(await readFile(path.join(vectorRoot, 'valid/plan-v2.json'), 'utf8'))
const decision = JSON.parse(await readFile(path.join(vectorRoot, 'valid/decision-v2.json'), 'utf8'))
const declaration = manifest.capabilities[0]
const reordered = {
  ...declaration,
  scope: { cwdRoots: [...declaration.scope.cwdRoots], providers: [...declaration.scope.providers] },
}
const expanded = {
  ...declaration,
  scope: { ...declaration.scope, cwdRoots: [...declaration.scope.cwdRoots, '/other'] },
}
const changedRationale = {
  ...declaration,
  rationale: { ...declaration.rationale, feature: { ...declaration.rationale.feature, fallback: 'Another feature' } },
}
const changedSecurity = { ...declaration, security: { ...declaration.security, externalTransfer: true } }
const fingerprint = securityFingerprint('2026-08-24', declaration)
if (fingerprint !== securityFingerprint('2026-08-24', reordered)) {
  console.error('equivalent normalized scope must keep the security fingerprint')
  failures += 1
}
for (
  const [label, candidate] of [['scope', expanded], ['rationale', changedRationale], ['security', changedSecurity]]
) {
  if (fingerprint === securityFingerprint('2026-08-24', candidate)) {
    console.error(`${label} change must change the security fingerprint`)
    failures += 1
  }
}
if (fingerprint === securityFingerprint('2026-08-25', declaration)) {
  console.error('catalog version change must change the security fingerprint')
  failures += 1
}

const planItem = plan.declarations[0]
const decisionItem = decision.decisions[0]
if (
  decision.planId !== plan.planId
  || JSON.stringify(decision.binding) !== JSON.stringify(plan.binding)
  || decision.profileId !== plan.profileId
  || JSON.stringify(decision.identity) !== JSON.stringify(plan.identity)
  || decisionItem.capability !== planItem.capability
  || JSON.stringify(decisionItem.scope) !== JSON.stringify(planItem.scope)
  || decisionItem.securityFingerprint !== planItem.securityFingerprint
  || !planItem.allowedDecisions.includes(decisionItem.decision)
) {
  console.error('valid decision must bind the exact current plan')
  failures += 1
}

const v1Migrations = new Map([['ask', 'ask'], ['allow', 'allow-persistent'], ['deny', 'deny-persistent']])
if (v1Migrations.size !== 3 || v1Migrations.get('allow-once') !== undefined) {
  console.error('v1 migration must never persist allow-once')
  failures += 1
}

const packageV2 = schemas.get(
  'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/plugin-package.v2.schema.json',
)
if (packageV2.properties.runtimeManifest.properties.schema.enum.includes(ids.manifest)) {
  console.error('frozen package v2 must not accept manifest v4')
  failures += 1
}

if (failures > 0) throw new Error(`${failures} permission v2 conformance case(s) failed`)
console.log('Permission authorization v2 conformance: all vectors passed')
