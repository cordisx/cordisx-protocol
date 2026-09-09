import type { EntityExecutionContexts } from './entity-execution-context.v2.js'
declare const contexts: EntityExecutionContexts
void contexts.projectless({ identity: { agentId: 'global', revision: 'exact' }, operationId: 'new-chat' })
// @ts-expect-error Projectless intent accepts no claimed directory or project.
void contexts.projectless({
  identity: { agentId: 'global', revision: 'exact' },
  operationId: 'new-chat',
  projectId: 'forged',
})
