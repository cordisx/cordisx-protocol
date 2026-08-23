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

UI extension catalog suites live in `ui-extension-catalog/valid` and
`ui-extension-catalog/invalid`. They cover every version-2 surface/outlet id,
payload-family mapping, semantic composer anchors, availability, surface route
origin, generation fencing, and host-only contextual identity.
