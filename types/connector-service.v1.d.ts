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

export type ConnectorClientCapability = 'connector.discovery' | 'connector.command.execute' | 'connector.events.subscribe'

interface ConnectorCaller {
  principal: { principalHandle: string; pluginId: string; generation: number }
  userHandle: string
  authorization: {
    capability: ConnectorClientCapability
    target: { kind: 'catalog' } | { kind: 'registration'; registration: ConnectorRegistrationIdentity }
  }
}

export type ConnectorAuthorizationOutcome =
  | { capability: ConnectorClientCapability; state: 'allowed'; code: 'allowed' }
  | { capability: ConnectorClientCapability; state: 'denied'; code: 'user-denied' | 'policy-denied' }
  | { capability: ConnectorClientCapability; state: 'unavailable'; code: 'principal-unavailable' | 'registration-unavailable' | 'unsupported' }

type HostConnectorClientRequest =
  | { $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/connector-client-request.v1.schema.json'; contract: 'cordisx.connector-client-request/v1'; schemaVersion: 1; requestId: string; caller: ConnectorCaller; type: 'connector.discover' }
  | { $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/connector-client-request.v1.schema.json'; contract: 'cordisx.connector-client-request/v1'; schemaVersion: 1; requestId: string; caller: ConnectorCaller; type: 'connector.command.execute'; registration: ConnectorRegistrationIdentity; command: ConnectorCommand }
  | { $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/connector-client-request.v1.schema.json'; contract: 'cordisx.connector-client-request/v1'; schemaVersion: 1; requestId: string; caller: ConnectorCaller; type: 'connector.events.subscribe'; registration: ConnectorRegistrationIdentity; afterSequence: number }

export interface ConnectorClientSnapshot {
  $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/connector-client-snapshot.v1.schema.json'
  contract: 'cordisx.connector-client-snapshot/v1'
  schemaVersion: 1
  observedAt: string
  registrations: readonly {
    registration: ConnectorRegistrationIdentity
    capabilities: readonly ConnectorCapability[]
    availability: 'available' | 'unavailable'
    unavailableCode?: 'generation-replaced' | 'disposed' | 'unsupported'
  }[]
}

export interface ConnectorEventSubscription {
  $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/connector-event-subscription.v1.schema.json'
  contract: 'cordisx.connector-event-subscription/v1'
  schemaVersion: 1
  subscriptionId: string
  registration: ConnectorRegistrationIdentity
  afterSequence: number
  snapshotSequence: number
}

type HostConnectorClientResult =
  | { $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/connector-client-result.v1.schema.json'; contract: 'cordisx.connector-client-result/v1'; schemaVersion: 1; requestId: string; type: HostConnectorClientRequest['type']; status: 'denied'; authorization: Extract<ConnectorAuthorizationOutcome, { state: 'denied' }> }
  | { $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/connector-client-result.v1.schema.json'; contract: 'cordisx.connector-client-result/v1'; schemaVersion: 1; requestId: string; type: HostConnectorClientRequest['type']; status: 'unavailable'; authorization: Extract<ConnectorAuthorizationOutcome, { state: 'unavailable' }> }
  | { $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/connector-client-result.v1.schema.json'; contract: 'cordisx.connector-client-result/v1'; schemaVersion: 1; requestId: string; type: 'connector.discover'; status: 'accepted'; authorization: Extract<ConnectorAuthorizationOutcome, { state: 'allowed' }>; snapshot: ConnectorClientSnapshot }
  | { $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/connector-client-result.v1.schema.json'; contract: 'cordisx.connector-client-result/v1'; schemaVersion: 1; requestId: string; type: 'connector.command.execute'; status: 'accepted'; authorization: Extract<ConnectorAuthorizationOutcome, { state: 'allowed' }>; execution: { kind: 'conversation.opened'; conversation: string } | { kind: 'message.sent'; conversation: string; messageId: string } | { kind: 'run.stopped'; binding: { conversation: string; run: string } } | { kind: 'conversation.closed'; conversation: string } }
  | { $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/connector-client-result.v1.schema.json'; contract: 'cordisx.connector-client-result/v1'; schemaVersion: 1; requestId: string; type: 'connector.events.subscribe'; status: 'accepted'; authorization: Extract<ConnectorAuthorizationOutcome, { state: 'allowed' }>; subscription: ConnectorEventSubscription }

export type ConnectorClientCall =
  | { $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/connector-bound-client-call.v1.schema.json'; contract: 'cordisx.bound-connector-client-call/v1'; schemaVersion: 1; callId: string; type: 'discover' }
  | { $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/connector-bound-client-call.v1.schema.json'; contract: 'cordisx.bound-connector-client-call/v1'; schemaVersion: 1; callId: string; type: 'execute'; registration: ConnectorRegistrationIdentity; command: ConnectorCommand }
  | { $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/connector-bound-client-call.v1.schema.json'; contract: 'cordisx.bound-connector-client-call/v1'; schemaVersion: 1; callId: string; type: 'subscribe'; registration: ConnectorRegistrationIdentity; afterSequence: number }

export interface ConnectorEventPage {
  $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/connector-event-page.v1.schema.json'
  contract: 'cordisx.connector-event-page/v1'
  schemaVersion: 1
  subscription: ConnectorEventSubscription
  afterSequence: number
  phase: 'replay' | 'live'
  events: readonly ConnectorEvent[]
  nextAfterSequence: number
  hasMore: boolean
}

export interface ConnectorSubscription {
  readonly subscription: ConnectorEventSubscription
  readonly pages: AsyncIterable<ConnectorEventPage>
  unsubscribe(): void
}

export type BoundConnectorClientResult =
  | { $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/connector-bound-client-result.v1.schema.json'; contract: 'cordisx.bound-connector-client-result/v1'; schemaVersion: 1; callId: string; type: 'discover' | 'execute' | 'subscribe'; status: 'denied'; authorization: Extract<ConnectorAuthorizationOutcome, { state: 'denied' }> }
  | { $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/connector-bound-client-result.v1.schema.json'; contract: 'cordisx.bound-connector-client-result/v1'; schemaVersion: 1; callId: string; type: 'discover' | 'execute' | 'subscribe'; status: 'unavailable'; authorization: Extract<ConnectorAuthorizationOutcome, { state: 'unavailable' }> }
  | { $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/connector-bound-client-result.v1.schema.json'; contract: 'cordisx.bound-connector-client-result/v1'; schemaVersion: 1; callId: string; type: 'discover'; status: 'accepted'; authorization: Extract<ConnectorAuthorizationOutcome, { state: 'allowed' }>; snapshot: ConnectorClientSnapshot }
  | { $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/connector-bound-client-result.v1.schema.json'; contract: 'cordisx.bound-connector-client-result/v1'; schemaVersion: 1; callId: string; type: 'execute'; status: 'accepted'; authorization: Extract<ConnectorAuthorizationOutcome, { state: 'allowed' }>; execution: { kind: 'conversation.opened'; conversation: string } | { kind: 'message.sent'; conversation: string; messageId: string } | { kind: 'run.stopped'; binding: { registration: ConnectorRegistrationIdentity; conversation: string; run: string } } | { kind: 'conversation.closed'; conversation: string } }
  | { $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/connector-bound-client-result.v1.schema.json'; contract: 'cordisx.bound-connector-client-result/v1'; schemaVersion: 1; callId: string; type: 'subscribe'; status: 'accepted'; authorization: Extract<ConnectorAuthorizationOutcome, { state: 'allowed' }>; subscription: ConnectorSubscription }

export interface BoundConnectorClient {
  readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/connector-bound-client.v1.schema.json'
  readonly contract: 'cordisx.bound-connector-client/v1'
  readonly schemaVersion: 1
  discover(): Promise<Extract<BoundConnectorClientResult, { type: 'discover' }>>
  execute(command: ConnectorCommand): Promise<Extract<BoundConnectorClientResult, { type: 'execute' }>>
  subscribe(registration: ConnectorRegistrationIdentity, afterSequence: number): Promise<Extract<BoundConnectorClientResult, { type: 'subscribe' }>>
  dispose(): void
}
