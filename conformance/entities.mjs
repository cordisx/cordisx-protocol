import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const schemaNames = [
  'ui-common.v1.schema.json',
  'session-common.v1.schema.json',
  'session-event.v1.schema.json',
  'agent-loop-common.v1.schema.json',
  'agents-common.v1.schema.json',
  'agent-avatar.v1.schema.json',
  'platform-model.v1.schema.json',
  'agent-definition.v1.schema.json',
  'agent-acquire-request.v1.schema.json',
  'plugin-lifecycle-common.v1.schema.json',
  'entity-common.v1.schema.json',
  'entity-file.v1.schema.json',
  'entity-session-definition-binding.v1.schema.json',
  'entity-template-declaration.v1.schema.json',
  'entity-registry-snapshot.v1.schema.json',
  'entity-registry-request.v1.schema.json',
  'entity-registry-result.v1.schema.json',
  'entity-registry-change-page.v1.schema.json',
  'entity-registry-subscription-close.v1.schema.json',
  'entity-template-materialization-result.v1.schema.json',
  'entity-agent-acquire-request.v1.schema.json',
  'entity-agent-acquire-result.v1.schema.json',
  'plugin-package.v5.schema.json',
]
const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true })
addFormats(ajv)
const schemas = new Map()
for (const name of schemaNames) {
  const schema = JSON.parse(await readFile(path.join(root, 'schemas', name), 'utf8'))
  schemas.set(name, schema)
  ajv.addSchema(schema)
}
const validator = name => {
  const validate = ajv.getSchema(schemas.get(name).$id)
  assert.ok(validate, `${name} must compile under strict AJV`)
  return validate
}
const validators = Object.fromEntries(schemaNames.filter(name => name.startsWith('entity-') || name === 'plugin-package.v5.schema.json' || name === 'agent-acquire-request.v1.schema.json' || name === 'agent-definition.v1.schema.json' || name === 'session-event.v1.schema.json').map(name => [name, validator(name)]))
const errors = (validate, value) => validate(value) ? [] : (validate.errors ?? []).map(error => `${error.instancePath || '/'} ${error.message}`)

const digestVector = JSON.parse(await readFile(path.join(root, 'test-vectors/entities/v1/digest.json'), 'utf8'))

export function entityTreeDigest(files) {
  const chunks = [Buffer.from('cordisx.entity-tree/v1\0', 'utf8')]
  const ordered = [...files].sort((left, right) => Buffer.from(left.path, 'utf8').compare(Buffer.from(right.path, 'utf8')))
  for (const file of ordered) {
    const pathBytes = Buffer.from(file.path, 'utf8')
    const contentBytes = Buffer.from(file.content, 'utf8')
    const pathLength = Buffer.alloc(4)
    pathLength.writeUInt32BE(pathBytes.length)
    const contentLength = Buffer.alloc(8)
    contentLength.writeBigUInt64BE(BigInt(contentBytes.length))
    chunks.push(pathLength, pathBytes, contentLength, contentBytes)
  }
  return `sha256:${createHash('sha256').update(Buffer.concat(chunks)).digest('hex')}`
}

assert.equal(entityTreeDigest(digestVector.files), digestVector.expectedDigest)
assert.equal(entityTreeDigest([...digestVector.files].reverse()), digestVector.expectedDigest, 'digest order must be canonical')
assert.notEqual(entityTreeDigest(digestVector.files.map(file => file.path === 'prompts/role.md' ? { ...file, content: `${file.content}changed` } : file)), digestVector.expectedDigest)

const entityFile = JSON.parse(digestVector.files.find(file => file.path === 'entity.json').content)
assert.deepEqual(errors(validators['entity-file.v1.schema.json'], entityFile), [])
assert.equal('identity' in entityFile, false)
assert.equal('revision' in entityFile, false)
assert.equal('expectedDigest' in entityFile, false)

export function compileEntity(file, promptFiles, digest) {
  const promptByPath = new Map(promptFiles.map(prompt => [prompt.path, prompt.text]))
  const promptSections = file.promptSections?.map(section => ({
    sectionId: section.sectionId,
    kind: section.kind,
    text: section.source.kind === 'inline' ? section.source.text : promptByPath.get(section.source.path),
  }))
  if (promptSections?.some(section => typeof section.text !== 'string')) throw new Error('missing-prompt-file')
  const { $schema: _schema, contract: _contract, schemaVersion: _version, agentId, promptSections: _sections, ...fields } = file
  return {
    $schema: schemas.get('agent-definition.v1.schema.json').$id,
    contract: 'cordisx.agent-definition/v1',
    schemaVersion: 1,
    identity: { agentId, revision: digest },
    ...fields,
    ...(promptSections ? { promptSections } : {}),
  }
}

const promptFiles = [{ path: './prompts/role.md', text: digestVector.files.find(file => file.path === 'prompts/role.md').content }]
export function promptFileSetErrors(file, files) {
  const referenced = new Set((file.promptSections ?? []).flatMap(section => section.source.kind === 'markdown' ? [section.source.path] : []))
  const provided = new Set()
  const issues = []
  for (const prompt of files) {
    if (provided.has(prompt.path)) issues.push('duplicate-prompt-file')
    provided.add(prompt.path)
    if (!referenced.has(prompt.path)) issues.push('unexpected-prompt-file')
  }
  for (const promptPath of referenced) if (!provided.has(promptPath)) issues.push('missing-prompt-file')
  return issues
}
assert.deepEqual(promptFileSetErrors(entityFile, promptFiles), [])
assert.ok(promptFileSetErrors(entityFile, []).includes('missing-prompt-file'))
assert.ok(promptFileSetErrors(entityFile, [...promptFiles, { path: './prompts/extra.md', text: 'extra' }]).includes('unexpected-prompt-file'))
assert.ok(promptFileSetErrors(entityFile, [...promptFiles, ...promptFiles]).includes('duplicate-prompt-file'))
const definition = compileEntity(entityFile, promptFiles, digestVector.expectedDigest)
assert.deepEqual(errors(validators['agent-definition.v1.schema.json'], definition), [])
assert.deepEqual(definition.identity, { agentId: entityFile.agentId, revision: digestVector.expectedDigest })
assert.equal(definition.promptSections[0].text, promptFiles[0].text)

for (const invalidPath of ['/tmp/role.md', '../role.md', './prompts/../role.md', 'https://example.test/role.md', './prompts/role.markdown']) {
  const invalid = structuredClone(entityFile)
  invalid.promptSections[0].source.path = invalidPath
  assert.notDeepEqual(errors(validators['entity-file.v1.schema.json'], invalid), [], `${invalidPath} must fail closed`)
}
for (const forbidden of ['identity', 'revision', 'digest', 'expectedDigest']) {
  const invalid = { ...entityFile, [forbidden]: forbidden === 'identity' ? { agentId: 'reviewer', revision: digestVector.expectedDigest } : digestVector.expectedDigest }
  assert.notDeepEqual(errors(validators['entity-file.v1.schema.json'], invalid), [], `${forbidden} must not enter editable source`)
}

export function entityPathErrors({ entityRootRealPath, declaredPaths, realPaths }) {
  const issues = []
  const rootPrefix = `${entityRootRealPath.replace(/\/$/u, '')}/`
  for (const declared of declaredPaths) {
    if (!/^\.\/prompts\/[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*\.md$/u.test(declared)) issues.push('invalid-prompt-path')
    const real = realPaths.get(declared)
    if (!real || !real.startsWith(rootPrefix)) issues.push('symlink-escape')
  }
  return issues
}
assert.deepEqual(entityPathErrors({ entityRootRealPath: '/data/profiles/work/entities/reviewer', declaredPaths: ['./prompts/role.md'], realPaths: new Map([['./prompts/role.md', '/data/profiles/work/entities/reviewer/prompts/role.md']]) }), [])
assert.ok(entityPathErrors({ entityRootRealPath: '/data/profiles/work/entities/reviewer', declaredPaths: ['./prompts/role.md'], realPaths: new Map([['./prompts/role.md', '/private/secret.md']]) }).includes('symlink-escape'))

export function templatePathErrors(packageRootRealPath, declaration, entityFileRealPath) {
  const issues = []
  if (!/^\.\/entities\/[A-Za-z0-9][A-Za-z0-9._-]{0,127}\/entity\.json$/u.test(declaration.entityPath)) issues.push('template-path-invalid')
  if (!entityFileRealPath.startsWith(`${packageRootRealPath.replace(/\/$/u, '')}/`)) issues.push('symlink-escape')
  return issues
}
assert.deepEqual(templatePathErrors('/packages/chatroom', { entityPath: './entities/reviewer/entity.json' }, '/packages/chatroom/entities/reviewer/entity.json'), [])
assert.ok(templatePathErrors('/packages/chatroom', { entityPath: './entities/reviewer/entity.json' }, '/private/entity.json').includes('symlink-escape'))

const binding = { profileId: 'work', installationId: 'install-chatroom-1', pluginId: 'chatroom', pluginGeneration: 3 }
const owner = { profileId: binding.profileId, installationId: binding.installationId, pluginId: binding.pluginId }
const record = { identity: definition.identity, digest: digestVector.expectedDigest, definition, owner, access: 'owned', origin: 'local' }
assert.equal(record.identity.revision, record.digest)
assert.equal(record.definition.identity.revision, record.digest)

const persistedBinding = { source: 'entity-registry', owner, resolution: { identity: record.identity, digest: record.digest, definition: record.definition } }
assert.deepEqual(errors(validators['entity-session-definition-binding.v1.schema.json'], persistedBinding), [])
const definitionBoundEvent = {
  $schema: schemas.get('session-event.v1.schema.json').$id,
  contract: 'cordisx.session-event/v1',
  schemaVersion: 1,
  sessionId: 'session-reviewer-a',
  seq: 0,
  time: 1,
  type: 'entity/definition-bound',
  data: persistedBinding,
  ignorable: true,
}
assert.deepEqual(errors(validators['session-event.v1.schema.json'], definitionBoundEvent), [])
assert.deepEqual(structuredClone(definitionBoundEvent), definitionBoundEvent)

const snapshot = {
  $schema: schemas.get('entity-registry-snapshot.v1.schema.json').$id,
  contract: 'cordisx.entity-registry-snapshot/v1',
  schemaVersion: 1,
  binding,
  registryRevision: 4,
  entities: [record],
}
assert.deepEqual(errors(validators['entity-registry-snapshot.v1.schema.json'], snapshot), [])
assert.deepEqual(structuredClone(snapshot), snapshot)
assert.equal(JSON.stringify(snapshot).includes('/data/'), false, 'public records never expose a data root')

export function visibleEntities(currentBinding, records, shares = new Set()) {
  return records.filter(candidate => {
    if (candidate.owner.profileId !== currentBinding.profileId) return false
    const own = candidate.owner.installationId === currentBinding.installationId && candidate.owner.pluginId === currentBinding.pluginId
    const shareKey = [currentBinding.profileId, currentBinding.installationId, currentBinding.pluginId, candidate.owner.installationId, candidate.owner.pluginId, candidate.identity.agentId].join('\0')
    return own || shares.has(shareKey)
  })
}
const foreign = { ...record, identity: { agentId: 'foreign', revision: record.digest }, definition: { ...definition, identity: { agentId: 'foreign', revision: record.digest } }, owner: { profileId: 'work', installationId: 'install-other-1', pluginId: 'other' }, access: 'shared-read' }
const otherProfile = { ...foreign, owner: { ...foreign.owner, profileId: 'personal' } }
assert.deepEqual(visibleEntities(binding, [record, foreign, otherProfile]).map(value => value.identity.agentId), ['reviewer'])
const share = [binding.profileId, binding.installationId, binding.pluginId, foreign.owner.installationId, foreign.owner.pluginId, foreign.identity.agentId].join('\0')
assert.deepEqual(visibleEntities(binding, [record, foreign, otherProfile], new Set([share])).map(value => value.identity.agentId), ['reviewer', 'foreign'])

const saveRequest = {
  $schema: schemas.get('entity-registry-request.v1.schema.json').$id,
  contract: 'cordisx.entity-registry-request/v1',
  schemaVersion: 1,
  operation: 'save',
  mutationId: 'save-reviewer-1',
  expectedRevision: record.digest,
  entity: entityFile,
  promptFiles,
}
assert.deepEqual(errors(validators['entity-registry-request.v1.schema.json'], saveRequest), [])
for (const field of ['profileId', 'installationId', 'pluginId', 'root', 'path', 'owner']) {
  assert.notDeepEqual(errors(validators['entity-registry-request.v1.schema.json'], { ...saveRequest, [field]: 'forbidden' }), [], `${field} must not be caller-selected`)
}
const applied = {
  $schema: schemas.get('entity-registry-result.v1.schema.json').$id,
  contract: 'cordisx.entity-registry-result/v1',
  schemaVersion: 1,
  operation: 'save',
  status: 'applied',
  disposition: 'updated',
  entity: record,
}
assert.deepEqual(errors(validators['entity-registry-result.v1.schema.json'], applied), [])
for (const code of ['sharing-authorization-required', 'quota-authorization-required']) {
  const rejected = { ...applied, status: 'rejected', code }
  delete rejected.disposition
  delete rejected.entity
  assert.deepEqual(errors(validators['entity-registry-result.v1.schema.json'], rejected), [])
}

const declaration = { agentId: 'reviewer', entityPath: './entities/reviewer/entity.json', digest: record.digest }
assert.deepEqual(errors(validators['entity-template-declaration.v1.schema.json'], declaration), [])
for (const entityPath of ['/entities/reviewer/entity.json', '../reviewer/entity.json', './entities/reviewer/../entity.json']) {
  assert.notDeepEqual(errors(validators['entity-template-declaration.v1.schema.json'], { ...declaration, entityPath }), [])
}
const packageManifest = {
  $schema: schemas.get('plugin-package.v5.schema.json').$id,
  schemaVersion: 5,
  id: 'chatroom',
  version: '1.0.0',
  entry: './dist/index.js',
  distribution: { mode: 'explicit-local-v1', signature: 'unsupported' },
  compatibility: { runtimeAbi: 1, protocolSchemas: [schemas.get('entity-file.v1.schema.json').$id] },
  dependencies: [],
  runtimeManifest: { path: './runtime/manifest.json', schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/plugin-manifest.v5.schema.json', digest: `sha256:${'1'.repeat(64)}` },
  entityTemplates: [declaration],
}
assert.deepEqual(errors(validators['plugin-package.v5.schema.json'], packageManifest), [])

export function templateDeclarationErrors(manifest) {
  const issues = []
  const agentIds = new Set()
  const schemaId = schemas.get('entity-file.v1.schema.json').$id
  if ((manifest.entityTemplates?.length ?? 0) > 0 && !manifest.compatibility.protocolSchemas.includes(schemaId)) issues.push('entity schema missing from compatibility')
  for (const template of manifest.entityTemplates ?? []) {
    if (agentIds.has(template.agentId)) issues.push('duplicate template agent id')
    agentIds.add(template.agentId)
    const expectedPath = `./entities/${template.agentId}/entity.json`
    if (template.entityPath !== expectedPath) issues.push('template agent/path mismatch')
  }
  return issues
}
assert.deepEqual(templateDeclarationErrors(packageManifest), [])
assert.ok(templateDeclarationErrors({ ...packageManifest, entityTemplates: [{ ...declaration, agentId: 'writer' }] }).length > 0)
assert.ok(templateDeclarationErrors({ ...packageManifest, entityTemplates: [declaration, { ...declaration, digest: `sha256:${'9'.repeat(64)}` }] }).includes('duplicate template agent id'))

export function materializeTemplate(store, template) {
  if (store.has(template.agentId)) return { status: 'preserved', code: 'entity-present' }
  store.set(template.agentId, structuredClone(template.payload))
  return { status: 'materialized', code: 'created' }
}
const localStore = new Map()
const template = { agentId: 'reviewer', payload: { entity: entityFile, promptFiles } }
assert.deepEqual(materializeTemplate(localStore, template), { status: 'materialized', code: 'created' })
localStore.get('reviewer').entity.name = 'User edited reviewer'
assert.deepEqual(materializeTemplate(localStore, { ...template, payload: { entity: { ...entityFile, name: 'Package update' }, promptFiles } }), { status: 'preserved', code: 'entity-present' })
assert.equal(localStore.get('reviewer').entity.name, 'User edited reviewer', 'package update must not overwrite local edits')

const subscription = { subscriptionId: 'entity-sub-1', binding, afterRevision: 4, replayThrough: 6 }
const page = {
  $schema: schemas.get('entity-registry-change-page.v1.schema.json').$id,
  contract: 'cordisx.entity-registry-change-page/v1',
  schemaVersion: 1,
  subscription,
  phase: 'replay',
  changes: [{ kind: 'entity-updated', sequence: 5, entity: record }, { kind: 'entity-removed', sequence: 6, identity: record.identity, owner }],
  nextRevision: 6,
  hasMore: false,
}
assert.deepEqual(errors(validators['entity-registry-change-page.v1.schema.json'], page), [])
assert.deepEqual(structuredClone(page), page)

const close = code => ({
  $schema: schemas.get('entity-registry-subscription-close.v1.schema.json').$id,
  contract: 'cordisx.entity-registry-subscription-close/v1',
  schemaVersion: 1,
  subscriptionId: subscription.subscriptionId,
  binding,
  status: 'closed',
  code,
})
for (const code of ['unsubscribed', 'registry-disposed', 'plugin-generation-replaced', 'permission-revoked', 'connection-replaced', 'observer-failed']) assert.deepEqual(errors(validators['entity-registry-subscription-close.v1.schema.json'], close(code)), [])
assert.notDeepEqual(errors(validators['entity-registry-subscription-close.v1.schema.json'], close('silent')), [])

export function subscriptionLifecycleErrors(deliveries) {
  const issues = []
  let closed = false
  for (const delivery of deliveries) {
    if (delivery.kind === 'closed') {
      if (closed) issues.push('second terminal close')
      closed = true
    } else if (closed) issues.push('page after terminal close')
  }
  return issues
}
assert.deepEqual(subscriptionLifecycleErrors([{ kind: 'page', value: page }, { kind: 'closed', value: close('unsubscribed') }]), [])
assert.ok(subscriptionLifecycleErrors([{ kind: 'closed', value: close('connection-replaced') }, { kind: 'page', value: page }]).length > 0)

const acquireRequest = {
  $schema: schemas.get('entity-agent-acquire-request.v1.schema.json').$id,
  contract: 'cordisx.entity-agent-acquire-request/v1',
  schemaVersion: 1,
  type: 'create',
  mutationId: 'create-reviewer-1',
  definition: record.identity,
}
assert.deepEqual(errors(validators['entity-agent-acquire-request.v1.schema.json'], acquireRequest), [])
assert.notDeepEqual(errors(validators['entity-agent-acquire-request.v1.schema.json'], { ...acquireRequest, definition: { ...record.identity, revision: `sha256:${'2'.repeat(64)}` }, setup: { definition: record.identity, definitions: [definition] } }), [])
const acquireResult = {
  $schema: schemas.get('entity-agent-acquire-result.v1.schema.json').$id,
  contract: 'cordisx.entity-agent-acquire-result/v1',
  schemaVersion: 1,
  operation: 'create',
  mutationId: acquireRequest.mutationId,
  status: 'accepted',
  sessionId: 'session-reviewer-1',
  agentGeneration: 1,
  sessionGeneration: 1,
  owner: { pluginId: binding.pluginId, generation: binding.pluginGeneration },
  sessionIdSource: 'host',
  disposition: 'created',
  definitionResolution: { identity: record.identity, digest: record.digest, definition: record.definition },
  definitionSource: 'registry-current',
}
assert.deepEqual(errors(validators['entity-agent-acquire-result.v1.schema.json'], acquireResult), [])
assert.deepEqual(structuredClone(acquireResult), acquireResult)
const resumeRequest = {
  $schema: schemas.get('entity-agent-acquire-request.v1.schema.json').$id,
  contract: 'cordisx.entity-agent-acquire-request/v1',
  schemaVersion: 1,
  type: 'resume',
  sessionId: definitionBoundEvent.sessionId,
}
assert.deepEqual(errors(validators['entity-agent-acquire-request.v1.schema.json'], resumeRequest), [], 'entity-backed resume does not require a mutable local identity')
const resumeResult = { ...acquireResult, operation: 'resume', status: 'accepted', sessionId: resumeRequest.sessionId, disposition: 'resumed', definitionSource: 'session-persisted' }
assert.deepEqual(errors(validators['entity-agent-acquire-result.v1.schema.json'], resumeResult), [])
const invalidResumeMissingLocal = { $schema: acquireResult.$schema, contract: acquireResult.contract, schemaVersion: 1, operation: 'resume', status: 'unavailable', code: 'entity-not-found' }
assert.notDeepEqual(errors(validators['entity-agent-acquire-result.v1.schema.json'], invalidResumeMissingLocal), [], 'resume cannot report entity-not-found merely because local source disappeared')

export function resolveCreate(request, records) {
  const candidate = records.find(value => value.identity.agentId === request.definition.agentId)
  if (!candidate) return { status: 'unavailable', code: 'entity-not-found' }
  if (candidate.identity.revision !== request.definition.revision || candidate.digest !== request.definition.revision) return { status: 'unavailable', code: 'entity-revision-stale' }
  if (candidate.definition.identity.revision !== candidate.digest) return { status: 'unavailable', code: 'entity-invalid' }
  return { status: 'accepted', definitionResolution: { identity: candidate.identity, digest: candidate.digest, definition: candidate.definition } }
}
assert.equal(resolveCreate(acquireRequest, [record]).status, 'accepted')
assert.deepEqual(resolveCreate({ ...acquireRequest, definition: { ...record.identity, revision: `sha256:${'2'.repeat(64)}` } }, [record]), { status: 'unavailable', code: 'entity-revision-stale' })

export function resolveResume(request, persistedBySession) {
  const persisted = persistedBySession.get(request.sessionId)
  if (!persisted) return { status: 'unavailable', code: 'session-unavailable' }
  if (request.definition && (request.definition.agentId !== persisted.resolution.identity.agentId || request.definition.revision !== persisted.resolution.identity.revision)) return { status: 'unavailable', code: 'entity-revision-stale' }
  return { status: 'accepted', definitionSource: 'session-persisted', definitionResolution: persisted.resolution }
}
const revisionB = `sha256:${'b'.repeat(64)}`
const recordB = { ...record, identity: { agentId: record.identity.agentId, revision: revisionB }, digest: revisionB, definition: { ...record.definition, identity: { agentId: record.identity.agentId, revision: revisionB }, name: 'Reviewer B' } }
const persistedBySession = new Map([[definitionBoundEvent.sessionId, persistedBinding]])
assert.equal(resolveCreate({ ...acquireRequest, definition: record.identity }, [recordB]).code, 'entity-revision-stale', 'new create cannot use old A after local edit to B')
assert.equal(resolveCreate({ ...acquireRequest, definition: recordB.identity }, [recordB]).status, 'accepted', 'new create uses current B')
assert.equal(resolveCreate(acquireRequest, []).code, 'entity-not-found', 'new create cannot use removed local A')
assert.deepEqual(resolveResume({ type: 'resume', sessionId: definitionBoundEvent.sessionId }, persistedBySession), { status: 'accepted', definitionSource: 'session-persisted', definitionResolution: persistedBinding.resolution }, 'resume succeeds as A after local edit to B')
assert.equal(resolveResume({ type: 'resume', sessionId: definitionBoundEvent.sessionId, definition: record.identity }, persistedBySession).status, 'accepted')
assert.equal(resolveResume({ type: 'resume', sessionId: definitionBoundEvent.sessionId, definition: recordB.identity }, persistedBySession).code, 'entity-revision-stale', 'resume never silently switches to B')
assert.equal(resolveResume({ type: 'resume', sessionId: definitionBoundEvent.sessionId }, persistedBySession).status, 'accepted', 'resume succeeds as A after local entity removal')

const inlineSetupRequest = {
  $schema: schemas.get('agent-acquire-request.v1.schema.json').$id,
  contract: 'cordisx.agent-acquire-request/v1',
  schemaVersion: 1,
  type: 'create',
  setup: { definition: definition.identity, definitions: [definition] },
}
assert.deepEqual(errors(validators['agent-acquire-request.v1.schema.json'], inlineSetupRequest), [], 'frozen inline AgentSetup remains valid')

console.log('Entities v1 conformance: local editable source, deterministic digest, scoped registry, template no-overwrite, exact Agent resolution, and closure fences passed')
