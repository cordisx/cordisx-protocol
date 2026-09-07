import type { AgentTaskContext, AgentTaskCreateRequest, AgentTasks } from './agent-task.v1.js'

declare const tasks: AgentTasks
const request = {
  operationId: 'assignment:1',
  definition: { agentId: 'reviewer', revision: 'rev:1' },
  context: { kind: 'directory', cwd: '/workspace' },
  text: 'Review this change',
  tool: { commandId: 'chatroom', scope: { roomId: 'room:1', runId: 'run:1' } },
} satisfies AgentTaskCreateRequest
void tasks.createAndSubmit(request).then(result => {
  if (result.status === 'accepted') {
    result.task.sessionId satisfies string
    result.task.messageId satisfies string
    result.task.detail.kind satisfies 'host'
  } else {
    result.sessionId satisfies string | undefined
  }
})
void tasks.query({ operationId: request.operationId }).then(result => {
  if (result.status === 'found' && result.execution.status === 'available') {
    result.execution.value satisfies 'idle' | 'running'
  }
})
const project = { kind: 'project', projectId: 'project:1', cwd: '/worktree' } satisfies AgentTaskContext
const inherited = { kind: 'inherit', sessionId: 'parent:1' } satisfies AgentTaskContext
// @ts-expect-error context is required; runtime reports context-required before creating
void tasks.createAndSubmit({ operationId: 'x', definition: request.definition, text: 'x', tool: request.tool })
// @ts-expect-error a project selector is not an execution directory
const invalidDirectory: AgentTaskContext = { kind: 'directory', projectId: 'project:1' }
// @ts-expect-error caller identity must be Host-bound
void tasks.createAndSubmit({ ...request, callerSessionId: 'forged' })
// @ts-expect-error query never creates or resumes
void tasks.query({ operationId: 'x', create: true })
// @ts-expect-error tool credentials cannot be supplied
void tasks.createAndSubmit({ ...request, tool: { ...request.tool, token: 'forged' } })
void [project, inherited, invalidDirectory]
