# Extension-point management protocol v1

This specification is normative for host extension-point descriptors, user
point policy, and the authorization origin carried by surface commands and
outlet route/page operations. It is independent of Codex versions, DOM
selectors, renderer frameworks, and the CordisX manager layout.

## Vocabulary and ownership

CordisX has two extension-point families:

- a `surface` accepts structured contribution data rendered by the host; and
- an `outlet` accepts a compatible route and mounts its page in host-controlled
  space.

Commands, routes, and pages are associated resources, not extension points.
They can appear in a point usage projection but never create additional point
identities.

Only the host or its adapter declares extension-point descriptors. A plugin
cannot register or replace a host descriptor, its icon, or its localized
identity. Adapter-private selector, anchor, geometry, and native-node behavior
remain implementation details in `cordisx/cordisx`.

## Versioned host catalog

`host-extension-point-catalog.v1.schema.json` contains an ordered `points`
array. An empty catalog is valid so an adapter can explicitly report that it
exposed no points. Every `HostExtensionPointDescriptor` contains exactly:

- `id`: a stable local id;
- `kind`: `surface` or `outlet`;
- `title`: retained `LocalizedText` with a non-empty fallback;
- `description`: retained `LocalizedText` with a non-empty fallback; and
- `icon`: a `host:*` icon token.

Descriptor text is resolved only during host projection. The retained message
reference reprojects after locale or dictionary-version changes; a manager
must not replace missing descriptor text with its technical id. Arbitrary SVG,
HTML, CSS, URLs, plugin icon tokens, and already-resolved strings are invalid.

Ids are unique across the whole catalog, not separately within each family.
Therefore `surface/app` and `outlet/app` conflict even though their kinds
differ. Changing an existing id from one family to the other is incompatible.
JSON Schema validates each descriptor; conformance validation enforces the
cross-record uniqueness rule.

## Canonical point-policy identity

A policy record is keyed by the exact ordered tuple:

```text
(source, pluginId, pointId)
```

`source` is the launcher-owned canonical absolute plugin source. Version 1
accepts canonical local `file:` URLs and canonical `https:` URLs without
credentials, query, or fragment. The plugin module cannot supply or override
that value. `pluginId` is the launcher-bound lowercase plugin id, and `pointId`
must resolve to a live host descriptor. The point family is not part of the
tuple because descriptor ids are unique across families.

The stored `PointPolicy` is one of:

- `inherit`: use the host default;
- `allow`: permit this plugin at this point; or
- `deny`: reject this plugin at this point.

Version 1 has the compatibility host default `allow`. A missing record and an
explicit `inherit` both resolve to `allow`; existing bundles therefore remain
active until the user makes a narrower choice. `ask` is not a version-1 point
policy. A future activation workflow may define an activation-time decision,
but a renderer projection must never prompt per render or per click.

Policy records with the same exact tuple are ambiguous and invalid. A policy
for one source must not apply to another source with the same plugin id. Whole
plugin blocking and Platform capabilities remain independent gates.

## Host-generated access origin

`extension-point-access.v1.schema.json` is host-generated authorization
metadata. It is not a plugin contribution field and must not be accepted from
command arguments, route parameters, page props, or renderer DOM state. Every
access record carries the launcher-bound canonical identity tuple.

For a surface command invocation, the origin contains:

- operation `surface.command.invoke`;
- the surface point identity;
- the originating contribution id; and
- the command id.

The dispatcher evaluates the point policy again before invoking the command.
Removing a denied surface projection is not sufficient: stale controls and
programmatic invocation through that origin must also be rejected. The command
registration itself remains available to a separately allowed origin.

For outlet access, route/page lifecycle enforcement has two phases:

- `outlet.route.navigate`, before accepting a route navigation; and
- `outlet.page.mount`, before mounting or retaining the selected page.

Both carry the outlet point identity, route id, and page id. They may target
only a descriptor whose kind is `outlet`. A denial rejects future navigation
and mount, aborts and disposes an active page through the host runtime, and
reveals the untouched native content. Route and page registrations remain in
the ledger for diagnostics or another conforming use.

A host-owned page header action uses a third outlet operation,
`outlet.page.command.invoke`. Its origin carries the outlet point identity,
route id, page id, page-local action id, and referenced command id. The
dispatcher re-evaluates the outlet point policy before every invocation; an
already mounted page or stale header control does not retain authority after a
deny transition. The origin is generated by the host from validated page
metadata and must never be accepted from page body content.

## Validation and downgrade

All root documents use their exact schema URL, `schemaVersion: 1`, and closed
objects. Version 1 fails closed on an unknown schema version, descriptor kind,
policy value, access operation, required origin field, non-host icon, unknown
point, family mismatch, duplicate point id, duplicate policy tuple, or
non-canonical source.

Hosts may retain invalid descriptors and access attempts for diagnostics, but
must not project, navigate, mount, or invoke them. A newer descriptor, policy,
or origin version cannot be downgraded by discarding unknown fields.

## Trust boundary

These schemas and checks enforce cooperative use of CordisX registries and
dispatchers. They are not a hostile-code sandbox. Trusted renderer plugins can
still bypass CordisX APIs and touch renderer globals until isolated execution,
capability RPC, authenticated package identity, signatures, immutable packages,
and atomic activation/rollback are implemented.

## Conformance vectors

`test-vectors/extension-points` and `conformance/extension-points.mjs` cover:

- both descriptor families with retained text and host icons;
- duplicate ids across families;
- canonical local and HTTPS sources plus exact tuple isolation;
- `inherit`, `allow`, `deny`, and the missing-record compatibility default;
- required surface command origin;
- outlet route, page mount, and page-header command enforcement phases;
- unknown points and operation/family mismatches; and
- closed schemas and downgrade rejection.
