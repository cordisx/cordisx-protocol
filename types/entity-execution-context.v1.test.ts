import type { EntityExecutionBinding, EntityExecutionContexts } from './entity-execution-context.v1.js'
const projectless: EntityExecutionBinding = { kind: 'projectless' }
const project: EntityExecutionBinding = { kind: 'project', projectId: 'p' }
declare const service: EntityExecutionContexts
void service.resolve({ identity: { agentId: 'leader', revision: 'exact' }, operationId: 'first' })
void projectless
void project
// @ts-expect-error A projectless binding never smuggles in a directory.
const invalid: EntityExecutionBinding = { kind: 'projectless', cwd: '/host/source' }
void invalid
