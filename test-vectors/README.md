# Test Vectors

Deterministic manifest, package identity, signature, grant, activation, and compatibility vectors belong here.

Marketplace v1 vectors live in `marketplace/valid`, `marketplace/invalid`, and
`marketplace/feeds`.

Structured UI v1 suites live in `ui/valid` and `ui/invalid` and cover commands,
surface entries, distinct native sidebar menu points, routes, pages, host
outlets, structured app/main page headers, body-only mount boundaries, and
semantic reference rules.

Platform v1 manifests live in `platform/valid` and `platform/invalid` and cover
capability declarations, required reasons, closed scopes, structured session
authority, and unique names. `platform/model-pages` and
`platform/session-pages` cover provider-aware identities, equal provider-local
ids, query binding, model/session provider consistency, and duplicate complete
reference rejection.

Extension-point management v1 suites live in `extension-points/valid` and
`extension-points/invalid` and cover host descriptors, cross-family identity,
canonical plugin/point policy, compatible default access, surface command
origin, and outlet route/page plus page-header command enforcement phases.

Agent-event v1 suites live in `agent-events/valid` and `agent-events/invalid`.
The complete valid page is the stacked-consumer fixture for event identity,
message delivery, chunk boundaries, paging, provenance, and causal parents.

Agent-event v2 suites live in `agent-events-v2/valid` and
`agent-events-v2/invalid`; delivery snapshot suites live in
`agent-delivery/valid` and `agent-delivery/invalid`. They cover stable delivery
ids, owner/generation fencing, cancellable boundaries, terminal idempotence,
and successful pre-step/prompt contribution lifecycle.

Agent-history v1 suites live in `agent-history/valid` and
`agent-history/invalid`. They cover bounded historical pages, privacy/source
invariants, payload policy, and rejection of unprovable CordisX lifecycle
events.

UI extension catalog suites live in `ui-extension-catalog/valid` and
`ui-extension-catalog/invalid`. They cover every version-2 surface/outlet id,
payload-family mapping, semantic composer anchors, availability, surface route
origin, generation fencing, and host-only contextual identity.

Manager settings suites live in `manager-settings-tabs/valid` and
`manager-settings-tabs/invalid`. They cover the surface-v4/catalog-v3 version
boundary, host-only tab headers, deterministic built-in merge, same-owner
route/page wiring, pending dependencies, body-only content, authorization
origin, and lifecycle cleanup/fallback.

Channel runtime suites live in `channel-runtime/valid` and
`channel-runtime/invalid`. They cover manifest-v2 compatibility and manifest-v3
explicit service configuration, complete Channel and Platform identities,
sourced user-only input, binding lineage, launcher-only secret references,
redacted Manager descriptors, route/connection integrity, retry ordering,
active binding uniqueness, and safe package entry resolution.

Plugin lifecycle suites live in `plugin-lifecycle/valid` and
`plugin-lifecycle/invalid`. They cover the frozen embedded package v1 plus
separate-runtime-manifest package v2, all three explicit-local source forms,
fake signature and remote source rejection, exact dependency graphs and
cycles, activation ordering, permission plans, reload scope, redacted runtime
snapshots, and canonical-only share availability.

Plugin Console v1 suites live in `plugin-console/valid` and
`plugin-console/invalid`. They cover zero-touch Host call instrumentation,
permission correlation, dispatch-before-success, one terminal per correlation,
owner/generation fencing, and owner-scoped plugin console messages.
