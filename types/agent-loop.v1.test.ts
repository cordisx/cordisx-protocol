import type {
  AgentDefinition,
  AgentLoopCommand,
  AgentLoopCreateOrBindResult,
  AgentLoopEvent,
  AgentLoopSendResult,
  AgentLoopTaskBinding,
  BoundAgentLoopClient,
} from '@cordisx/protocol/agent-loop/v1'

const definition = {
  $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/agent-definition.v1.schema.json',
  contract: 'cordisx.agent-definition/v1',
  schemaVersion: 1,
  identity: { agentId: 'reviewer', revision: 'sha256:definition-1' },
  extends: [{ agentId: 'base', revision: 'sha256:base-1' }],
  inherit: {
    promptSections: 'append',
    rules: 'merge',
    skills: 'merge',
    tools: 'replace',
    mcpServers: 'replace',
    runtimeDefaults: 'merge',
  },
  promptSections: [
    { sectionId: 'introduction', kind: 'introduction', text: 'You are a reviewer.' },
    { sectionId: 'personality', kind: 'personality', text: 'Be precise.' },
    { sectionId: 'memory', kind: 'memory', text: 'Retain only task-relevant context.' },
  ],
  rules: ['safe-review'],
  skills: ['code-review'],
  tools: { include: ['read', 'search'] },
  mcpServers: { exclude: ['production'] },
  runtimeDefaults: { adapterId: 'codex', model: { providerId: 'openai', modelId: 'gpt-5' }, effort: 'high' },
} satisfies AgentDefinition

const binding = {
  $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/agent-loop-task-binding.v1.schema.json',
  contract: 'cordisx.agent-loop-task-binding/v1',
  schemaVersion: 1,
  binding: { bindingId: 'binding-1', generation: 1 },
  definition: definition.identity,
  task: 'task-1',
  state: 'active',
} satisfies AgentLoopTaskBinding

const create = {
  $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/agent-loop-command.v1.schema.json',
  contract: 'cordisx.agent-loop-command/v1',
  schemaVersion: 1,
  commandId: 'command-create',
  type: 'create-or-bind',
  definition: definition.identity,
  definitions: [definition],
  target: { mode: 'create' },
} satisfies AgentLoopCommand

const send = {
  $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/agent-loop-command.v1.schema.json',
  contract: 'cordisx.agent-loop-command/v1',
  schemaVersion: 1,
  commandId: 'command-send',
  type: 'send',
  binding,
  content: [
    { kind: 'text', text: 'Review this.' },
    { kind: 'image-ref', ref: 'image-1', mediaType: 'image/png', alt: 'Screenshot' },
  ],
} satisfies AgentLoopCommand

const event = {
  $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/agent-loop-event.v1.schema.json',
  contract: 'cordisx.agent-loop-event/v1',
  schemaVersion: 1,
  eventId: 'event-1',
  binding: binding.binding,
  sequence: 0,
  occurredAt: '2026-08-30T00:00:00.000Z',
  type: 'message',
  message: { messageId: 'message-1', role: 'assistant', content: [{ kind: 'text', text: 'Done.' }] },
} satisfies AgentLoopEvent

void event

const deniedCreate = {
  $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/agent-loop-result.v1.schema.json',
  contract: 'cordisx.agent-loop-result/v1',
  schemaVersion: 1,
  commandId: 'command-create',
  type: 'create-or-bind',
  status: 'denied',
  authorization: { capability: 'tasks.create', state: 'denied', code: 'policy-denied' },
} satisfies AgentLoopCreateOrBindResult

const unavailableSend = {
  $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/agent-loop-result.v1.schema.json',
  contract: 'cordisx.agent-loop-result/v1',
  schemaVersion: 1,
  commandId: 'command-send',
  type: 'send',
  status: 'unavailable',
  authorization: { capability: 'turns.submit', state: 'unavailable', code: 'host-unavailable' },
} satisfies AgentLoopSendResult

void deniedCreate
void unavailableSend

declare const client: BoundAgentLoopClient

async function consume() {
  const created = await client.createOrBind(create)
  if (created.status === 'accepted') void created.binding.task
  else if (created.status === 'denied') void created.authorization.code
  else void created.authorization.code

  const sent = await client.send(send)
  if (sent.status === 'accepted') void sent.messageId
  else if (sent.status === 'denied') void sent.authorization.code
  else void sent.authorization.code

  const subscribed = await client.subscribe(binding, -1)
  if (subscribed.status === 'accepted') {
    for await (const page of subscribed.handle.pages) void page.nextAfterSequence
    subscribed.handle.unsubscribe()
  }
  client.dispose()
}

void consume

// @ts-expect-error image content is reference-only and cannot carry a URL
const invalidImage: AgentLoopCommand = { ...send, content: [{ kind: 'image-ref', ref: 'image-1', mediaType: 'image/png', url: 'https://example.com/a.png' }] }
void invalidImage

// @ts-expect-error room identity is not part of a task binding
const invalidBinding: AgentLoopTaskBinding = { ...binding, roomId: 'room-1' }
void invalidBinding
