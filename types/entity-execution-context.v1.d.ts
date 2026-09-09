import type { AgentDefinitionIdentity } from './agents.v1.js'
import type { AgentTaskContext } from './agent-task.v1.js'

/** A durable Entity default, separate from immutable definition bytes and existing Sessions. */
export type EntityExecutionBinding =
  | { readonly kind: 'projectless' }
  | { readonly kind: 'project'; readonly projectId: string; readonly cwd?: string }

export interface EntityExecutionBindingSnapshot {
  readonly revision: number
  readonly binding: EntityExecutionBinding
}
export type EntityExecutionContextFailure =
  | 'invalid-input' | 'entity-unavailable' | 'project-unavailable'
  | 'host-unavailable' | 'unsupported' | 'operation-conflict'
export type EntityExecutionBindingResult =
  | ({ readonly status: 'available' } & EntityExecutionBindingSnapshot)
  | { readonly status: 'unavailable'; readonly code: EntityExecutionContextFailure }
export interface EntityExecutionBindingWrite {
  readonly identity: AgentDefinitionIdentity
  readonly expectedRevision: number
  readonly mutationId: string
  readonly binding: EntityExecutionBinding
}
export type EntityExecutionBindingWriteResult =
  | ({ readonly status: 'applied'; readonly disposition: 'created' | 'updated' | 'replayed' } & EntityExecutionBindingSnapshot)
  | { readonly status: 'conflict'; readonly currentRevision: number }
  | { readonly status: 'unavailable'; readonly code: EntityExecutionContextFailure }
export interface EntityExecutionContextRequest {
  readonly identity: AgentDefinitionIdentity
  /** The product's retained new-task operation; retry keeps the same workspace. */
  readonly operationId: string
}
export type EntityExecutionContextResult =
  | { readonly status: 'resolved'; readonly binding: EntityExecutionBinding; readonly context: Exclude<AgentTaskContext, { readonly kind: 'inherit' }> }
  | { readonly status: 'unavailable'; readonly code: EntityExecutionContextFailure }
export interface HostExecutionProject {
  readonly id: string
  readonly name: string
  /** Actual ordered roots returned by the Host project authority. First is the default root. */
  readonly roots: readonly string[]
}
export type HostExecutionProjectsResult =
  | { readonly status: 'available'; readonly projects: readonly HostExecutionProject[] }
  | { readonly status: 'unavailable'; readonly code: 'host-unavailable' | 'unsupported' }

/** Optional, active-owner-bound service. Absence never authorizes a guessed cwd. */
export interface EntityExecutionContexts {
  get(identity: AgentDefinitionIdentity): Promise<EntityExecutionBindingResult>
  set(request: EntityExecutionBindingWrite): Promise<EntityExecutionBindingWriteResult>
  resolve(request: EntityExecutionContextRequest): Promise<EntityExecutionContextResult>
  projects(): Promise<HostExecutionProjectsResult>
}
