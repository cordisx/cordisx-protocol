# Connector service protocol

Status: normative version 1 minimal contract.

A Connector is a transport-neutral service slot for opening or continuing an
opaque conversation, sending a structured message, receiving structured
events, stopping an opaque run, and closing a conversation. It supplies a
common consumption model for an Agent Connector and a future message-forwarding
adapter; it does not define a product, consumer, task, or UI.

## Contracts

- `connector-service-descriptor.v1.schema.json` is the versioned capability
  descriptor for one connector id.
- `connector-registration.v1.schema.json` binds that connector id to one opaque
  registration id and monotonically replaced generation.
- `connector-command.v1.schema.json` is one `conversation.open`,
  `message.send`, `run.stop`, or `conversation.close` request.
- `connector-event.v1.schema.json` is one ordered conversation, message, run,
  close, or disposal observation.

`conversation` and `run` are opaque handles. A consumer can retain and return a
handle only to the registration that issued it; it cannot derive identity,
platform state, or authority from its contents. `conversation.open` separates
new creation from continuation: continuation requires a previous conversation
handle.

Messages are data-only envelopes with an opaque message id, an inbound/outbound
direction, and bounded text parts. The first checkpoint deliberately has no
attachments, platform metadata, execution options, callbacks, or raw transport
payloads.

## Capability and lifecycle

Each command is permitted only when the descriptor declares its matching
capability: `conversation.open`, `conversation.continue`, `message.send`,
`run.stop`, or `conversation.close`. Event consumers require
`events.receive`; emitting the terminal `connector.disposed` event requires
`lifecycle.dispose`.

Every command and event repeats the exact registration identity and generation.
The disposal event is terminal for that registration. A replacement registers a
new generation rather than reviving the disposed one. The protocol makes no
claim about task execution, message delivery guarantees, retries, persistence,
or external-service semantics.

The documents contain no Room, Agent product UI, model, provider, workspace,
secret, external-platform identity, DOM, callback, raw bridge, absolute-path,
or host-transport field. Host and adapters may implement those concerns behind
their own private boundaries.
