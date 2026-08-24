# Conformance

Implementation-independent compatibility fixtures and expected outcomes belong here.

Run `npm run check` for marketplace schema, canonical identity, tuple
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
Manager settings conformance separately covers surface version 4 and catalog
version 3 so the closed version-2/version-3 vocabularies remain unchanged. It
validates structured host headers, ordering/collisions, same-owner route/page
dependencies, pending states, body-only outlet policy, access origin, and
lifecycle cleanup/fallback.
Channel runtime conformance covers manifest-v2 compatibility, manifest-v3
service configuration declarations, capability identity/family scopes,
sourced user-only input, complete binding lineage, redacted runtime and config
Manager projections, connection/route integrity, bounded retry ordering, and one
active binding per endpoint/route. It does not claim transport exactly-once
behavior or that a real credentialed adapter exists.
Plugin configuration conformance covers redacted descriptors, profile/plugin/
generation scope, revision-fenced JSON mutations, last-good ordering, reserved
secret roles, owner-bounded namespace renderers, and closed result outcomes.
Plugin lifecycle conformance covers package/runtime identity, exact and acyclic
dependency graphs, enabled dependency readiness, activation/last-good ordering,
absolute local input boundaries, matching permission decisions, minimum apply
scope, safe share availability, and path/secret-free results and snapshots.
Plugin Console conformance covers owner/generation isolation, ordered immutable
lines, zero-touch Host call phases, permission projection, terminal uniqueness,
and the rule that success cannot precede real Host dispatch.
