import type { ConnectorCommand, ConnectorEvent, ConnectorRegistration, ConnectorServiceDescriptor } from './connector-service.v1.js'

const descriptor = {
  $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/connector-service-descriptor.v1.schema.json',
  contract: 'cordisx.connector-service-descriptor/v1',
  schemaVersion: 1,
  connectorId: 'agent.connector',
  protocolVersion: 1,
  capabilities: ['conversation.open', 'conversation.continue', 'message.send', 'events.receive', 'run.stop', 'conversation.close', 'lifecycle.dispose'],
} satisfies ConnectorServiceDescriptor

const registration = {
  $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/connector-registration.v1.schema.json',
  contract: 'cordisx.connector-registration/v1',
  schemaVersion: 1,
  registration: { registrationId: 'registration-1', connectorId: 'agent.connector', generation: 1 },
} satisfies ConnectorRegistration

const command = {
  $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/connector-command.v1.schema.json',
  contract: 'cordisx.connector-command/v1',
  schemaVersion: 1,
  commandId: 'command-1',
  registration: registration.registration,
  type: 'message.send',
  conversation: 'conversation-1',
  message: { messageId: 'message-1', direction: 'outbound', parts: [{ kind: 'text', text: 'Hello' }] },
} satisfies ConnectorCommand

const event = {
  $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/connector-event.v1.schema.json',
  contract: 'cordisx.connector-event/v1',
  schemaVersion: 1,
  eventId: 'event-1',
  registration: registration.registration,
  sequence: 0,
  occurredAt: '2026-08-28T00:00:00.000Z',
  type: 'message.received',
  conversation: 'conversation-1',
  message: { messageId: 'message-2', direction: 'inbound', parts: [{ kind: 'text', text: 'Reply' }] },
} satisfies ConnectorEvent

void descriptor
void command
void event
