# Progressive startup v1

Status: experimental normative contract; Protocol conformance does not establish
Host adoption. Public imports are `@cordisx/protocol/startup/v1` (safe observer,
declaration and report values) and `@cordisx/protocol/startup-runtime/v1`
(Node module entry). Manifest/package v15 opt in; v14 and earlier stay frozen.

## Admission and ownership

`startup` is required in manifest v15. A declaration contains zero or more
capabilities, each owned by one declared service, and zero or more pages. A
provider capability additionally fixes its `providerId` and symbolic
`compositionOrigin`. These are execution ownership declarations, independent
of branding. Multiple providers and non-provider capabilities may share a
service. An empty declaration does not turn legacy undeclared services into
background services: services without a capability retain blocking behavior.

The Host MUST reject duplicate capability ids within a plugin, duplicate
provider ids across the admitted graph, unknown service ids, unknown capability
dependencies, self-dependencies and dependency cycles. Cross-plugin dependencies
must also be allowed by the existing exact package dependency and service grant
contracts; a startup reference adds no grant. Validate the complete candidate
and dependent closure before activation or an update transaction commits.
Milestone ids, page ids and action ids within each page are unique. Every
milestone condition names a locally declared milestone. Every page observation
and action requirement resolves to an admitted capability. Provider-only
conditions (`catalog-known`, `provider-published`) are invalid for non-provider
capabilities. A provider MUST require `service-ready`, `catalog-known` and
`provider-published`; all capabilities MUST require `service-ready`. Providers and capabilities with
Node milestones MUST be owned by a declared managed-backend service.

`success.allOf` is a nonempty conjunction. Host-owned `service-ready` checks the
existing backend readiness and health; `authenticated` checks the existing
service authentication contract (including not-required). `catalog-known`
means completed current-generation discovery, including a known empty catalog;
`provider-published` means a current, validated native publication. Neither
process liveness nor registration alone establishes readiness. `milestone`
requires a satisfied report from this capability's owning Node service.
Existing backend definition v1, health/authentication probes and publication
wire remain unchanged. Where authentication is required for execution, the
Host enforces it even if a declaration omits `authenticated`.

For an opted-in provider, `publishNativeProvider` MUST match the admitted
plugin, service, current host/plugin/service generations, provider id and
composition origin; the origin must also exist in the backend definition.
Reject undeclared or cross-owner publication before exposing routes. A
presentation contribution does not create or revive an execution identity.

## Waiting and adoption

`wait.interactive` and `wait.command` select the corresponding launch mode.
`background` starts preparation without adding a launch barrier;
`when-selected` joins a wait only when selected or required by a target;
`always` joins the launch barrier. All enabled admitted services prepare in the
background normally, including `when-selected`; waiting policy MUST NOT be used
to infer lazy/on-demand startup. No on-demand startup contract is introduced. With no explicit target the Host
waits only for its core, legacy blocking services, and applicable `always`
closures. An explicit provider/model target MUST wait for that exact capability
and its dependency closure regardless of its policy; missing, failed, unauthenticated,
empty or incompatible targets MUST NOT fall back to a different provider/model.
An explicit model without provider must resolve uniquely under the Host's
existing identity rules, or fail as ambiguous; names are not identity evidence.

Core/window availability, page registration, observation, and login navigation
MUST NOT wait for provider success. A command's successful completion separately
requires its target and requested action to become available. Authentication
requirements and timeout retain an otherwise healthy Host and usable navigation.
Once the authoritative target or any necessary dependency is known missing,
failed, stopped, revoked, authentication-required, catalog-empty or missing the
exact requested model, the command MUST finish with the corresponding unavailable
or authentication outcome promptly; it MUST NOT wait for the general timeout or
for unrelated services. Temporary preparation/catalog discovery may continue to
wait within the command deadline. A known-empty catalog is not temporary discovery.
Neither command failure nor a retry request clears drafts, changes selection,
stops a healthy Host, or initiates authentication without the existing authority.

Base component adoption preserves existing same-plugin and Cordis-context
cleanup atomicity and update transactions. Provider success is evaluated after
that adoption without splitting its cleanup ownership. Do not change an App's
effective fingerprint semantics to simulate readiness. Independent waiters may
share one preparation and existing Host, but cancellation, timeout, or lease
release by one waiter cannot cancel another's demand or stop a borrowed process.
Late results cannot satisfy a replacement generation.

## Observation and actions

A Host may supply `StartupContextV1.startup` to an authorized renderer before
execution binding exists. The facade is bound to an immutable authorized scope;
callers cannot choose another scope by editing a cursor. It exposes declared
identities and safe projections only, never credentials, ports, origin URLs,
registration handles, execution bindings, factories or arbitrary diagnostics.
The owning plugin can observe declared page requirements; a Host-owned selector
may receive a broader provider scope. An observation reference grants no
execution, authentication or cross-owner management permission.

The independent service, process, health, authentication, catalog, publication
and milestone fields describe evidence. `unknown` is lack of an admitted target;
`declared` precedes preparation; `preparing` means work remains; `auth-required`
and `catalog-pending` identify those outstanding requirements; `ready` requires
all conditions and dependencies. Failure, stopped and revoked override ready.
For deterministic summary precedence use revoked, stopped, failed,
auth-required, catalog-pending, preparing, ready after distinguishing unknown
and declared. Catalog `known` with `modelIds: []` is never pending. An empty
catalog cannot enable execute and cannot produce a valid native publication
when publication v1 requires a default route. The capability summary is `failed`
when its current known catalog is empty, while the independent service, process,
health and authentication evidence stays unchanged; execute reports `catalog-empty`.
Here `failed` means the declared execution success cannot currently be met, not
that the backend process failed. Later valid discovery may recover this capability
without restarting a healthy service.

Actions are independently available or carry one bounded reason. Authentication
can be available while execute is unavailable. `execute` requires current
binding, authorization, successful readiness, valid publication for a provider,
and a nonempty provider catalog; exact-model admission additionally checks
membership and reports `model-unavailable`. Non-provider execution does not
require a provider catalog. Host authorization and actual operation support
always apply, including to page actions with empty `requires`. Generic page action ids may
represent refresh, logout, read-status or other existing operations; declaration
alone never implements an operation or grants its authority. Hosts intersect
requirements with the existing operation support, bound capability and required
user gesture. The fixed execute/authenticate/retry summary is not an exhaustive
operation inventory and cannot authorize an undeclared page action. Page `observes`
never gates navigation; action `requires` gates only that action. An unavailable
action never hides the page, clears a draft, or substitutes a selection.

## Cursor, replacement and terminal rules

Each full snapshot has scope identity, host generation, epoch and a nonnegative
safe-integer sequence. Rows carry exact capability identity and host/plugin/service
generation; null plugin/service generation represents unavailable admission or
registration, never a wildcard. Rows and page actions have unique identities.
Sequences increase within one scope/host/epoch; epochs are opaque and change
when a retained history cannot be continued. Never numerically compare epochs.

`subscribe` installs observation atomically with its initial replay/reset. With
no cursor it delivers `initial`; a valid retained cursor delivers all newer
snapshots in order and then live changes, with no read/subscribe race. Expired
history or a future sequence resets with a full `gap` snapshot; epoch mismatch
resets with `epoch-changed`. Cross-scope/host cursors MUST be rejected, not used
to select authority. Consumers replace the whole snapshot on resets, reject
old/duplicate sequences within an epoch, and discard replaced row generations.
A full snapshot removes entries absent from the new admitted set. Execution
binding replacement is observable through generations even if identity is stable.

Transport connection is a separate `connection` event, with state `connected`,
`disconnected` or `reconnecting`. Temporary loss carries only the bounded reason
`transport-unavailable` or `timeout`; no raw error or endpoint is exposed.
Connection events have no authority cursor and MUST NOT increment authority
sequence, replace the last snapshot, set a service to failed/unknown, or create
readiness. The bridge reports observed connectivity and retains the last
successful snapshot while reconnecting. It resumes using the last accepted
cursor and applies replay/gap/epoch rules before claiming current state. A
`connected` event indicates transport only, not readiness or fresh authority.
A subscription may remain open across transient loss; explicit scope revocation
or Host replacement is terminal even if transport can reconnect. Consumers
present connection state alongside the last authoritative snapshot and preserve
drafts/selections. Hosts unable to distinguish a transient failure from
revocation must not invent revocation or silently grant a replacement scope.

Exactly one `closed` event terminates a subscription on explicit close/abort,
scope revocation or Host replacement. No later callback is allowed. Closing or
aborting observation never stops preparation. A target becoming stopped/revoked
is an ordinary update; it does not close unrelated scope entries. After
scope/Host termination, acquire a newly authorized observer and read/subscribe
afresh. Do not silently resurrect the old authority. A new generation can
recover failed/stopped targets; stale completions and reports cannot revive the
old generation. Consumers preserve draft and selection state while replacing
observation and execution binding handles.

## Node milestones and compatibility

For opted-in managed-backend modules, the Host invokes
`StartupManagedServiceNodeModuleV1.apply` with the unchanged v1 base input.
The Host MUST await base apply and the existing component adoption transaction;
apply registers definitions, context providers and bounded cleanup ownership.
It MUST NOT detach or skip awaiting apply. Opted-in modules move lengthy provider
preparation to the required `prepare(context, input)` callback. After adoption,
the Host schedules one prepare per admitted capability and current generation,
providing the exact declaration, current registration, owner/client, signal and
owner/service/capability-bound `input.startup` reporter. The Host prepares enabled
capabilities in the background, ordering their required dependency closures;
it does not run a capability's prepare before its dependencies succeed.
A rejected dependency fails dependents without running their prepare. Independent
capabilities may progress separately, including capabilities of one service.
Shared service registration/process work is deduplicated; provider-specific
work and success remain independent. Fulfillment of prepare is necessary but not sufficient for ready; the Host
still checks every declared success condition. Reports arriving before prepare
fulfills may update observation but cannot complete readiness. Rejection
fails that capability; it does not falsely undo successful base adoption or
satisfy another capability. Update/disposal aborts all owned preparation before
atomic component cleanup. A retry creates a fresh Host-bound preparation attempt,
revokes the old attempt's reporter and aborts its signal before admitting new
reports or accepting completion. This attempt fence is opaque capability authority,
not a new serialized field and not permission to rotate the service generation,
restart the process, replace the registration, or rerun base apply. For a retry
within the same host/plugin/service generation, accepted milestone/catalog sequence
floors remain monotonic; the owner chooses newer values. The Host rejects a report
through a revoked old reporter even if its serialized generation and sequence look
current. A late old callback cannot complete the new attempt. Replacement of a
service/plugin/Host uses the existing generation and cleanup rules. Independent
capabilities and waiters retain their demand and leases across another's retry.
The `retry` action is available only when an existing authorized operation can
perform this bounded retry; a status projection alone grants no retry authority.
Old v14 modules keep their awaited blocking apply semantics. Milestones are scoped to declared capability and the
exact host/plugin/service generation. Sequence is positive and strictly
increasing per capability/milestone/generation. Reports are absolute states;
newer `failed` revokes satisfaction. Rejected reports have no side effects.
Milestone reports cannot set Host health, authentication, catalog, publication
or global ready. Renderer code and other service owners cannot obtain the reporter.
Disposal/revocation invalidates it before cleanup; cancellation fences late work.

Hosts not supporting v15 reject the required schema. Producers needing older
Hosts must supply a separately validated legacy package with its original
blocking behavior; silently stripping `startup` is forbidden. V15 cannot grant
background semantics to old plugins by reinterpretation. Package version stays
independent of schema versions; no package publication is implied by this spec.

## Catalog discovery reports

`StartupReporterV1.reportCatalog` accepts `startup-catalog-report/v1` only from
the provider capability's bound Node prepare owner. It uses the same exact
generation/target fencing as milestones and a distinct strictly increasing
positive catalog sequence per capability/generation. `pending` and `failed`
report discovery, not process or authentication status. `known` includes an
opaque catalog generation, distinct nonempty model alias strings (up to 4096),
and a digest; an empty array is valid completed discovery. The Host validates
schema, identity, generation, sequence and digest before replacing observation.
The digest is `sha256:` plus lowercase SHA-256 of UTF-8 compact JSON
`[generation, sortedModelIds]`, sorting exact aliases by UTF-8 byte order.
No normalization, implicit aliases or model-name heuristics are permitted.
Invalid reports have no side effects and cannot advance the accepted sequence.

Discovery is independent of native publication. A nonempty catalog alone cannot
enable execution; real publication, binding and all success conditions still
apply. Publication must match the current discovery catalog generation and exact
alias set, in addition to existing publication v1 catalog digest validation.
A changed, pending or failed discovery invalidates the old publication for
readiness and admission; an identical known report does not create authority.
Empty discovery revokes executable routes and reports `catalog-empty`, without
inventing a default route or publishing an invalid v1 catalog. Existing v1
publication wire and its nonempty/default-route requirement are unchanged.

## Security and evidence

Declaration admission precedes code execution. Identity, graph and owner checks
prevent provider squatting and milestone spoofing; generation and cursor checks
prevent replay and scope leakage. Observation remains useful without broker
secrets. Existing service grants and explicit user-gesture requirements govern
authentication controls. Capability readiness is not an authorization token.
Protocol schema/type fixtures and reference-model conformance check these rules;
real Host scheduling, atomic updates and UI continuity need consumer tests.
