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
5. A Codex current-connection adapter uses the Desktop instance's existing
   connection and original data projection. It must not start a second
   app-server or AppHost and call it the current connection.
6. An external provider-fleet adapter may own an independent, isolated
   connection only when its provider identity, lifecycle, persistence, and
   source attribution stay explicit end to end. It never becomes native task
   data and never changes current-connection availability.
7. A missing safe current-connection binding is `unavailable`, never an
   invitation to bypass the native request scheduler or fabricate data.
8. Current trusted renderer execution is policy enforcement at the CordisX API
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

`scope.providers`, `scope.cwdRoots`, and `scope.sessions` are optional lists of
exact allowed values. Every Platform session scope entry is the structured
pair `{ providerId, remoteSessionId }`; a naked task or session id is invalid.
`scope.sessionIds` is reserved for the Agent/Session runtime and must not
authorize Platform calls. Manifest v5 may use its closed Host-route binding
template for an optional Session-scoped Agent capability; every runtime
authorization scope remains an exact non-wildcard SessionId array. An absent field requests no restriction for
that dimension; an empty field requests no values and is invalid. CWD matching
uses normalized absolute paths and path-segment containment, not string
prefixes. The broker intersects the declaration with the current user grant
and rejects parameters outside either bound before adapter dispatch.

Scopes may only narrow authority. The authorization key is the canonical
tuple `(profileId, source, pluginId, capability, normalizedScope)`. A later
manifest that adds a capability or changes scope has a new key and starts at
`ask`; an earlier `allow` must not silently cover the upgrade. A source or
plugin-id change is a different identity and therefore also starts at `ask`.
`required` and localized `reason` remain declaration metadata rather than
authority-key material: changing either does not itself widen callable
authority, while their current values are always used for activation and UI.

## Policy and activation

The persisted policy vocabulary is `ask`, `deny`, and `allow`. A host-owned
prompt resolves `ask` to one of three call decisions:

- `allow-once` authorizes exactly the matching current broker request and is
  never written to configuration;
- `allow` changes the matching persisted policy to `allow` before dispatch;
- `deny` rejects the request without silently changing an existing persisted
  policy unless the user explicitly saves `deny` in manager UI.

The prompt's primary action is persistent `allow` (`Always allow`);
`allow-once` is secondary and deny is visually distinct. It carries only a
host-projected identity, declaration, scope, and operation summary. Plugin code
cannot render, answer, or spoof it.

Persisted `deny` rejects without adapter dispatch. Persisted `allow` authorizes
matching calls within the declared and granted scope without a prompt.

The default for a new declaration is `ask`. Required declarations are never
auto-allowed. A required declaration with policy `deny` blocks the plugin and
produces a manager-visible reason. Denial of an optional declaration leaves
the plugin active and that feature must degrade explicitly. A plugin with no
matching declaration receives `permission-undeclared`.

The persistent record is profile-local and contains canonical source/plugin
identity, capability, normalized scope, policy, and schema version. A
launcher/Host configuration writer owns it. The renderer receives only the
current profile's validated projection and a narrow mutation RPC; it never
receives the configuration path, arbitrary configuration data, or a general
writer. `allow-once` exists only in the in-memory Broker for the current
runtime generation and is cleared by consumption, disable, identity
replacement, or generation disposal.

`permission-policy.v1.schema.json` is the durable record.
`permission-authorization-plan.v1.schema.json` and
`permission-authorization-decision.v1.schema.json` are the host-owned batch
review boundary; their identity/profile fields are projections to be checked,
not caller-selectable authority.

### Install and enable authorization

Before installation activation or enabling a disabled package, the Host builds
one authorization plan from the normalized manifest. The plan contains every
required and optional declaration exactly once, its localized reason, scope,
current policy, and whether a new decision is needed. The Host presents that
plan as one flat, host-rendered review instead of sequential plugin-owned
prompts.

The user may persist `allow` or `deny` per declaration, keep `ask`, or issue an
`allow-once` decision. In a batch, one `allow-once` decision creates one
generation-bound ticket for the first matching Broker request after activation;
the ticket is consumed exactly once and is never durable. Persistent `allow`
is the default primary action. An unresolved or denied required declaration
blocks activation with an attributed reason. Optional denial or unresolved
optional authority does not block activation, and the plugin must degrade that
feature explicitly.

The plan/decision contract is shared by package installation and ordinary
enable/restore flows. It does not itself grant package download, signature,
filesystem, Marketplace, or code-loading authority; a Host without an
installer uses it only for already-present packages.

### Upgrade and migration

Policy lookup is exact on the normalized authorization key. Capability or
scope changes, profile changes, and source/id changes therefore return to
`ask`. Version 1 never treats a broader or differently serialized declaration
as an implicit match.

The legacy renderer-local policy ledger stored source/id, capability, and a
declaration fingerprint. A Host may migrate it only when identity parses
canonically and the fingerprint yields the exact current capability and
normalized scope. The current launcher profile is added to the new record;
`required` and `reason` are discarded as non-authority metadata. Malformed,
ambiguous, expanded, or identity-mismatched entries fail closed to `ask`.
Successfully migrated records are written atomically to Host configuration,
and the legacy copy is retired only after acknowledged write.

Every decision records the bound identity, capability, declaration
fingerprint, policy, complete requested model or session reference, adapter
generation, outcome, and timestamp. Manager projection includes
required/optional, retained and resolved reason, scope, policy, last target,
last use, last denial, denial count, and blocked reason. Reason text is
resolved at projection time so a locale-version change updates the manager
without changing the declaration.

### Permission manager projection

The host manager follows the shared
[manager content design](https://github.com/cordisx/cordisx/blob/main/.agents/docs/manager-content-design.md)
for headings, grouping, nesting, de-duplication, and contextual states. This
protocol adds only Platform-specific placement requirements: policy is shown
beside its selector, denial detail beside the affected declaration, adapter
diagnostics beside adapter status, and the trusted-renderer limitation once at
the permission/security boundary. Locale reprojection changes text without
duplicating any of those facts.

## Adapter-neutral data model

Host, account, provider-local session, model, turn, and content identifiers are
opaque strings. Provider ids are stable user-configuration ids unique within
one CordisX profile. Public identities are structured and never inferred from
an opaque local id:

- a model reference is `{ providerId, modelId }`;
- a session reference is `{ providerId, remoteSessionId }`.

The primary session key is exactly `(providerId, remoteSessionId)`. A router
may serialize that pair for an internal map or opaque cursor, but public calls,
stored rows, selected results, route state, permission scope, and audit carry
the structured pair. An adapter receives a naked `remoteSessionId` only after
the host resolved and generation-fenced its provider.

A model descriptor carries its model reference, `hostId`, optional
`accountId`, display label, and optional adapter-neutral feature flags. A
session summary carries its session reference, model reference, host/account,
CWD, lifecycle state, and timestamps. The session and model references in one
summary must have the same provider. A complete session projection adds
ordered turns and their content items. Plugins query models at call time and
must not hard-code a provider or model as a compatibility assumption.

`platform-model.v1.schema.json`, `platform-model-page.v1.schema.json`,
`platform-session.v1.schema.json`, and
`platform-session-page.v1.schema.json` are the machine-readable forms. A model
page may contain equal `modelId` values from different providers. A session
page may contain equal `remoteSessionId` values from different providers, but
must never contain a duplicate complete reference.

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

The public runtime remains grouped as `models`, `tasks`, and `turns` for
compatibility, while every routable identity is provider-aware:

- `models.list({ providerIds? })` requires `models.read` and returns model
  references;
- `tasks.list({ providerIds?, cwd?, searchTerm?, cursor?, limit? })` requires
  `tasks.catalog.read` and returns a query-bound session page;
- `tasks.read({ session })` requires `tasks.content.read`;
- `tasks.create({ model, cwd, initialMessage? })` requires `tasks.create`;
- `tasks.control({ action, session, ... })` requires `tasks.control`;
- `turns.submit({ session, message })` requires `turns.submit`;
- `turns.control({ action, session, turnId?, message? })` requires
  `turns.control`.

`tasks.control.action` is `continue`, `fork`, `archive`, `restore`, or
`delete`. `turns.control.action` is `steer` or `interrupt`.

Before task creation the host resolves `model.providerId`, generation-fences
the adapter, and verifies the complete model reference against that provider's
current model projection. A stale or unknown choice is rejected; the adapter
must not silently select a fallback model or provider. Creation returns a
complete session reference before an optional initial turn is submitted.

List/search fans out only to authorized providers and merges deterministic
results without dropping provider identity. Provider order does not change the
query identity. A cursor is opaque and bound to normalized provider filters,
CWD, search term, limit, adapter generations, and the snapshot from which it
was issued. Reusing it with another query or after an incompatible generation
change fails as `invalid-request`; the host never silently resumes a different
provider's page.

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

## Current connection and provider-fleet adapters

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

An external provider-fleet adapter is a separate connection class. The
launcher owns its process, provider-specific persistence root, credentials,
timeouts, cancellation, generation drain, and cleanup. The renderer sees only
validated Platform operations and sanitized results through a private,
bounded, host-owned RPC. It never receives credentials, child handles, raw
app-server messages, transports, or a general bridge.

A provider connection backed by CLIProxyAPI may use a provider-specific Codex
app-server to supply agent session persistence, history, search, resume, and
control while CLIProxyAPI supplies the Responses inference endpoint. Both the
app-server and its data root are isolated from the Desktop current connection.
The provider stays visibly external and source-attributed; its health cannot
change an unavailable native adapter to available. A Responses gateway alone
is not a durable CordisX session catalog and must not fabricate one.

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
- provider/model validation against resolved adapter data;
- `ask`/`deny`/`allow`, required/optional behavior, scope denial, declaration
  upgrade reset, and identity non-spoofing;
- two-phase task success and retained-task partial failure;
- native adapter-unavailable diagnostics, no native impersonation, and no raw
  bridge in the plugin service;
- permission reason reprojection after locale changes;
- manager projection fact placement defined above and host conformance with the
  shared manager content design;
- exact disposal of broker state and subscriptions at plugin/generation end.

Authorization-duration and activation coverage additionally includes:

- runtime `allow-once`, persistent `allow`, and deny, with persistent allow as
  the default primary prompt action;
- no configuration write for `allow-once`, exactly one matching call per
  activation ticket, and ticket cleanup at disable/generation replacement;
- profile/source/id/capability/scope separation, capability/scope upgrade
  re-prompt, and fail-closed legacy migration;
- one install/enable plan containing required and optional declarations,
  required denial blocking, optional denial degradation, and no plugin-owned
  prompt or identity field;
- atomic launcher persistence through a bounded RPC, invalid identity/scope
  rejection, and no configuration path or general writer in renderer/plugin
  APIs;
- manager adjustment of `ask`/`allow`/`deny` and prompt/plan keyboard, focus,
  heading, light-theme, and dark-theme behavior.

Provider-fleet conformance additionally covers duplicate provider rejection,
generation replacement/drain, equal local model/session ids across providers,
query-bound cursor rejection, complete-reference routing for read/resume/
fork/archive/restore/delete/submit/steer/interrupt, and provider-specific
persistence. External health must not upgrade a native current-connection
adapter from `unavailable`.

The Agent event ledger retains its provider-neutral `sessionId`. If a host
later connects a Platform session to an Agent session, it owns and persists an
explicit reference between the two identities. No public contract derives one
from the other, and private or experimental adapter context fields are not
part of either protocol.

## Owning repositories and delivery order

1. This specification, permission policy/authorization-plan schemas, vectors,
   and conformance land in `cordisx-protocol`. No Agent event or Agent Trace
   contract changes are part of this slice.
2. `cordisx` lands the matching TypeScript contract, profile-scoped Permission
   Broker persistence, narrow launcher RPC, enable/restore authorization UI,
   runtime prompt, manager policy editing, tests, and isolated renderer smoke.
3. A CLIProxyAPI connection adapter uses an independent provider-specific
   store and app-server, while its renderer plugin uses only `ctx.platform`
   and the existing page/route/outlet system.
4. A future installer may call the same authorization-plan boundary before
   activating an authenticated package; package acquisition, signing, and
   rollback remain outside this slice.
5. A future private adapter PR may bind the Desktop current connection only
   after an auditable stable seat is available; that PR must not change the
   public contract or reuse an external provider connection.
6. `cordisxmono` updates exact merged commits last in a separate commit.

No roadmap checkout is required for this public compatibility unit.
