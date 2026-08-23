# Platform capability protocol v1

This specification is normative for adapter-neutral CordisX access to host
models, tasks, and turns. It defines the authority and result boundary even
when a host cannot safely bind the runtime API to its current connection.

## Invariants

1. A plugin declares every Platform capability before activation. A required
   declaration is a compatibility requirement, not an authorization grant.
2. Every call is authorized against the host-bound identity `(source, id)`.
   Call arguments never contain or override plugin identity.
3. The host owns policy, prompts, audit, parameter validation, scope
   enforcement, adapter selection, request scheduling, timeout, and stream
   coordination.
4. Plugins receive typed Platform operations and serializable results. They do
   not receive an Electron bridge, an MCP request function, an AppServer
   client, a transport, a scheduler, request identifiers, or stream internals.
5. A Codex adapter uses the Desktop instance's current connection and original
   data projection. It must not start a second app-server or a second AppHost.
6. A missing safe current-connection binding is `unavailable`, never an
   invitation to bypass the native request scheduler or fabricate data.
7. Current trusted renderer execution is policy enforcement at the CordisX API
   boundary. It is not a security sandbox.

## Versioned manifest declarations

A version-1 plugin manifest identifies its schema exactly and includes an
ordered, unique `capabilities` array. Each declaration contains:

- `name`: one of the closed version-1 capability names;
- `required`: whether denial blocks plugin activation;
- `reason`: retained `LocalizedText` from the UI/localization v1 contract;
- `scope`: the maximum authority requested by the plugin.

The version-1 names are:

| Capability | Authority |
| --- | --- |
| `models.read` | query models actually available for the current host, account, and provider |
| `tasks.catalog.read` | query task summaries |
| `tasks.content.read` | read one complete task projection |
| `tasks.create` | create a task, optionally with an initial turn |
| `tasks.control` | continue, fork, archive, restore, or delete a task |
| `turns.submit` | submit a new turn to a task |
| `turns.control` | steer or interrupt an in-flight turn |

`scope.providers`, `scope.cwdRoots`, and `scope.taskIds` are optional lists of
exact allowed values. An absent field requests no restriction for that
dimension; an empty field requests no values and is invalid. CWD matching uses
normalized absolute paths and path-segment containment, not string prefixes.
The broker intersects the declaration with the current user grant and rejects
parameters outside either bound before adapter dispatch.

Scopes may only narrow authority. A later manifest that adds a capability or
changes `required`, `reason`, or `scope` has a new declaration fingerprint and
starts at `ask`; an earlier `allow` must not silently cover the upgrade.

## Policy and activation

The persisted policy vocabulary is `ask`, `deny`, and `allow`.

- `ask` invokes a host-owned prompt for the current call. The call may be
  allowed or denied once without changing the persisted policy.
- `deny` rejects the call without adapter dispatch.
- `allow` authorizes calls within the declared and granted scope without a
  prompt.

The default for a new declaration is `ask`. Required declarations are never
auto-allowed. A required declaration with policy `deny` blocks the plugin and
produces a manager-visible reason. Denial of an optional declaration leaves
the plugin active and that feature must degrade explicitly. A plugin with no
matching declaration receives `permission-undeclared`.

Every decision records the bound identity, capability, declaration
fingerprint, policy, requested scope, outcome, and timestamp. Manager
projection includes required/optional, retained and resolved reason, scope,
policy, last use, last denial, denial count, and blocked reason. Reason text is
resolved at projection time so a locale-version change updates the manager
without changing the declaration.

## Adapter-neutral data model

Host, account, provider, model, task, turn, and content identifiers are opaque
strings. A model descriptor carries `hostId`, optional `accountId`,
`providerId`, model `id`, display label, and optional adapter-neutral feature
flags. Plugins must query models at call time and must not hard-code a provider
or model as a compatibility assumption.

A task summary carries its provider, model, CWD, lifecycle state, timestamps,
and opaque id. A complete task projection adds ordered turns and their content
items. Implementations may add optional data only through a future protocol
version; unknown required fields fail closed.

Every asynchronous operation resolves to exactly one `PlatformResult<T>`:

- `{ ok: true, value: T }`; or
- `{ ok: false, error: PlatformDiagnostic }`.

Stable diagnostics include permission undeclared/denied/scope denial, invalid
provider/model, task/turn not found, invalid request, adapter unavailable,
current-connection client unavailable, initial-turn failure, interrupted,
timeout, and internal adapter failure. Raw bridge errors, transport objects,
request ids, credentials, and user content not already requested by the plugin
must not appear in diagnostics.

## Runtime operations

The public runtime is grouped as `models`, `tasks`, and `turns`:

- `models.list({ providerId? })` requires `models.read`;
- `tasks.list({ providerId?, cwd? })` requires `tasks.catalog.read`;
- `tasks.read({ taskId })` requires `tasks.content.read`;
- `tasks.create({ providerId, modelId, cwd, initialMessage? })` requires
  `tasks.create`;
- `tasks.control({ action, taskId, ... })` requires `tasks.control`;
- `turns.submit({ taskId, message })` requires `turns.submit`;
- `turns.control({ action, taskId, turnId?, message? })` requires
  `turns.control`.

`tasks.control.action` is `continue`, `fork`, `archive`, `restore`, or
`delete`. `turns.control.action` is `steer` or `interrupt`.

Before task creation the host verifies that the requested provider and model
occur in the adapter's current model projection. A stale or unknown choice is
rejected; the adapter must not silently select a fallback model or provider.

## Two-phase task creation

Task creation is intentionally two phase. In the current Codex adapter the
first phase is `thread/start`; when `initialMessage` is present, the second is
`turn/start`. Other adapters may use different native operations but preserve
the same observable state machine.

The result is one of:

- `created`: the task exists and either no initial message was requested or
  the initial turn started;
- `created-initial-turn-failed`: the task exists but the initial turn did not
  start, including the task and a sanitized diagnostic.

The host must not silently archive or delete a task after phase-two failure.
Retry is an explicit later `turns.submit` call.

## Current connection and projection adapters

A writable adapter may dispatch only through a host-owned binding to the
Desktop's already-running request client. That binding must retain the native
scheduler, priorities, request-id allocation, timeout handling, lifecycle
events, approval flow, and stream owner/follower coordination. Reimplementing
the wire protocol over `electronBridge.sendMessageFromView`, posting a private
`mcp-request`, connecting to `connect-app-host`, or starting another app-server
is non-conforming.

A read-only projection adapter may consume immutable snapshots produced by the
existing host projection. It may implement `models.read`, task catalog, and
task content only when each snapshot is authoritative and complete for the
declared operation. DOM scraping of a visible subset is not a complete task
catalog or task-content implementation.

If neither binding is safely available, status reports
`current-connection-client-unavailable`; every affected call returns
`unavailable`. The adapter status must say whether it is `read-only` or
`read-write`, name the supported capabilities, and affirm that it created no
second connection and exposed no raw bridge.

## Security boundary and future marketplace work

Version 1 can enforce policy for cooperative calls through `ctx.platform`, but
trusted local renderer code can still inspect or mutate the Codex renderer and
host globals. Local storage is not a tamper-proof grant store in that threat
model. The implementation must state this limitation wherever permissions are
shown.

Marketplace safety requires structured host-rendered shell UI, isolated
Worker/iframe/process execution, capability RPC, authenticated package/source
identity, signed immutable artifacts, staged activation, and rollback. Those
items are not part of this Platform slice or proof that current plugins are
sandboxed.

## Compatibility and validation

Version 1 fails closed on an unknown schema version, capability, policy, scope
field, control action, required field, or result variant. Required coverage is:

- manifest schema and duplicate capability rejection;
- provider/model validation against current adapter data;
- `ask`/`deny`/`allow`, required/optional behavior, scope denial, declaration
  upgrade reset, and identity non-spoofing;
- two-phase task success and retained-task partial failure;
- adapter-unavailable diagnostics, no second app-server, and no raw bridge in
  the plugin service;
- permission reason reprojection after locale changes;
- exact disposal of broker state and subscriptions at plugin/generation end.

## Owning repositories and delivery order

1. This specification, manifest schema, vectors, and conformance land in
   `cordisx-protocol` on top of structured UI/localization v1.
2. `cordisx` lands the matching TypeScript contract, identity-bound Permission
   Broker, unavailable and controlled-projection adapters, manager permission
   tab, tests, and isolated renderer smoke.
3. A future private adapter PR may bind the current Desktop request client only
   after an auditable stable seat is available; that PR must not change the
   public contract.
4. `cordisxmono` updates exact pushed commits last in a separate commit.

No roadmap checkout is required for this public compatibility unit.
