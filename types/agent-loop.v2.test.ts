import type {
  AgentDefinition,
  AgentLoopCommand,
  AgentLoopCreateOrBindUnavailableCode,
  AgentLoopCreateOrBindResult,
  AgentLoopDeliveryDisposition,
  AgentLoopEvent,
  AgentLoopOperationId,
  AgentLoopOperationUnavailableCode,
  AgentLoopSendResult,
  AgentLoopTaskBinding,
  BoundAgentLoopClient,
} from '@cordisx/protocol/agent-loop/v2'
import { cloneAgentAvatarRef } from '@cordisx/protocol/agent-avatar/v1'

const operationId: AgentLoopOperationId = 'command-create'
const deliveryDisposition: AgentLoopDeliveryDisposition = 'reconciled'
const operationUnavailableCode: AgentLoopOperationUnavailableCode = 'provider-replaced'
const createUnavailableCode: AgentLoopCreateOrBindUnavailableCode = 'details-unavailable'

void [operationId, deliveryDisposition, operationUnavailableCode, createUnavailableCode]

const definition = {
  $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/agent-definition.v1.schema.json',
  contract: 'cordisx.agent-definition/v1',
  schemaVersion: 1,
  identity: { agentId: 'reviewer', revision: 'sha256:definition-1' },
  avatar: cloneAgentAvatarRef({ kind: 'asset', ref: 'avatar:reviewer', revision: 'revision:v1' }),
  extends: [{ agentId: 'base', revision: 'sha256:base-1' }],
  inherit: {
    promptSections: 'append',
    rules: 'merge',
    skills: 'merge',
    tools: 'replace',
    mcpServers: 'replace',
    runtimeDefaults: 'merge',
    avatar: 'inherit',
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
  $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/agent-loop-task-binding.v2.schema.json',
  contract: 'cordisx.agent-loop-task-binding/v2',
  schemaVersion: 2,
  binding: { bindingId: 'binding-1', generation: 1 },
  definition: definition.identity,
  task: 'task-1',
  state: 'active',
} satisfies AgentLoopTaskBinding

const acceptedCreate = {
  $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/agent-loop-result.v2.schema.json',
  contract: 'cordisx.agent-loop-result/v2',
  schemaVersion: 2,
  commandId: 'command-create',
  type: 'create-or-bind',
  status: 'accepted',
  authorization: { capability: 'tasks.create', state: 'allowed', code: 'allowed' },
  binding,
  detailsUrl: { url: 'app://-/tasks/task-1', target: 'host' },
  delivery: { disposition: 'executed' },
} satisfies AgentLoopCreateOrBindResult

const acceptedBind = {
  ...acceptedCreate,
  commandId: 'command-bind',
  authorization: { capability: 'tasks.content.read', state: 'allowed', code: 'allowed' },
  detailsUrl: { url: 'https://example.test/tasks/task-1', target: 'external' },
} satisfies AgentLoopCreateOrBindResult

const unavailableDetailsCreate = {
  $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/agent-loop-result.v2.schema.json',
  contract: 'cordisx.agent-loop-result/v2',
  schemaVersion: 2,
  commandId: 'command-create',
  type: 'create-or-bind',
  status: 'unavailable',
  authorization: { capability: 'tasks.content.read', state: 'allowed', code: 'allowed' },
  code: 'details-unavailable',
} satisfies AgentLoopCreateOrBindResult

void acceptedCreate
void acceptedBind
void unavailableDetailsCreate

const create = {
  $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/agent-loop-command.v2.schema.json',
  contract: 'cordisx.agent-loop-command/v2',
  schemaVersion: 2,
  commandId: 'command-create',
  type: 'create-or-bind',
  definition: definition.identity,
  definitions: [definition],
  target: { mode: 'create' },
} satisfies AgentLoopCommand

const send = {
  $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/agent-loop-command.v2.schema.json',
  contract: 'cordisx.agent-loop-command/v2',
  schemaVersion: 2,
  commandId: 'command-send',
  type: 'send',
  binding,
  content: [
    { kind: 'text', text: 'Review this.' },
    { kind: 'image-ref', ref: 'image-1', mediaType: 'image/png', alt: 'Screenshot' },
  ],
} satisfies AgentLoopCommand

const event = {
  $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/agent-loop-event.v2.schema.json',
  contract: 'cordisx.agent-loop-event/v2',
  schemaVersion: 2,
  eventId: 'event-1',
  binding: binding.binding,
  sequence: 0,
  occurredAt: '2026-08-30T00:00:00.000Z',
  causation: { operationId: 'command-send' },
  turn: 'turn-1',
  type: 'message',
  message: { messageId: 'message-1', role: 'assistant', content: [{ kind: 'text', text: 'Done.' }] },
} satisfies AgentLoopEvent

void event

const deniedCreate = {
  $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/agent-loop-result.v2.schema.json',
  contract: 'cordisx.agent-loop-result/v2',
  schemaVersion: 2,
  commandId: 'command-create',
  type: 'create-or-bind',
  status: 'denied',
  authorization: { capability: 'tasks.create', state: 'denied', code: 'policy-denied' },
} satisfies AgentLoopCreateOrBindResult

const unavailableSend = {
  $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/agent-loop-result.v2.schema.json',
  contract: 'cordisx.agent-loop-result/v2',
  schemaVersion: 2,
  commandId: 'command-send',
  type: 'send',
  status: 'unavailable',
  authorization: { capability: 'turns.submit', state: 'unavailable', code: 'host-unavailable' },
} satisfies AgentLoopSendResult

const acceptedSend = {
  $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/agent-loop-result.v2.schema.json',
  contract: 'cordisx.agent-loop-result/v2',
  schemaVersion: 2,
  commandId: 'command-send',
  type: 'send',
  status: 'accepted',
  authorization: { capability: 'turns.submit', state: 'allowed', code: 'allowed' },
  binding,
  messageId: 'message-1',
  turn: 'turn-1',
  delivery: { disposition: 'replayed' },
} satisfies AgentLoopSendResult

const reconciliationRequiredSend = {
  ...unavailableSend,
  authorization: { capability: 'turns.submit', state: 'allowed', code: 'allowed' },
  code: 'reconciliation-required',
} satisfies AgentLoopSendResult

const providerReplacedCreate = {
  ...unavailableDetailsCreate,
  code: 'provider-replaced',
} satisfies AgentLoopCreateOrBindResult

void deniedCreate
void unavailableSend
void acceptedSend
void reconciliationRequiredSend
void providerReplacedCreate

declare const client: BoundAgentLoopClient

async function consume() {
  void client.durableLedger.retention.recoveryDays
  const created = await client.createOrBind(create)
  if (created.status === 'accepted') void created.detailsUrl.url
  else if (created.status === 'denied') void created.authorization.code
  else void created.authorization.code

  const sent = await client.send(send)
  if (sent.status === 'accepted') void [sent.messageId, sent.turn, sent.delivery.disposition]
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

// @ts-expect-error Host targets require the app scheme
const invalidTaskDetailsTarget: AgentLoopCreateOrBindResult = { ...acceptedCreate, detailsUrl: { url: 'https://example.test/tasks/1', target: 'host' } }
void invalidTaskDetailsTarget

// @ts-expect-error details-unavailable applies only to create-or-bind
const invalidDetailsUnavailableSend: AgentLoopSendResult = { ...unavailableSend, authorization: { capability: 'turns.submit', state: 'allowed', code: 'allowed' }, code: 'details-unavailable' }
void invalidDetailsUnavailableSend

// @ts-expect-error create-or-bind denied results cannot claim turns.submit
const invalidCreateAuthorization: AgentLoopCreateOrBindResult = { ...deniedCreate, authorization: { capability: 'turns.submit', state: 'denied', code: 'user-denied' } }
void invalidCreateAuthorization

// @ts-expect-error send unavailable results cannot claim tasks.content.read
const invalidSendAuthorization: AgentLoopSendResult = { ...unavailableSend, authorization: { capability: 'tasks.content.read', state: 'unavailable', code: 'task-unavailable' } }
void invalidSendAuthorization

// @ts-expect-error accepted sends always return the stable turn identity
const invalidAcceptedSend: AgentLoopSendResult = { ...acceptedSend, turn: undefined }
void invalidAcceptedSend
