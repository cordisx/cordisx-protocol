import type { AgentCreateOptions, AgentDefinition, AgentRegistry } from './agents.v1.js'
import type {
  EntityAgentAcquireResult,
  EntityAgentCreateOptions,
  EntityBackedAgentRegistry,
  EntityDefinitionBoundSessionEvent,
  EntityFile,
  EntityRegistry,
  EntitySaveRequest,
  EntityTemplateDeclaration,
} from './entities.v1.js'

const digest = `sha256:${'1'.repeat(64)}` as const
const entity = {
  $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/entity-file.v1.schema.json',
  contract: 'cordisx.entity-file/v1',
  schemaVersion: 1,
  agentId: 'reviewer',
  name: 'Reviewer',
  inherit: {
    promptSections: 'append',
    rules: 'append',
    skills: 'append',
    tools: 'merge',
    mcpServers: 'merge',
    runtimeDefaults: 'merge',
  },
  promptSections: [{ sectionId: 'role', kind: 'role', source: { kind: 'markdown', path: './prompts/role.md' } }],
} satisfies EntityFile

const save = {
  mutationId: 'save-reviewer-1',
  expectedRevision: digest,
  entity,
  promptFiles: [{ path: './prompts/role.md', text: 'Review changes carefully.\n' }],
} satisfies EntitySaveRequest
save.expectedRevision satisfies `sha256:${string}` | null

const template = {
  agentId: 'reviewer',
  entityPath: './entities/reviewer/entity.json',
  digest,
} satisfies EntityTemplateDeclaration
template.entityPath satisfies `./entities/${string}/entity.json`

declare const registry: EntityRegistry
registry.get({ agentId: entity.agentId, revision: digest }).then(result => {
  if (result.status === 'found') result.entity.definition satisfies AgentDefinition
})
registry.save(save)
registry.subscribe(0).then(result => {
  if (result.status === 'subscribed') {
    result.subscription.closed.then(closed => closed.status satisfies 'closed')
    result.subscription.unsubscribe().then(closed => closed.code satisfies 'unsubscribed' | 'registry-disposed' | 'plugin-generation-replaced' | 'permission-revoked' | 'connection-replaced' | 'observer-failed')
  }
})

declare const agents: EntityBackedAgentRegistry
const entityCreate = { definition: { agentId: entity.agentId, revision: digest }, mutationId: 'create-reviewer-1' } satisfies EntityAgentCreateOptions
agents.create(entityCreate).then(result => {
  if (result.status === 'accepted') {
    result.definitionResolution.digest satisfies `sha256:${string}`
    result.definitionResolution.identity.revision satisfies string
    result.definitionSource satisfies 'registry-current' | 'session-persisted'
  }
})
agents.resume({ sessionId: 'session-reviewer-a', definitionSource: 'session-persisted' }).then(result => {
  if (result.status === 'accepted') result.definitionSource satisfies 'session-persisted' | 'registry-current'
})

declare const boundEvent: EntityDefinitionBoundSessionEvent
boundEvent.type satisfies 'entity/definition-bound'
boundEvent.data.resolution.digest satisfies `sha256:${string}`

const inline: AgentCreateOptions = {
  setup: {
    definition: { agentId: 'inline', revision: '1' },
    definitions: [{
      $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/agent-definition.v1.schema.json',
      contract: 'cordisx.agent-definition/v1',
      schemaVersion: 1,
      identity: { agentId: 'inline', revision: '1' },
      inherit: { promptSections: 'append', rules: 'append', skills: 'append', tools: 'merge', mcpServers: 'merge', runtimeDefaults: 'merge' },
    }],
  },
}
agents.create(inline).then(result => result satisfies Awaited<ReturnType<AgentRegistry['create']>>)

// @ts-expect-error editable entity files never contain a computed identity
const selfReferentialIdentity: EntityFile = { ...entity, identity: { agentId: 'reviewer', revision: digest } }
// @ts-expect-error editable entity files never contain a computed revision
const selfReferentialRevision: EntityFile = { ...entity, revision: digest }
// @ts-expect-error registry-backed create and inline setup are mutually exclusive
const mixedAcquire: EntityAgentCreateOptions = { definition: { agentId: 'reviewer', revision: digest }, setup: inline.setup }
// @ts-expect-error entity-backed resume is explicit and cannot capture a legacy no-setup resume
agents.resume({ sessionId: 'session-reviewer-a', definition: { agentId: 'reviewer', revision: digest } } satisfies Omit<import('./agents.v1.js').AgentResumeOptions, 'setup'>)
// @ts-expect-error public Registry methods do not accept an arbitrary root/path
registry.get({ agentId: 'reviewer', revision: digest }, '/tmp/entities')
declare const acquire: EntityAgentAcquireResult
void [selfReferentialIdentity, selfReferentialRevision, mixedAcquire, acquire]
