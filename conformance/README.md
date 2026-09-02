# Conformance

Implementation-independent compatibility fixtures and expected outcomes belong here.

Run `npm run check` for marketplace schema, canonical identity, source import, tuple
uniqueness, deterministic ordering, structured UI schemas, route/outlet path
compatibility, native sidebar menu fail-pending projection, unique identities,
structured app/main page headers, body-only mount boundaries, reference
integrity, body-only page chrome outlet compatibility, structured route-toggle
projection, Platform manifest capabilities/scopes, composite model/session
identity, query-bound pages, declaration fingerprints, host extension-point descriptor
identity, canonical point policy, surface/outlet/page-header authorization
origin, and downgrade behavior.
Agent-event conformance additionally covers per-session sequence, stable event
identity, provenance/source consistency, causal ordering, delivery transitions,
snapshot pagination, and rejection of host-specific public fields.
Agent-history conformance covers privacy-bounded historical pages, allowed
version-2 projections, payload-policy clamping, source identity, coverage, and
path/offset/provider leakage rejection.
Agent/Session runtime conformance additively covers create/resume collision
semantics, `AgentId = SessionId`, MessageId-only admission, pending-message
discard, fixed Session snapshots, contiguous replay-to-live delivery,
first-terminal subscription closure, and exact Agent-scoped approval identity.
These checks do not delete or replace AgentLoop v1-v4 conformance.
UI extension catalog conformance covers the complete version-2 point
vocabulary, payload-family mapping, independent stability/availability,
generation-fenced surface origin, host-only contextual identity, and
deterministic ordering.
Extension-point status conformance freezes the version-5 three-axis model:
catalog `maturity`, versioned `adapterSupport`, and a separate runtime-context
snapshot. A supported stable point may be `not-mounted` without becoming
unverified; unsupported/unverified points cannot report an active context, and
legacy `availability` or live context fields are rejected from v5 descriptors.
Extension-point control conformance freezes four separate claim,
authorization, Host point-policy, and runtime-selection layers. It covers exact
partial denials, explicit reciprocal mode coexistence, exclusive user/Host
selection, renderer-safe scalar properties, Host-brokered commands,
no-data command acknowledgements, Host-projected scalar events, owner- and
generation-stamped decisions, transitive parent suppression/recovery, retention
of an underlying denial while its descendant is suppressed, and the
legacy structured compose-only downgrade. It rejects DOM/selector/callback
authority, incomplete snapshots, group-level cardinality/decision drift,
registration-order ties, cross-owner principal spoofing, and any legacy
escalation into a new control mode. Host-priority vectors also freeze the
non-empty top-winner rule and the empty native/none fallback, while principal
vectors permit separate explicit and legacy handles for the same owner but
reject handle reuse across either origin.
Icon theme conformance freezes the closed 64-key version-1 semantic catalog,
including distinct trust provenance plus Manager action, content, and agent-turn
control semantics,
`builtin:reicon` default/fallback exact profile/version/generation pins,
principal-derived provider ids, no-geometry complete-coverage proofs, partial
tuple misses, exact request and generation correlation, normalized-command
versus raw-path/SVG boundaries, operation-specific lifecycle outcomes, and
generation-fenced registration, selection, disposal, and rollback. It rejects
stale/late transitions, renderer/framework authority, executable or markup
fields, local/network asset references, and provider identity assertions in
results. Semantic keys carry no user text or raw publisher/source identity, and
complete coverage proves all 1,536 key/variant/state tuples. Alias vectors
reject visually convenient substitution across the normative semantic table.
This is
protocol-only evidence, not Host interoperability evidence.
Manager settings conformance separately covers surface version 4 and catalog
version 3 so the closed version-2/version-3 vocabularies remain unchanged. It
validates structured host headers, ordering/collisions, same-owner route/page
dependencies, pending states, body-only outlet policy, access origin, and
lifecycle cleanup/fallback.
Manager content navigation conformance covers the additive generic subroute
declaration and Host-only renderer-safe projection: route parameters, parent
hierarchy, dynamic record title redaction shape, exact tab route mapping, and
Host-derived breadcrumb/back/history states. It rejects DOM, selectors,
secrets, raw bridges, and plugin-controlled history.
Manager collection conformance covers generic Host-rendered body collections:
stable views, exact title/summary search, Host-owned normalized queries,
source snapshot fences, same-owner routes, unique rows/actions, predecessor
actions, Host text-input argument injection, danger confirmation, closed
results, and lifecycle-safe data with no private renderer handles.
Manager Content navigation v2 conformance preserves the v1 declaration and
projection rules while checking explicit tab-label precedence, absent-label
route-title derivation, the shared identity domain, and rejection of v1 label
smuggling or undeclared tab descriptions.
Channel runtime conformance covers manifest-v2 compatibility, manifest-v3
service configuration declarations, capability identity/family scopes,
sourced user-only input, complete binding lineage, redacted runtime and config
Manager projections, connection/route integrity, bounded retry ordering, and one
active binding per endpoint/route. It does not claim transport exactly-once
behavior or that a real credentialed adapter exists.
Channel task gateway conformance covers path-free launch requests, absolute
workspace resolution, exact selector/source/generation/revision binding,
Host-issued single-use grants, partial create preservation, complete-session
dispatch correlation, contiguous lifecycle replay, unique terminal turns, and
raw provider payload rejection. It is launcher-private prerequisite evidence,
not renderer availability or a real provider smoke.
Connector service conformance covers versioned descriptors, exact
registration/generation identity, per-command capability matching, opaque
conversation/run handles, structured inbound/outbound messages, contiguous
events, and terminal disposal. It rejects Room, task, UI, model, provider,
workspace, secret, callback, DOM, raw-bridge, and path fields.
Connector client conformance covers public discovery/execute/subscribe
exchanges, Host-issued principal/user authorization, bounded denied and
unavailable outcomes, run-to-conversation binding, registration replacement
and disposal fencing, redacted snapshots, and serialized snapshot replay before
live consumption. It rejects raw bridges and a second connection surface.
Bound Connector client conformance freezes the plugin-visible Host-injected
surface separately from the Host-only principal/user/authorization binding. It
requires exact registration-qualified run bindings, an ordered subscription
page stream with unsubscribe/dispose lifetime, replay through the fixed
snapshot before live pages, and no caller identity construction by plugins.
Agent Avatar conformance freezes trim plus Unicode NFC normalization, UTF-8
byte-length namespace encoding, the fixed unknown seed, closed reference
variants, immutable clone/freeze behavior, explicit and inherited definition
precedence, generated child-identity fallback, and typed unsupported resolution.
It rejects raw URLs, filesystem paths, data/base64 payloads, oversized refs,
non-canonical seeds, and unknown algorithms, schemas, or versions.
Agent Conversation Shell conformance preserves the frozen v1 wire contract and
exercises the explicit v2 successor. V2 checks exact Agent participant identity,
fixed `memberId` to `participantId` mapping, exact active-run/presence triples,
message provenance, reaction and presence state transitions, replacement versus
incremental convergence, and shared AgentLoop v2 details-URL canonicalization.
It rejects percent-encoded unreserved characters, default ports, dot segments,
cross-participant associations, stale updates, callbacks, DOM, and renderer data.
Agent Conversation Shell v4 conformance exercises the additive
Session-compatible successor: exact Session ids and event sequences, optional
structured Agent detail references, Session-scoped approval identity,
self-introduction Session/message correlation, structured-clone safety, and
first-terminal subscription closure. It rejects legacy source strings,
AgentLoop binding/turn/details fields, raw URLs, external project names, and any
byte change to the complete public v3 Shell family.
Agent Loop v1 conformance preserves the formal catalog, task binding,
per-client command idempotency, and ordered event behavior. Agent Loop v2
conformance covers the bounded self-contained definition catalog,
field inheritance vocabulary, exact task binding and authorization
correlation, owner-provider durable command replay across client recreation,
provider-private bounded retention, independent multi-binding fan-out,
text/image-reference content, proactive message/approval/lifecycle events,
per-binding-generation replay/live ordering, terminal closure, and the direct
persisted task-details URL returned by every accepted create or explicit bind.
Task-details fixtures freeze the target/scheme allowlist, 2048-character and
canonical-form boundary, two-client/two-binding isolation, atomic generation
replacement, and fail-closed active-provider-association cleanup after provider
replacement, disable, uninstall, binding closure, or client disposal. This
active authority model does not constrain Chatroom's durable history: a closed
run may retain its persisted URL. The fixtures reject unsafe URL syntax,
stale/cross-client/cross-binding access, forged capabilities, missing details
resources, and task body, prompt, CLI, provider trace, route, path, or token
fields. Agent Loop exposes no navigation operation. It is Protocol-only
evidence and does not prove Host/Chatroom wiring or image rendering.
Plugin configuration conformance covers closed v1 mode compatibility, explicit
v2 live/plugin/service/app restart modes, staged app-restart results, redacted
descriptors, profile/plugin/generation scope, revision-fenced JSON mutations,
last-good ordering, reserved secret roles, owner-bounded namespace renderers,
closed result outcomes, and closed form-presentation metadata: unique field
paths plus Host-owned semantic group, icon, and action hints without DOM or
renderer authority.
Service configuration conformance covers plugin/service ownership, form-safe
schema projection, exact CAS/generation scope, fixed service/app restart
planes, desired-versus-active startup state, CLIProxy composite-provider model
mapping, and complete secret-reference removal from renderer-safe documents.
Plugin lifecycle conformance covers package/runtime identity, exact and acyclic
dependency graphs, enabled dependency readiness, activation/last-good ordering,
explicit local directory/package/downloaded-tarball input boundaries, separate
runtime-manifest integrity, unsupported-signature and remote-source rejection,
matching permission decisions, minimum apply scope, safe share availability,
and path/secret-free results and snapshots. Normative lifecycle text additionally
fixes staged-registry readiness, whole-closure atomic publish, token-to-complete
activation-tuple fencing, and last-good recovery without exposing private plans.
Plugin Console conformance covers owner/generation isolation, ordered immutable
lines, issuance-bound principal/effective-owner attribution, capture coverage,
variadic Console argument snapshots, zero-touch Host call phases, permission
projection, terminal uniqueness, and the rule that success cannot precede real
Host dispatch.

Permission v4 conformance freezes the complete 25-entry catalog, preserves the
original 22 capabilities as non-DOM, and separates structured rendering from
`ui.host-dom.read` and `ui.host-dom.modify`. It validates canonical root and
closed-operation scope families, structured rationale/security declarations,
four independent Official/Certified states, exact Certified projection
matching, persistent-deny precedence, explicit decisions, exact leases, and
artifact/certification/scope/Host-runtime-module generation/disable/uninstall
invalidation. Bridge vectors reject unknown or cross-root access, widening,
selectors, raw nodes/HTML, script, style/event handlers, and private bridges.
Modify-only conformance additionally proves that an omitted node targets only
the acquired canonical root without granting read access.
