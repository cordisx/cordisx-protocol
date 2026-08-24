# Channel runtime protocol

Status: normative version 1 Channel data contracts and version 2 runtime
manifest. This specification reserves the minimum public boundary required by
the approved Channel architecture. It does not claim that the launcher service
host, Channel core, renderer settings projection, or a real platform adapter is
available.

## Contracts

The machine-readable contracts are:

- `channel-common.v1.schema.json`: structured account, tenant, conversation,
  thread, user, and event identities;
- `channel-user-input.v1.schema.json`: sourced, user-role-only input with
  quarantined attachment handles;
- `channel-binding.v1.schema.json`: a persistent Channel endpoint to complete
  Platform session binding;
- `channel-runtime-snapshot.v1.schema.json`: a bounded, redacted manager
  snapshot; and
- `plugin-manifest.v2.schema.json`: Channel capabilities/scopes plus a
  launcher-resolved `channel-adapter` service entry.

Manifest v2 is an exact version boundary. A v1-only host rejects it instead of
ignoring `services` or Channel declarations. A v2 host may continue to load a
v1 renderer-only manifest through its existing v1 path, but it must not infer a
Node service from renderer files.

## Composite identities

Display names and unqualified platform ids are never keys. The canonical
Channel endpoint is:

```text
(adapterId, accountId, tenantId, conversationId, threadId, routeId)
```

The bound task identity remains:

```text
(providerId, remoteSessionId)
```

Every derived identity repeats its parent key fields deliberately. This keeps
serialized identities self-contained and prevents an account-local id from
being separated from its adapter, account, or tenant. Conformance additionally
requires `createdBy`, `createdFrom`, and `channel` in a binding to agree on
their complete parent identity. If `createdFrom.actor` is present, it must be
the complete `createdBy` user identity.

A direct conversation without a native topic uses its stable conversation id
as `threadId` and `semantics=conversation`. A native topic uses
`semantics=topic`; a stable reply root uses `semantics=reply-chain`. A normal
group message is not automatically a task command: mention, reply, command,
user, group, and tenant policy remain Host-owned checks.

## Sourced input

Channel ingress accepts only `cordisx.channel-user-input/v1` with
`role=user` and `source.kind=channel`. Its event carries the complete Channel
origin. Text and all platform metadata remain untrusted user content. The
contract has no system, developer, trusted, prompt-section, or earlier-message
mutation form.

An attachment block contains only an opaque Host handle, media type, optional
display name, and bounded size. It cannot contain a URL or filesystem path.
The Node Host creates the handle after account authorization, download limits,
quarantine, and content checks. Reading it also requires
`channel.attachments.read`.

The existing plain-string Platform turn input is not a conforming Channel
gateway. A host must preserve the sourced envelope through its Platform/Agent
mapping before enabling real ingress.

## Binding and replay

`cordisx.channel-binding/v1` stores both complete identities, creator, source
event, route, revision, and state. One endpoint plus route may have at most one
active binding in a runtime snapshot. Rebinding creates a new revision/history
record; it does not silently replace the previous task.

Adapters and the core provide at-least-once handling plus durable idempotency.
The replay identity is `(adapterId, accountId, eventId)`. A duplicate returns
the durable prior outcome. This protocol never claims exactly-once delivery.

## Node service declaration

Manifest v2 adds a closed launcher service declaration:

```json
{
  "id": "simulator",
  "kind": "channel-adapter",
  "entry": "./dist/simulator.js"
}
```

The entry is a package-relative JavaScript module path with no parent segment,
URL, or absolute path. The launcher resolves it inside the verified package and
binds package identity, service id, generation, configuration revision,
granted capabilities, and opaque secret handles. The module cannot choose or
replace its canonical identity.

The corresponding Host facade is narrow and launcher-owned. It supplies
service lifecycle, clocks, sanitized logging, durable inbox/outbox and binding
transactions, attachment quarantine handles, secret-handle operations, and a
Channel task gateway. It supplies no renderer/DOM, CDP, raw bridge, generic
app-server RPC, provider process handle, or exported secret value.

Service activation is staged. A candidate generation starts and validates
before becoming current; failure retains the last-good generation. Replacement
fences old claims and then calls its bounded dispose path. Restart recovers
durable leases, queues, bindings, replay ids, cursor/checkpoint, generation,
and last-good revision.

The Host projects the runtime as a Node-side Cordis `channel` service. Adapter
plugins contribute connections through fiber-owned effects; other Node plugins
may consume only brokered connection-list, sourced-message subscription, and
queued-send methods. The Host derives package source, plugin id, and generation
from the requesting Cordis child context on every call. Callers cannot provide
their own identity, receive the raw adapter connection, or retain a facade past
generation disposal.

`channel.events.receive` is adapter authority to accept and durably normalize
platform ingress. It does not grant a consumer plugin access to message
content. Cross-plugin consumption requires the separate
`channel.events.subscribe` declaration. Subscriptions expose the sourced
user-input envelope only after durable acceptance and never expose raw callback
bodies, transports, secrets, or task-gateway handles.

## Capabilities and scopes

Channel adds these declarations to the existing Permission Broker model:

| Capability | Minimum use | Default requirement |
| --- | --- | --- |
| `channel.accounts.read` | list or watch redacted connection metadata | required for consumer connection discovery |
| `channel.accounts.connect` | start a real account transport | required for live adapters |
| `channel.events.receive` | authenticate, persist, and normalize inbound events | required for inbound adapters |
| `channel.events.subscribe` | consume sourced normalized messages across Node plugins | required for consumer subscriptions |
| `channel.messages.send` | reply, notify, update, or recall where supported | required for bidirectional adapters |
| `channel.bindings.read` | resolve endpoint/task bindings | required for query/continue |
| `channel.bindings.write` | create, rebind, archive, or restore bindings | required for create/bind control |
| `channel.attachments.read` | fetch and open quarantined inbound media | optional |

Channel declarations may use only `channelAccounts`, `channelTenants`,
`channelConversations`, and `channelUsers`. Platform declarations may combine
their existing provider/cwd/complete-session scopes with Channel origin scopes.
Agent declarations may combine `sessionIds` with Channel origin scopes, but
cannot use Platform `sessions`. This permits the broker and audit log to bind a
Channel actor to the exact lower-level operation without inventing a second
task runtime.

`required` versus optional remains explicit in each declaration. At runtime,
the existing `ask`/`allow`/`deny` decision applies to the complete source,
capability, target, and generation. A remote event may trigger an `ask`, but it
cannot approve itself.

## Redacted manager snapshot

`cordisx.channel-runtime-snapshot/v1` exposes only structured health:

- tenant-qualified account reference and adapter kind;
- one of `implemented`, `verified`, `experimental`, `unavailable`, or
  `planned`;
- connection/secret readiness, generation, last-good revision, cursor age,
  bounded error code, and inbox/outbox counts; and
- binding identity, complete Platform session reference, route, revision, and
  state.

It contains no credential, secret value, secret handle string, raw event,
message text, attachment path, user content, or generic diagnostic payload.
Host-rendered Settings headers and actions consume this snapshot; controlled
plugin content never receives a raw bridge.

## Compatibility and delivery status

The Channel facade may mirror a high-level DSH/OneWorks connection lifecycle
(`define`, `start`, normalize, send, acknowledge, dispose), while its task
methods continue to delegate to CordisX Platform and Agent APIs. Bare session
ids, full message-batch mutation, adapter-authored system prompts, and raw
launcher forwarding are not compatible behavior.

At this protocol revision:

- structured identities, sourced input, binding, snapshot, capabilities, and
  service declarations are `implemented` after this repository revision lands;
- their conformance vectors are `verified` only when the named CI run passes;
- launcher service loading, durable Channel core, simulator, Settings UI, and
  real Feishu/WeCom/WeChat adapters remain `planned` until their owning PRs
  land and pass their own validation;
- personal WeChat client automation is `unavailable`; and
- protocol presence alone never upgrades a runtime feature to implemented.

## Conformance

`conformance/channel-runtime.mjs` validates every schema and fixture, duplicate
capability/service identity, capability-family scope separation, binding
lineage, active-binding uniqueness, account coverage, and forbidden public
fields. The mandatory simulator and real-adapter matrices live in the owning
host architecture and implementation suites; protocol vectors do not substitute
for transport or renderer smoke.
