# Test Vectors

Deterministic manifest, package identity, signature, grant, activation, and compatibility vectors belong here.

Marketplace v1 vectors live in `marketplace/valid`, `marketplace/invalid`, and
`marketplace/feeds`.

Marketplace trust vectors cover the four independent Official/Certified states,
exact artifact binding, revocation, expiry, and manifest self-claims. The
`marketplace-certified-permission-projection` suite additionally proves that
only an active exact Certified record can produce the Host-owned permission
eligibility input, with all trust and review fields covered by its fingerprint;
Official and permission allowlists are forbidden from that projection.

Structured UI v1 suites live in `ui/valid` and `ui/invalid` and cover commands,
surface entries, distinct native sidebar menu points, routes, pages, host
outlets, structured app/main page headers, body-only mount boundaries, and
semantic reference rules. The suites also cover route-v2/page-v3 localized
product metadata, legacy compatibility, and closed-schema rejection when the
required description is absent or replaced with raw display text.

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

Extension-point control v1 suites live in `extension-point-control/valid` and
`extension-point-control/invalid`. They cover controlled reasoning properties
and commands, user-switchable exclusive renderers, explicit overlay/proxy
stacking, point/mode-specific authorization, Host-stamped candidate inventory,
nested ownership suppression and recovery without losing an underlying denial,
and rejection of free DOM,
selectors, callbacks, sensitive projections, forged selections/events, implicit
coexistence, incomplete candidate/point inventories, group-level cardinality or
decision drift, cross-owner principal stamps, unstable legacy order, arbitrary
command results, eligible host-priority native/none drift, cross-origin handle
reuse, and legacy authority escalation. The nested valid suite includes
simultaneous explicit and legacy claims for one source/plugin owner.

Icon theme v1 vectors live in `icon-theme/valid` and `icon-theme/invalid`.
They cover Reicon default/fallback exact profile/version/generation pins,
no-raw-data complete-coverage proof, plugin-principal-bound namespaces,
partial exact key/variant/state tuples, request/generation correlation,
normalized fill/stroke geometry, lifecycle outcome combinations, stale/late
generation rejection, exact disposal and rollback, and rejection of components,
DOM, raw SVG/HTML, style, URLs, selectors, callbacks, `foreignObject`, local
paths, open semantic keys, coverage drift, and provider identity impersonation.
The trust fixtures keep certified third-party provenance distinct from official
first-party provenance, reject control/status aliases and user text or raw
source identity in resolution requests, and reject stale catalog coverage
proofs while retaining selection, fallback, and rollback fences.
Manager semantic fixtures cover all thirteen additive keys, the existing
variant/state model, and `action.favorite` plus `selected`. Negative cases
reject every normative alias boundary, both acknowledgements/contributions swap
directions, `action.favorite-active`, omitted 13-key coverage, the prior digest,
accessibility text, and raw publisher identity. Existing trust, selection,
fallback, rollback, and Connector suites remain part of `npm run check`.

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

Extension-point status suites live in `extension-point-status/valid` and
`extension-point-status/invalid`. They cover catalog-v5 maturity/support,
separate runtime `active`/`inactive`/`not-mounted` context, supported points in
an absent page context, truly unverified anchors, reserved unsupported points,
and closed-schema rejection of the legacy conflated availability field.

Manager settings suites live in `manager-settings-tabs/valid` and
`manager-settings-tabs/invalid`. They cover the surface-v4/catalog-v3 version
boundary, host-only tab headers, deterministic built-in merge, same-owner
route/page wiring, pending dependencies, body-only content, authorization
origin, and lifecycle cleanup/fallback.

Top-level Manager navigation suites live in
`manager-settings-navigation/valid` and
`manager-settings-navigation/invalid`. They cover the closed surface-v5/
catalog-v4 boundary, content-tab compatibility naming, required page-v3 Host
icons and free-header rejection, fixed core groups, deterministic order/owner/id ties,
same-owner route-v2/page-v3 wiring, pending dependencies, standard page
chrome, generation-fenced origins, close/reopen selection, and cleanup to the
Host Settings fallback.

Generic Manager content navigation suites live in
`manager-content-navigation/valid` and
`manager-content-navigation/invalid`. They cover same-owner subroute and
parameter references, standard Manager content pages, parent hierarchy,
dynamic renderer-safe record titles, Host-derived breadcrumbs/back/history,
tab route mapping, and rejection of DOM, selectors, secrets, raw bridges, and
plugin-owned history.

Channel runtime suites live in `channel-runtime/valid` and
`channel-runtime/invalid`. They cover manifest-v2 compatibility and manifest-v3
explicit service configuration, complete Channel and Platform identities,
sourced user-only input, binding lineage, launcher-only secret references,
redacted Manager descriptors, route/connection integrity, retry ordering,
active binding uniqueness, and safe package entry resolution.

Channel task gateway suites live in `channel-task-gateway/valid` and
`channel-task-gateway/invalid`. They cover Host-only alias resolution and
single-use authorization, complete model/session correlation, created-session
retention on initial-turn failure, replayable lifecycle ordering, one terminal
event per turn, and rejection of relative cwd, stale authority, session drift,
sequence gaps, and raw app-server payloads.

Connector service suites live in `connector-service/valid` and
`connector-service/invalid`. They cover versioned descriptors, exact
registration/generation identity, create versus continue handles, capability
matching, structured message direction, disposal terminality, and rejection of
Room, raw bridge, and cross-registration data.

Connector client suites live in `connector-client/valid` and
`connector-client/invalid`. They cover Host-issued caller principal/user
authorization, typed accepted/denied/unavailable results, run-to-conversation
binding, stale/replaced/disposed registration rejection, redacted discovery,
and serialized snapshot replay before live events.

Bound Connector client suites live in `connector-bound-client/valid` and
`connector-bound-client/invalid`. They cover the exact injected
discover/execute/subscribe/dispose surface, Host-only binding issuance,
registration-qualified run bindings, non-empty replay, serialized replay/live
ordering, disposal terminality, and the absence of caller, bridge, or second
connection fields.

Channel Manager v2 vectors additionally cover strict snapshot/request/result
identity, profile and Host-generation fencing, operation-to-exact-target
matching, stale-operation suppression, account-scoped safe-log pages, opaque
expiring export handles, and adapter-neutral inbound intents preserved through
the sourced gateway boundary. They deliberately reject unknown raw payload
fields and do not carry credentials, local paths, callback bodies, or direct
adapter objects.

Manager operation and safe-log vectors also supply the required current v2
snapshot plus Host-private issued-token context. The snapshot root, account,
and binding `availableOperations` are the operation authorization source; a
known token cannot grant an unavailable action. Snapshot tokens are not issued
authority: the Host-private registry alone proves each exact target identity,
kind, profile, Host generation, expiry, and (for a binding) current revision.
Its `authorizedAt` is Host-authoritative request-received time, never a
renderer or snapshot time. It is never a renderer-safe wire field. Log-page vectors bind every page to the originating
`logs.query` request and reject request-id, expected-revision, snapshot-revision,
or target drift. Every invalid Channel Manager vector also asserts its intended
rejection message, so a newly-required context field cannot mask its original
authorization, CAS, identity, or safe-log fence.

Plugin lifecycle suites live in `plugin-lifecycle/valid` and
`plugin-lifecycle/invalid`. They cover the frozen embedded package v1 plus
separate-runtime-manifest package v2, all three explicit-local source forms,
fake signature and remote source rejection, exact dependency graphs and
cycles, activation ordering, permission plans, reload scope, redacted runtime
snapshots, and canonical-only share availability.

Plugin Console v1 suites live in `plugin-console/valid` and
`plugin-console/invalid`. They cover zero-touch Host call instrumentation,
permission correlation, dispatch-before-success, one terminal per correlation,
owner/generation fencing, owner-scoped plugin console messages, variadic native
Console arguments, format placeholders, and safely inspectable value snapshots.

Permission v4 vectors live in `platform/permissions-v4/valid` and
`platform/permissions-v4/invalid`. They cover manifest v5, the Host root
catalog, bound opaque-handle requests/results, closed read and modify
operations, single-capability-family leases, bounded/redacted projections,
owner-local commands, and structured Host-owned children.
Negative vectors cover unknown operations/roots, cross-root and scope widening,
selectors, raw nodes/HTML, style/event handlers, scripts, private bridges,
Official/Certified self-claims, persistent denial, exact artifact/certification
expiry/revision/digest changes, stale generations/handles, disable, and
uninstall.
