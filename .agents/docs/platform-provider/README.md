# Platform provider service v1

`platform-provider/v1` is the launcher-side contract for a plugin-owned
protocol adapter that is admitted into one Host-owned Platform Provider Fleet.
It does not expose the Fleet, a process launcher, a filesystem path, a secret,
a socket, an HTTP client, or a raw app-server client.

The public TypeScript entrypoint is
`@cordisx/protocol/platform-provider/v1`. Runtime manifest v9 is the first
manifest that may declare a `platform-provider` service.

## Manifest declaration

A v9 platform-provider service declares exactly six fields:

- one owner-local `id`;
- `kind: "platform-provider"`;
- `owner: "host"`;
- one canonical Protocol `schema` URL;
- one fixed `applicationMode`, either `service-restart` or `app-restart`; and
- one package-relative Node `entry`.

The Host must recognize and validate the exact schema before evaluating the
entry. A service cannot switch application mode based on submitted values.
Multiple configuration planes use distinct service ids and declarations. The
Host rejects duplicate ids across Channel and Platform provider services.

`owner: "host"` means configuration persistence, secure references,
application transactions, and external authority remain in the Host. It does
not make the service implementation Host product code. The plugin owns its
provider protocol mapping and its adapter factory through the public service.

## Source and generation ownership

The Host constructs one `ctx.platformProviders` for the exact source digest,
plugin id, service id, Host generation, and plugin generation. The plugin
cannot create or replace that owner. `register()` stamps every definition with
that context and returns a generation-bound handle.

The Host invokes the service entry with that context and a
`PlatformProviderServiceInputV1`. The input repeats the exact owner fence,
contains only closed per-provider factory configuration projections, and
carries an abort signal for candidate failure or generation retirement. The
entry may register definitions only while that signal and context remain
current.

The plugin supplies three cohesive values:

1. a provider descriptor with stable provider id, display name, implementation
   status, and closed operation list;
2. a model-id mapping that preserves complete `(providerId, modelId)` and
   `(providerId, remoteSessionId)` identity; and
3. a factory callback that creates the standard Platform adapter handle.

The Host clones and validates descriptor and mapping data before invoking the
factory. Duplicate source or public model ids, more than one enabled default,
provider-id drift, or generation drift fail before publication.

## Factory and broker boundary

The factory receives only the Host-stamped owner, provider id and generation,
the closed `platform-provider-factory-configuration/v1` projection, an
`AbortSignal`, and an owner-bound broker capability. That projection contains
only configuration revision, provider id/display name, enabled state, and
request timeout. In particular, endpoint, URL, host, headers, authorization,
cookies, environment, executable, process, working directory, filesystem path,
transport, client, Fleet, password, token, credential, and secret fields are
forbidden regardless of case or nesting. These values are absent structurally
from the schema and TypeScript type; redaction is not represented by a generic
JSON type claim.

The provider definition requests a method/schema subset. Before factory
invocation, the Host compares every requested tuple with its supported catalog
for the exact service schema, rejects any tuple absent from that catalog, then
clones, freezes, hashes, and issues the resulting policy. `catalogDigest` binds
the Host-supported catalog and `policyDigest` binds the issued subset. Every
binding joins
one normalized `PlatformProviderOperationV1`, one direction, one exact
provider-wire method, and the fixed broker value schema. A request or event
carries the same operation, method, and schema. The Host accepts it only when
that exact tuple exists in the policy and the operation also exists in the
provider descriptor. A `models.list` grant therefore cannot call an undeclared
session deletion method.

The policy digest is lowercase SHA-256 over UTF-8 `JSON.stringify()` of the
bindings normalized to arrays and sorted by their serialized form. Request
tuples are `[direction, operation, method, requestSchema, resultSchema]`; event
tuples are `[direction, operation, method, eventSchema, responseSchema]`. The
Host issues the policy only after checking the catalog, recomputing that digest,
and deep-freezing the normalized bindings.

The broker contributes no endpoint URL, headers, credential value, environment,
socket, process, generic `fetch`, raw client, or Fleet reference. Its bounded
values use the same recursive authority-field rejection as factory
configuration. The Host authenticates and transports each accepted exchange
and rejects undeclared methods or operations, schema drift, stale generations,
oversized values, and requests after disposal. Event subscription is likewise
operation-scoped; responding requires the exact event operation, method, and
response schema. A broker handle is opaque and is not persisted or used as
provider identity.

The adapter returns normalized Platform model, Session, turn, and lifecycle
values. Workspace authority uses an opaque Host-issued handle; neither task
input nor provider output carries a filesystem path. Provider-wire payloads
stay behind the adapter. Results exposed to the Fleet contain no broker handles
or raw request/response objects.

## Publication and lifecycle

The Host is the only authority that stages, publishes, replaces, or removes a
provider in the Fleet. A returned adapter is not active merely because its
factory resolved. The Host validates its provider id and generation, waits for
readiness, then publishes the complete registration or retains the prior
last-good generation.

Replacement, disable, failure, uninstall, and Host disposal first fence new
factory, broker, and adapter work. The Host aborts a factory still starting,
unsubscribes broker and lifecycle events, stops admission, waits for every
accepted operation to emit exactly one terminal event, calls `drain()`, and
calls `dispose()` exactly once. No event is delivered after unsubscribe, after
its operation's terminal event, or after disposal. Late factory, broker, or
adapter completion cannot publish a retired generation.

The lifecycle TypeScript union and JSON Schema use the same discriminants.
`turn.completed` and `turn.failed` are terminal; all other events are not.
Failed turns require a failure payload. Approval events require an approval
payload, with pending state only for `approval.required` and resolved state plus
an outcome for `approval.resolved`. Fields from another variant are rejected.

The Host may run several providers concurrently, but there remains one
Provider Fleet, one publication transaction, and one authority source. A
plugin must not construct another registry, start an external process, resolve
a secret, or fall back to the native current connection.

Platform provider Node services remain trusted local plugin code; this contract
does not claim to sandbox arbitrary Node execution. The issued broker policy
prevents undeclared use of Host-owned connection authority. Direct network,
process, filesystem, or secret access remains outside this service contract and
must be rejected by package review and the Host execution policy.

## Compatibility

Manifest and package v1 through v8 remain frozen. Manifest v9 adds only the
`platform-provider` service alternative and otherwise retains v8 capabilities
and Channel service declarations. Package v9 adds manifest v9 to the closed
runtime-manifest reference list. Older Hosts reject v9 rather than dropping its
service declaration.
