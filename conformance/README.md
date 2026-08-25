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
UI extension catalog conformance covers the complete version-2 point
vocabulary, payload-family mapping, independent stability/availability,
generation-fenced surface origin, host-only contextual identity, and
deterministic ordering.
Extension-point status conformance freezes the version-5 three-axis model:
catalog `maturity`, versioned `adapterSupport`, and a separate runtime-context
snapshot. A supported stable point may be `not-mounted` without becoming
unverified; unsupported/unverified points cannot report an active context, and
legacy `availability` or live context fields are rejected from v5 descriptors.
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
