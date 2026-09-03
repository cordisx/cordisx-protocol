import type {
  AgentAcquireResult,
  AgentCreateOptions,
  AgentDefinition,
  AgentDefinitionIdentity,
  AgentDetailReference,
  AgentHandle,
  AgentOptions,
  AgentRegistry,
  AgentResumeOptions,
} from './agents.v1.js'
import type { AgentAvatarRef } from './agent-avatar.v1.js'
import type { PluginOwnerIdentity, SessionEvent, SessionId } from './sessions.v1.js'

export type EntityDigest = `sha256:${string}`
export type EntityRevision = EntityDigest
export type EntityMarkdownPath = `./prompts/${string}.md`
export type EntityTemplatePath = `./entities/${string}/entity.json`

export interface EntityRegistryBinding {
  readonly profileId: string
  readonly installationId: string
  readonly pluginId: string
  readonly pluginGeneration: number
}

export interface EntityOwnerScope {
  readonly profileId: string
  readonly installationId: string
  readonly pluginId: string
}

export type EntityPromptKind = 'introduction' | 'personality' | 'role' | 'operations' | 'tools' | 'knowledge' | 'memory-policy' | 'memory' | 'other'
export type EntityPromptSource =
  | { readonly kind: 'inline'; readonly text: string }
  | { readonly kind: 'markdown'; readonly path: EntityMarkdownPath }

export interface EntityPromptSection {
  readonly sectionId: string
  readonly kind: EntityPromptKind
  readonly source: EntityPromptSource
}

/**
 * The editable on-disk document. Revision is intentionally absent because it
 * is the digest of this document plus every referenced Markdown file.
 */
export interface EntityFile {
  readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/entity-file.v1.schema.json'
  readonly contract: 'cordisx.entity-file/v1'
  readonly schemaVersion: 1
  readonly agentId: string
  readonly name?: string
  readonly description?: string
  readonly avatar?: AgentAvatarRef
  readonly extends?: readonly AgentDefinitionIdentity[]
  readonly inherit: AgentDefinition['inherit']
  readonly promptSections?: readonly EntityPromptSection[]
  readonly rules?: readonly string[]
  readonly skills?: readonly string[]
  readonly tools?: AgentDefinition['tools']
  readonly mcpServers?: AgentDefinition['mcpServers']
  readonly runtimeDefaults?: AgentDefinition['runtimeDefaults']
}

export interface EntityPromptFile {
  readonly path: EntityMarkdownPath
  readonly text: string
}

export interface EntityDefinitionResolution {
  readonly identity: AgentDefinitionIdentity
  readonly digest: EntityDigest
  readonly definition: AgentDefinition
}

/** Persisted once with the Session; resume never re-resolves mutable local files. */
export interface EntitySessionDefinitionBinding {
  readonly source: 'entity-registry'
  readonly owner: EntityOwnerScope
  readonly resolution: EntityDefinitionResolution
}

declare module './sessions.v1.js' {
  interface SessionEventDataMap {
    'entity/definition-bound': EntitySessionDefinitionBinding
  }
}

export type EntityDefinitionBoundSessionEvent = SessionEvent<'entity/definition-bound'> & { readonly ignorable: true }

export interface EntityRecord extends EntityDefinitionResolution {
  readonly owner: EntityOwnerScope
  readonly access: 'owned' | 'shared-read' | 'shared-write'
  readonly origin: 'local' | 'materialized-template'
}

export interface EntityRegistrySnapshot {
  readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/entity-registry-snapshot.v1.schema.json'
  readonly contract: 'cordisx.entity-registry-snapshot/v1'
  readonly schemaVersion: 1
  readonly binding: EntityRegistryBinding
  readonly registryRevision: number
  readonly entities: readonly EntityRecord[]
}

export type EntityGetResult =
  | { readonly status: 'found'; readonly entity: EntityRecord }
  | { readonly status: 'not-found' }
  | { readonly status: 'unavailable'; readonly code: 'host-unavailable' | 'registry-disposed' | 'plugin-generation-replaced' }

export interface EntitySaveRequest {
  readonly mutationId: string
  /** `null` creates only when absent; a digest updates only that exact revision. */
  readonly expectedRevision: EntityRevision | null
  readonly entity: EntityFile
  readonly promptFiles: readonly EntityPromptFile[]
}

export type EntitySaveResult =
  | { readonly status: 'applied'; readonly disposition: 'created' | 'updated' | 'replayed'; readonly entity: EntityRecord }
  | { readonly status: 'conflict'; readonly code: 'mutation-conflict' | 'entity-exists' | 'revision-conflict'; readonly currentRevision?: EntityRevision }
  | { readonly status: 'rejected'; readonly code: 'entity-not-declared' | 'invalid-entity' | 'invalid-prompt-path' | 'missing-prompt-file' | 'unexpected-prompt-file' | 'duplicate-prompt-file' | 'symlink-escape' | 'sharing-authorization-required' | 'quota-authorization-required' }
  | { readonly status: 'unavailable'; readonly code: 'host-unavailable' | 'registry-disposed' | 'plugin-generation-replaced' }

export type EntityChange =
  | { readonly kind: 'entity-added' | 'entity-updated'; readonly sequence: number; readonly entity: EntityRecord }
  | { readonly kind: 'entity-removed'; readonly sequence: number; readonly identity: AgentDefinitionIdentity; readonly owner: EntityOwnerScope }
  | { readonly kind: 'entity-invalidated'; readonly sequence: number; readonly agentId: string; readonly owner: EntityOwnerScope; readonly code: 'invalid-entity' | 'missing-prompt-file' | 'symlink-escape' | 'io-error' }

export interface EntitySubscriptionDescriptor {
  readonly subscriptionId: string
  readonly binding: EntityRegistryBinding
  readonly afterRevision: number
  readonly replayThrough: number
}

export interface EntityChangePage {
  readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/entity-registry-change-page.v1.schema.json'
  readonly contract: 'cordisx.entity-registry-change-page/v1'
  readonly schemaVersion: 1
  readonly subscription: EntitySubscriptionDescriptor
  readonly phase: 'replay' | 'live'
  readonly changes: readonly EntityChange[]
  readonly nextRevision: number
  readonly hasMore: boolean
}

export interface EntitySubscriptionClosed {
  readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/entity-registry-subscription-close.v1.schema.json'
  readonly contract: 'cordisx.entity-registry-subscription-close/v1'
  readonly schemaVersion: 1
  readonly subscriptionId: string
  readonly binding: EntityRegistryBinding
  readonly status: 'closed'
  readonly code: 'unsubscribed' | 'registry-disposed' | 'plugin-generation-replaced' | 'permission-revoked' | 'connection-replaced' | 'observer-failed'
}

declare const entitySubscriptionCapability: unique symbol
declare const entityRegistryCapability: unique symbol

export interface EntitySubscription {
  readonly descriptor: EntitySubscriptionDescriptor
  readonly pages: AsyncIterable<EntityChangePage>
  readonly closed: Promise<EntitySubscriptionClosed>
  readonly [entitySubscriptionCapability]: never
  unsubscribe(): Promise<EntitySubscriptionClosed>
}

export type EntitySubscribeResult =
  | { readonly status: 'subscribed'; readonly subscription: EntitySubscription }
  | { readonly status: 'unavailable'; readonly code: 'host-unavailable' | 'registry-disposed' | 'plugin-generation-replaced' }

/** Host-bound to one plugin installation and profile; no method accepts a root, profile, or owner selector. */
export interface EntityRegistry {
  readonly binding: EntityRegistryBinding
  readonly [entityRegistryCapability]: never
  snapshot(): Promise<EntityRegistrySnapshot>
  get(identity: AgentDefinitionIdentity): Promise<EntityGetResult>
  save(request: EntitySaveRequest): Promise<EntitySaveResult>
  subscribe(afterRevision: number): Promise<EntitySubscribeResult>
}

export interface EntityTemplateDeclaration {
  readonly agentId: string
  readonly entityPath: EntityTemplatePath
  readonly digest: EntityDigest
}

interface EntityTemplateMaterializationResultEnvelope {
  readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/entity-template-materialization-result.v1.schema.json'
  readonly contract: 'cordisx.entity-template-materialization-result/v1'
  readonly schemaVersion: 1
  readonly owner: EntityOwnerScope
  readonly packageVersion: string
  readonly packageDigest: EntityDigest
  readonly agentId: string
}

export type EntityTemplateMaterializationResult = EntityTemplateMaterializationResultEnvelope & (
  | { readonly status: 'materialized'; readonly code: 'created'; readonly entity: EntityRecord }
  | { readonly status: 'preserved'; readonly code: 'entity-present'; readonly entity?: never }
  | { readonly status: 'rejected'; readonly code: 'invalid-template' | 'template-digest-mismatch' | 'template-path-invalid' | 'symlink-escape' | 'ownership-conflict' | 'quota-authorization-required'; readonly entity?: never }
)

export type EntityAgentCreateOptions = Omit<AgentCreateOptions, 'setup'> & {
  readonly definition: AgentDefinitionIdentity
  readonly setup?: never
}

export type EntityAgentResumeOptions = Omit<AgentResumeOptions, 'setup'> & {
  readonly definitionSource: 'session-persisted'
  /** Optional equality fence against the Session-persisted definition. */
  readonly definition?: AgentDefinitionIdentity
  readonly setup?: never
}

type EntityAgentAcquireEnvelope = {
  readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/entity-agent-acquire-result.v1.schema.json'
  readonly contract: 'cordisx.entity-agent-acquire-result/v1'
  readonly schemaVersion: 1
  readonly operation: 'create' | 'resume'
  readonly mutationId?: string
}

type EntityAgentAccepted = {
  readonly status: 'accepted'
  readonly sessionId: SessionId
  readonly agentGeneration: number
  readonly sessionGeneration: number
  readonly owner: PluginOwnerIdentity
  readonly sessionIdSource: 'host' | 'caller'
  readonly disposition: 'created' | 'resumed' | 'replayed'
  readonly details?: AgentDetailReference
  readonly definitionResolution: EntityDefinitionResolution
  readonly handle: AgentHandle
}

export type EntityAgentAcquireResult = EntityAgentAcquireEnvelope & (
  | (EntityAgentAccepted & { readonly operation: 'create'; readonly definitionSource: 'registry-current' })
  | (EntityAgentAccepted & { readonly operation: 'resume'; readonly definitionSource: 'session-persisted' })
  | { readonly status: 'denied'; readonly code: 'permission-denied' }
  | { readonly operation: 'create'; readonly status: 'unavailable'; readonly code: 'runtime-unavailable' | 'session-unavailable' | 'host-unavailable' | 'unsupported' | 'entity-not-found' | 'entity-revision-stale' | 'entity-invalid' }
  | { readonly operation: 'resume'; readonly status: 'unavailable'; readonly code: 'runtime-unavailable' | 'session-unavailable' | 'host-unavailable' | 'unsupported' | 'entity-revision-stale' }
  | { readonly status: 'conflict'; readonly code: 'mutation-conflict' | 'session-already-exists' | 'agent-already-live' | 'setup-conflict' }
)

/**
 * Additive Host surface: old inline AgentSetup calls keep the exact agents/v1
 * overload; registry-backed calls resolve one exact entity revision.
 */
export interface EntityBackedAgentRegistry extends Omit<AgentRegistry, 'create' | 'resume'> {
  create(options: EntityAgentCreateOptions): Promise<EntityAgentAcquireResult>
  create(options: AgentCreateOptions): Promise<AgentAcquireResult>
  resume(options: EntityAgentResumeOptions): Promise<EntityAgentAcquireResult>
  resume(options: AgentResumeOptions): Promise<AgentAcquireResult>
}

interface EntityAgentAcquireRequestEnvelope {
  readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/entity-agent-acquire-request.v1.schema.json'
  readonly contract: 'cordisx.entity-agent-acquire-request/v1'
  readonly schemaVersion: 1
  readonly mutationId?: string
  readonly options?: AgentOptions
}

export type EntityAgentAcquireRequestDocument = EntityAgentAcquireRequestEnvelope & (
  | { readonly type: 'create'; readonly sessionId?: SessionId; readonly definition: AgentDefinitionIdentity }
  | { readonly type: 'resume'; readonly sessionId: SessionId; readonly definition?: AgentDefinitionIdentity }
)

/** Wire-only projection corresponding to EntityAgentAcquireResult. */
export type EntityAgentAcquireResultProjection =
  | (Omit<Extract<EntityAgentAcquireResult, { readonly status: 'accepted' }>, 'handle'>)
  | Exclude<EntityAgentAcquireResult, { readonly status: 'accepted' }>
