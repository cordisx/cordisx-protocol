# Channel runtime protocol

Status: normative version 1 Channel data/configuration contracts, legacy
version 2 runtime manifest, and configuration-complete version 3 runtime
manifest. The host-neutral Channel core and simulator have landed in the owning
Host repository; the production service loader, Manager Channel page, and real
platform adapters remain separate delivery claims.

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
- `channel-runtime-snapshot.v2.schema.json`: the profile-scoped,
  revision- and Host-generation-fenced Channel Manager projection;
- `channel-manager-request.v1.schema.json` and
  `channel-manager-result.v1.schema.json`: exact-target Manager operations
  and their redacted outcomes;
- `channel-manager-log-page.v1.schema.json` and
  `channel-manager-log-export-result.v1.schema.json`: structured safe-log
  projection and an opaque, expiring Host export result; and
- `channel-inbound-message-intent.v1.schema.json` and
  `channel-sourced-gateway-request.v1.schema.json`: adapter-neutral ingress
  intent plus the complete-origin Host gateway boundary;
- `channel-task-launch-request.v1.schema.json` and
  `channel-task-launch-authorization.v1.schema.json`: launcher-private,
  path-free selection followed by one exact, single-use authorized launch
  target;
- `platform-task-dispatch-result.v1.schema.json`,
  `platform-task-lifecycle-event.v1.schema.json`, and
  `platform-task-lifecycle-range.v1.schema.json`: launcher-private
  create/follow-up acceptance and durable sanitized completion/failure/
  approval observation;
- `channel-service-config.v1.schema.json`: launcher-only connections, routes,
  task mappings, policy, notification, retry, rate, and attachment limits;
- `channel-service-config-descriptor.v1.schema.json`: the Host-generated,
  renderer-safe Manager projection with secret readiness only;
- `plugin-manifest.v2.schema.json`: the preserved legacy Channel
  capabilities/service boundary; and
- `plugin-manifest.v3.schema.json`: the same boundary plus mandatory explicit
  `host` or `none` service-configuration declarations.

Manifest v2 remains an exact, closed compatibility boundary. It cannot be
extended with an optional configuration field because a conforming v2 Host
rejects unknown fields. A user-configurable Channel service therefore requires
manifest v3. A v1/v2-only Host rejects v3 instead of silently starting a service
without its configuration contract. A v3 Host may continue to accept v1
renderer-only and v2 legacy manifests through their versioned paths, but it must
not treat a v2 service as configuration-complete.

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

Workspace aliases and Provider Fleet lifecycle are specified separately in
[`channel-task-gateway`](../channel-task-gateway/README.md). A Channel adapter
cannot resolve an alias to an absolute cwd, and it cannot use the renderer
current-connection Agent ledger as proof that an external provider turn
completed.

## Binding and replay

`cordisx.channel-binding/v1` stores both complete identities, creator, source
event, route, revision, and state. One endpoint plus route may have at most one
active binding in a runtime snapshot. Rebinding creates a new revision/history
record; it does not silently replace the previous task.

Adapters and the core provide at-least-once handling plus durable idempotency.
The replay identity is `(adapterId, accountId, eventId)`. A duplicate returns
the durable prior outcome. This protocol never claims exactly-once delivery.

## Node service declaration and configuration

Manifest v3 retains the launcher service declaration and requires one explicit
configuration mode:

```json
{
  "id": "simulator",
  "kind": "channel-adapter",
  "entry": "./dist/simulator.js",
  "configuration": {
    "kind": "host",
    "schema": "https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/channel-service-config.v1.schema.json",
    "configApplies": "restart"
  }
}
```

A service with no user configuration declares
`"configuration": { "kind": "none" }`. It receives no invented empty object,
revision, dummy field, or Manager form. A configured service uses the exact
Host schema and `restart` application mode: candidate validation, persistence,
service-fiber replacement, and last-good publication form one fenced operation.

The Channel config document covers every current user-controlled axis:

- tenant-qualified adapter connections, enabled state, official transport mode,
  and an optional Host-only `secretRef`;
- route-to-connection mapping, allowed conversation/user ids, direct/group
  triggers, command prefixes, and explicit provider/model/profile/workspace
  selectors;
- subscribed completion/failure/approval notifications; and
- lease, bounded retry/backoff/age/jitter, account/user/conversation rate,
  concurrency/backlog, and attachment limits.

`secretRef` identifies a Host credential-store record; it is not credential
material. It is legal only in the launcher-owned source config. It is removed
before any renderer projection, default form, log, diagnostic, snapshot, custom
renderer, or adapter definition. The corresponding Manager connection contains
only `secretState=missing|ready|unavailable`. A plaintext secret-like field or a
`secretRef` in the Manager descriptor fails conformance.

This service configuration intentionally does not use a renderer plugin's
`Config` export. The service owns long-lived Node transports and its
configuration changes the staged Node generation, while plugin configuration
protocol v1 (`cordisx-protocol#19`) scopes `Config`, Schemastery fields, and
`configApplies` to a renderer plugin fiber. If the same package also contains a
renderer plugin with product preferences, that module should use Schemastery
`Config` and its own `configApplies`; the two documents are never copied or
merged. The dedicated Channel Settings page consumes the redacted service
descriptor because connections, routes, lifecycle, diagnostics, and Host-owned
credential actions are not an ordinary plugin default form.

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

## Channel Manager v2 operations, logs, and ingress

`cordisx.channel-runtime-snapshot/v2` is an additive Manager projection; it
does not alter the frozen v1 snapshot. It adds a complete `profileId`, the
publishing `hostGeneration`, and a monotonically scoped `revision`. Its account
and binding records use Host-issued, profile-local opaque tokens only: they do
not project platform account, user, conversation, thread, route, or Platform
session identifiers. Accounts and bindings declare only their currently
executable operation ids. The Host uses those ids to decide whether to present
an action; a client cannot infer authority from a visual state alone.

Every Channel Manager operation is represented by
`cordisx.channel-manager-request/v1`. It contains one stable `requestId`,
`expectedRevision`, `profileId`, `hostGeneration`, one enumerated operation,
and one exact opaque connection, binding, log, or draft target. Every Manager
token has the `chm1_` version prefix and a 256-bit URL-safe MAC or random
capability encoding; the Host verifies its scope and expiry before use. Raw
platform ids cannot satisfy this shape. The Host rejects
stale profile/generation/revision combinations before any stateful work. Binding
operations additionally carry the exact binding revision as their local CAS
fence. The operation vocabulary covers connection creation, reconnect, enable,
disable, and rotation; binding open/archive/restore/unbind; log query/export;
and `credential.capture`. The latter is only a Host-owned capture intent: its
renderer-safe request contains only a Host-issued capture token. A successful
capture result establishes a Host-issued credential-draft token. Connection
creation and credential rotation can then carry only display name, adapter kind,
that captured token, and non-identity selectors; app/tenant/route identity
stays in the Host-owned capture prompt/private draft. The Host accepts a create
or rotation only when the draft token exists in its durable captured-draft
state. No Manager request carries a value, reference, or handle. Its matching result
repeats the request identity and exact target and returns only an
applied/conflict/rejected/unavailable state, stable code, retry hint, and new
revision. It never returns process objects, configuration documents, or
diagnostic blobs.

Safe logs are event records, not a general console or transport dump. A
`cordisx.channel-manager-log-page/v1` is associated with the exact query
`requestId` and `expectedRevision`; each record contains a bounded event kind,
stable code, opaque connection token, optional binding token, count, severity,
and time.
It has no arbitrary message, raw platform event, attachment, link, or local
filesystem field. Export is initiated as `logs.export`; the matching
`cordisx.channel-manager-log-export-result/v1` returns an opaque Host export
id, JSON media type, item count, and expiry only. Resolving or writing the
export remains a Host-owned local action outside this renderer-safe protocol.

The public protocol conformance helpers require Host context; token shape alone
is never authority. `validateManagerRequest(request, context)` consumes the
current validated v2 snapshot plus a Host-private token registry carrying its
`profileId` and `hostGeneration`. Snapshot
root, account, and binding `availableOperations` are the exact authorization
source: a known token alone does not authorize an operation. Snapshot tokens
are projections, never issued authority. The Host-private registry is the sole
authority source for every connection, binding, capture, connection-draft, and
credential-draft token. Each registry record binds an exact target identity,
kind, profile, Host generation, binding revision where applicable, and expiry.
That registry is conformance/server context, never a renderer-safe wire field.
Its `authorizedAt` is the Host's authoritative request-received clock; neither
the renderer request nor snapshot observation time can supply or replace it.
It rejects a token that is syntactically `chm1_`-shaped but absent, wrong-kind,
wrong-target, wrong-profile, wrong-generation, expired, stale, or paired with
an unavailable operation. `validateLogPage(page,
queryRequest, context)` first validates that same context, then requires the
page request id, expected revision, profile, generation, and exact log target
to equal the originating `logs.query` request. Page `snapshotRevision` must
equal both that query's expected revision and the current v2 snapshot revision.

An adapter first produces
`cordisx.channel-inbound-message-intent/v1`: a complete Channel account/event
identity, bounded user content/opaque attachment handles, and the same
request/profile/generation/revision fence. It does not publish a transport
object or adapter-specific callback body. The Host gateway accepts that intent
only through `cordisx.channel-sourced-gateway-request/v1`, requires every fence
and exact target to agree, validates tenancy and user-role policy, then maps it
to the existing sourced user-input contract. This keeps the Channel source
attached through durable acceptance without allowing an adapter to create a
trusted prompt or invoke a generic Host RPC.

Inbound intent and gateway request are launcher-private contracts. They are
not renderer-safe schemas and are deliberately excluded from the Manager
projection/log/export safety scan. Their complete adapter/event/actor identity
and bounded message content are required only for durable authorization and
source preservation inside the launcher; none of those values may be copied
into a Manager token, safe-log record, or export result.

The contracts intentionally provide no credential value, reference, or editing
field. Material belongs to a narrow launcher-owned writer/broker with a
separate Host implementation and security review; it must not be modeled as
Manager data, a plugin configuration value, a log entry, or an inbound intent.

## Compatibility and delivery status

The Channel facade may mirror a high-level DSH/OneWorks connection lifecycle
(`define`, `start`, normalize, send, acknowledge, dispose), while its task
methods continue to delegate to CordisX Platform and Agent APIs. Bare session
ids, full message-batch mutation, adapter-authored system prompts, and raw
launcher forwarding are not compatible behavior.

At this protocol revision:

- structured identities, sourced input, binding, runtime snapshot,
  configuration, redacted configuration descriptor, capabilities, and manifest
  v3 declarations are `implemented` after this repository revision lands;
- their conformance vectors are `verified` only when the named CI run passes;
- the v2 Manager operation/log/ingress contracts are defined by this protocol
  revision but remain `planned` for an implementation until an owning Host
  revision consumes the formal Protocol merge and independently verifies the
  full lifecycle;
- launcher-private workspace authorization, dispatch results, and Platform
  task lifecycle contracts are defined by this protocol revision but remain
  `planned` until an owning Host formal merge consumes them; protocol presence
  alone does not make Channel-to-task execution available;
- the host-neutral Channel core and simulator are implemented/verified in the
  owning Host repository; launcher manifest-v3 loading, credential broker,
  production configuration writer, and actual Manager Channel UI remain
  `planned` until their own Host PRs land;
- schema-validated Host parsing and redacted descriptor generation may be
  implemented before that loader/UI, but must be labeled separately from an
  operational connection editor;
- real Feishu/WeCom/WeChat adapters remain `planned` until credentialed smoke;
- personal WeChat client automation is `unavailable`; and
- protocol presence alone never upgrades a runtime feature to implemented.

## Conformance

`conformance/channel-runtime.mjs` validates every schema and fixture, manifest
v2/v3 selection, explicit service configuration, duplicate capability/service,
connection, and route identity, route/connection coverage, retry ordering,
capability-family scope separation, binding lineage, active-binding uniqueness,
account coverage, and renderer-secret exclusion. The mandatory simulator and
real-adapter matrices live in the owning host architecture and implementation
suites; protocol vectors do not substitute for transport or renderer smoke.

## Channel Manager bootstrap v2/v3

The published v1 request/result and v2 snapshot remain frozen. New Hosts may
instead opt into `channel-manager-common/v2`, request/result v2, snapshot v3,
and target issuance v1. These versions intentionally separate a
renderer-safe wire projection from Host-private authority: every visible
target is an opaque `chm1_` token, and shape is never authority.

The Host issues every target through its private registry. A registry record
binds profile, Host generation, exact issued revision, operation, target kind,
expiry and consumed state. Credential capture, credential draft and connection
draft records additionally bind their purpose, adapter kind and source lineage.
The Host rejects absent, expired, cross-profile, cross-generation,
cross-purpose, cross-connection, cross-adapter and replayed records. A target
issuance or Manager result is a pre/post transition: an applied result consumes
its input and registers its exact output atomically; a failed result changes
neither registry nor snapshot revision.

Credential material, app/tenant/account/route identifiers, exact scopes,
security fingerprints, paths, callbacks and raw gateway payloads are never
renderer fields. Native capture prompts and durable drafts remain Host-private.
Simulator connection drafts are explicitly credential-free; all other
connection drafts originate from a consumed `create` credential draft. Rotation
accepts only a credential-draft token bound to the exact existing connection.

Snapshot v3 also adds bounded pending authorization projections. Renderer code
can see only a pending opaque `permissionRequestToken`, product-safe capability,
state and exact allowed decision operations. `permission.allow-once`,
`permission.allow-persistent`, `permission.deny-once`, and
`permission.deny-persistent` consume that one Host-issued record and return
only a safe state/capability readback. The private record binds canonical
identity, resolved scope, manifest fingerprint, inbound operation/record and
lease; remote Channel events can create pending records but cannot approve
themselves. `binding.open` remains a defined operation but snapshot v3 never
advertises it until an owning Host has an opener semantic.

`conformance/channel-manager-v2.mjs` runs exact-error pre/post vectors for
simulator issuance, capture/create lineage, and permission decisions. It is a
protocol check, not proof of an adapter, credential broker or transport.

The v2 `logs.query` and `logs.export` response contracts are independently
versioned safe log page/export results. Their validation binds request id,
expected revision, profile, generation and exact opaque log target to the
originating v2 request; a page additionally binds `snapshotRevision` to the
current v3 snapshot. They contain opaque references and bounded event metadata
only, never gateway payloads, account identifiers or filesystem paths.

`logs.query` is explicitly read-only: its page keeps the snapshot revision
unchanged. A Host-private, expiring `log-cursor` binds the exact profile,
generation, connection target, snapshot revision, and canonical query
fingerprint; it is consumed once by the following page. Export creation yields
an expiring private `log-export` record. The additive v1 readback request and
acknowledgement consume that record once and expose no payload, path, URL, or
download handle to renderer code.
