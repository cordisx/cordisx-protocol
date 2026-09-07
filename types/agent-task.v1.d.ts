import type { AgentDefinitionIdentity, AgentDetailReference, AgentOptions, AgentStatusObservation } from './agents.v1.js'
import type { JsonValue, MessageId, SessionId } from './sessions.v1.js'

/** A project selector and an execution directory are distinct values. */
export type AgentTaskContext =
  | { readonly kind: 'directory'; readonly cwd: string }
  | { readonly kind: 'project'; readonly projectId: string; readonly cwd?: string }
  | { readonly kind: 'inherit'; readonly sessionId: SessionId }

/** Host-validated context frozen for this new task; never applied during resume. */
export interface AgentTaskResolvedContext {
  readonly cwd: string
  readonly projectId?: string
}

/**
 * Business correlation is prepared before this call. The Host creates the
 * Session, binds this declared command to that Session, then submits the input.
 * No credential, raw native handle, callback or caller identity is accepted.
 */
export interface AgentTaskCreateRequest {
  readonly operationId: string
  readonly definition: AgentDefinitionIdentity
  readonly context: AgentTaskContext
  readonly text: string
  readonly options?: AgentOptions
  readonly tool: { readonly commandId: string; readonly scope: JsonValue }
}

/** One task references one Session and its first admitted message, not a turn. */
export interface AgentTaskReference {
  readonly sessionId: SessionId
  readonly messageId: MessageId
  readonly context: AgentTaskResolvedContext
  readonly detail: AgentDetailReference
}

export type AgentTaskFailureCode =
  | 'invalid-input'
  | 'permission-denied'
  | 'operation-conflict'
  | 'context-required'
  | 'context-unavailable'
  | 'project-unavailable'
  | 'directory-unavailable'
  | 'definition-unavailable'
  | 'tool-unavailable'
  | 'create-failed'
  | 'submit-failed'
  | 'reconciliation-required'
  | 'host-unavailable'
  | 'unsupported'

export type AgentTaskCreateResult =
  | {
      readonly status: 'accepted'
      readonly operationId: string
      readonly disposition: 'created' | 'replayed'
      readonly task: AgentTaskReference
    }
  | {
      readonly status: 'unavailable'
      readonly operationId: string
      readonly code: AgentTaskFailureCode
      /** A known partial Session is retained and queryable, never abandoned. */
      readonly sessionId?: SessionId
    }

export type AgentTaskQueryResult =
  | {
      readonly status: 'found'
      readonly result: AgentTaskCreateResult
      /** Runtime authority only. Agent-authored reports cannot change this. */
      readonly execution: AgentStatusObservation
    }
  | { readonly status: 'not-found' }
  | { readonly status: 'unavailable'; readonly code: 'permission-denied' | 'host-unavailable' }

export interface AgentTaskQueryRequest {
  readonly operationId: string
}

/** Optional, owner-bound service; absent service means unsupported. */
export interface AgentTasks {
  createAndSubmit(request: AgentTaskCreateRequest): Promise<AgentTaskCreateResult>
  query(request: AgentTaskQueryRequest): Promise<AgentTaskQueryResult>
}
