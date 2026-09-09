import type { EntityExecutionContexts as EntityExecutionContextsV1, EntityExecutionContextRequest, EntityExecutionContextResult } from './entity-execution-context.v1.js'
export * from './entity-execution-context.v1.js'
/** A per-operation projectless intent never changes an Entity's persistent default. */
export interface EntityExecutionContexts extends EntityExecutionContextsV1 {
  projectless(request: EntityExecutionContextRequest): Promise<EntityExecutionContextResult>
}
