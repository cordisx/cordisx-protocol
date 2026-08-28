export type ConnectorCapability =
  | 'conversation.open'
  | 'conversation.continue'
  | 'message.send'
  | 'events.receive'
  | 'run.stop'
  | 'conversation.close'
  | 'lifecycle.dispose'

export interface ConnectorRegistrationIdentity {
  registrationId: string
  connectorId: string
  generation: number
}

export interface ConnectorServiceDescriptor {
  $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/connector-service-descriptor.v1.schema.json'
  contract: 'cordisx.connector-service-descriptor/v1'
  schemaVersion: 1
  connectorId: string
  protocolVersion: 1
  capabilities: readonly ConnectorCapability[]
}

export interface ConnectorRegistration {
  $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/connector-registration.v1.schema.json'
  contract: 'cordisx.connector-registration/v1'
  schemaVersion: 1
  registration: ConnectorRegistrationIdentity
}

export interface ConnectorMessage {
  messageId: string
  direction: 'inbound' | 'outbound'
  parts: readonly [{ kind: 'text'; text: string }, ...{ kind: 'text'; text: string }[]]
}

export type ConnectorCommand =
  | { $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/connector-command.v1.schema.json'; contract: 'cordisx.connector-command/v1'; schemaVersion: 1; commandId: string; registration: ConnectorRegistrationIdentity; type: 'conversation.open'; open: { mode: 'create' } | { mode: 'continue'; conversation: string } }
  | { $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/connector-command.v1.schema.json'; contract: 'cordisx.connector-command/v1'; schemaVersion: 1; commandId: string; registration: ConnectorRegistrationIdentity; type: 'message.send'; conversation: string; message: ConnectorMessage & { direction: 'outbound' } }
  | { $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/connector-command.v1.schema.json'; contract: 'cordisx.connector-command/v1'; schemaVersion: 1; commandId: string; registration: ConnectorRegistrationIdentity; type: 'run.stop'; conversation: string; run: string }
  | { $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/connector-command.v1.schema.json'; contract: 'cordisx.connector-command/v1'; schemaVersion: 1; commandId: string; registration: ConnectorRegistrationIdentity; type: 'conversation.close'; conversation: string }

export type ConnectorEvent =
  | { $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/connector-event.v1.schema.json'; contract: 'cordisx.connector-event/v1'; schemaVersion: 1; eventId: string; registration: ConnectorRegistrationIdentity; sequence: number; occurredAt: string; type: 'conversation.opened'; conversation: string }
  | { $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/connector-event.v1.schema.json'; contract: 'cordisx.connector-event/v1'; schemaVersion: 1; eventId: string; registration: ConnectorRegistrationIdentity; sequence: number; occurredAt: string; type: 'message.received'; conversation: string; message: ConnectorMessage & { direction: 'inbound' } }
  | { $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/connector-event.v1.schema.json'; contract: 'cordisx.connector-event/v1'; schemaVersion: 1; eventId: string; registration: ConnectorRegistrationIdentity; sequence: number; occurredAt: string; type: 'message.sent'; conversation: string; message: ConnectorMessage & { direction: 'outbound' } }
  | { $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/connector-event.v1.schema.json'; contract: 'cordisx.connector-event/v1'; schemaVersion: 1; eventId: string; registration: ConnectorRegistrationIdentity; sequence: number; occurredAt: string; type: 'run.started' | 'run.stopped'; conversation: string; run: string }
  | { $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/connector-event.v1.schema.json'; contract: 'cordisx.connector-event/v1'; schemaVersion: 1; eventId: string; registration: ConnectorRegistrationIdentity; sequence: number; occurredAt: string; type: 'conversation.closed'; conversation: string }
  | { $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/connector-event.v1.schema.json'; contract: 'cordisx.connector-event/v1'; schemaVersion: 1; eventId: string; registration: ConnectorRegistrationIdentity; sequence: number; occurredAt: string; type: 'connector.disposed'; disposeReason: 'explicit' | 'generation-replaced' }
