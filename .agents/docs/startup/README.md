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
`provider-published`; all capabilities MUST require `service-ready`.

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
`when-selected` starts when explicitly selected or required by a dependency;
`always` starts and joins the launch barrier. With no explicit target the Host
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
when publication v1 requires a default route; report `catalog-empty` for execute.

Actions are independently available or carry one bounded reason. Authentication
can be available while execute is unavailable. `execute` requires current
binding, authorization, successful readiness, valid publication for a provider,
and a nonempty provider catalog; exact-model admission additionally checks
membership and reports `model-unavailable`. Non-provider execution does not
require a provider catalog. Host authorization and actual operation support
always apply, including to page actions with empty `requires`. Page `observes`
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
`StartupManagedServiceNodeModuleV1.apply` with an owner/service-bound
`input.startup` reporter. Milestones are scoped to declared capability and the
exact host/plugin/service generation. Sequence is positive and strictly
increasing per capability/milestone/generation. Reports are absolute states;
newer `failed` revokes satisfaction. Rejected reports have no side effects.
Reports cannot set Host health, authentication, catalog, publication or global
ready. Renderer code and other service owners cannot obtain the reporter.
Disposal/revocation invalidates it before cleanup; cancellation fences late work.

Hosts not supporting v15 reject the required schema. Producers needing older
Hosts must supply a separately validated legacy package with its original
blocking behavior; silently stripping `startup` is forbidden. V15 cannot grant
background semantics to old plugins by reinterpretation. Package version stays
independent of schema versions; no package publication is implied by this spec.

## Security and evidence

Declaration admission precedes code execution. Identity, graph and owner checks
prevent provider squatting and milestone spoofing; generation and cursor checks
prevent replay and scope leakage. Observation remains useful without broker
secrets. Existing service grants and explicit user-gesture requirements govern
authentication controls. Capability readiness is not an authorization token.
Protocol schema/type fixtures and reference-model conformance check these rules;
real Host scheduling, atomic updates and UI continuity need consumer tests.
