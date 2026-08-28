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
- `connector-client-binding.v1.schema.json` is the Host-only issuance and
  binding record for principal, user, and authorization grants.
- `connector-bound-client.v1.schema.json`,
  `connector-bound-client-call.v1.schema.json`, and
  `connector-bound-client-result.v1.schema.json` define the plugin-visible,
  Host-injected discover/execute/subscribe/dispose surface and typed outcomes.
- `connector-client-snapshot.v1.schema.json`,
  `connector-event-subscription.v1.schema.json`, and
  `connector-event-page.v1.schema.json` are the redacted discovery and
  serialized replay/live consumption contracts.

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

## Host-bound consumer boundary

The Host creates the principal/user/authorization binding and injects one
fiber-owned `BoundConnectorClient`. A plugin neither receives nor serializes a
caller principal, user, grant, binding id, or generic invocation route. It can
only call the bound client's `discover`, `execute`, and `subscribe` methods;
the Host derives caller identity and evaluates the exact authorization target.
The client is disposed with its owner. Each subscription provides a typed
ordered page stream and explicit `unsubscribe`; neither is a transport or a
second connection.

The Host returns `accepted`, `denied`, or `unavailable` with a bounded outcome.
It never returns a callable service object, transport, generic bridge, or
arbitrary command payload.

The accepted `subscribe` **wire result** contains only the serializable
`ConnectorEventSubscription` descriptor. Separately, the TypeScript-only
runtime return contains that wire result under `result` and, only when it is
accepted, a non-JSON `ConnectorSubscription` handle with `pages` and
`unsubscribe`. The descriptor is never an `AsyncIterable` and the runtime
handle is never claimed to satisfy a JSON schema.

An accepted command result is typed. In particular, `run.stopped` repeats one
`(registration, conversation, run)` binding; a run cannot be stopped through a
different registration or conversation. Discovery returns only a redacted
registration/capability/availability snapshot, never client principals, user
identity, message text, or service internals.

Subscription first fixes `snapshotSequence`. Replay pages advance exactly from
`afterSequence` through that snapshot; only after the final replay cursor may a
live page begin. A page contains one contiguous sequence for the exact
registration. Disposal is terminal, including during replay, so a late event
for that registration is rejected.

The lossless protocol invariant is one Host-owned serialized sequence per exact
registration: a subscription observes each accepted sequence once in cursor
order, replay through its fixed snapshot, then live events strictly after that
cursor. The schema/conformance model makes ordering, terminal disposal, and
unsubscribe/owner-dispose state testable. A real concurrent or reentrant
producer race is a Host integration acceptance gate; static Protocol fixtures
do not claim to prove its runtime scheduling behavior.

The documents contain no Room, Agent product UI, model, provider, workspace,
secret, external-platform identity, DOM, callback, raw bridge, absolute-path,
or host-transport field. Host and adapters may implement those concerns behind
their own private boundaries.
