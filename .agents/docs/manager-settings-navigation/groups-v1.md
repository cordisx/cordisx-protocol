# Manager Settings navigation groups v1

This specification adds Host-owned visual grouping to the existing
`manager.settings.navigation-items` surface. It is independent of Manager
Content route tabs. Plugins contribute only a structured group reference; the
Host owns the group catalog, labels, ordering, rendering, accessibility,
collapse policy, separators, focus, selection, and lifecycle.

The versioned contracts are:

- `manager-settings-navigation-groups.v1.schema.json`, the exact Host-owned
  group catalog;
- `surface-contribution.v9.schema.json`, whose Manager navigation item v2 adds
  optional `navigationGroup: { id }`;
- `host-extension-point-catalog.v9.schema.json`, whose stable
  `manager.settings.navigation-items` descriptor advertises payload family
  `manager-settings-navigation-item-v2` and carries the catalog; and
- `manager-settings-navigation-projection.v1.schema.json`, the Host-generated
  diagnostic projection used to explain each live contribution's declared and
  effective group.

The public TypeScript entrypoint is
`@cordisx/protocol/manager-settings-navigation/v1`.

## Exact Host group catalog

The catalog is an ordered tuple. Its ids and orders are frozen:

| id | order | purpose |
| --- | ---: | --- |
| `resources` | 100 | finding, installing, and managing product resources |
| `development` | 200 | extension and route development facilities |
| `collaboration` | 300 | chat and team collaboration facilities |
| `other` | 1000 | deterministic compatibility fallback |

Each group carries retained `LocalizedText` with a required fallback. The Host,
not a plugin, supplies and localizes this catalog. A plugin cannot register a
new group, replace a label/order, hide a group, or inject DOM, CSS, HTML,
selectors, components, callbacks, collapse state, or layout values.

Empty groups are not rendered in the left navigation, but remain visible in
extension-point diagnostics as supported group identities. The Host may assign
its own core routes to these groups internally; that assignment is not a plugin
contract and cannot be overridden by a contribution.

## Entry references and deterministic projection

A surface-v9 Manager navigation item retains its same-owner `route` and may add
exactly one `navigationGroup` reference. The reference id must be one of the
four catalog ids. It is display placement only and grants no route,
authorization, visibility, ordering, selection, or lifecycle authority.

The existing contribution-envelope `group` remains exactly
`before-settings | after-settings`. It is an insertion compatibility seam, not
the visual group id. Hosts and management UI must name these fields distinctly
and must not infer one from the other.

The Host projects visual groups by catalog order. Within one visual group it
sorts eligible entries by insertion seam (`before-settings` before
`after-settings`), then contribution envelope `order`, owner by Unicode code
unit, and owner-qualified contribution id by Unicode code unit. Registration
time, localized labels, DOM position, active state, and route title never break
ties. Host-owned core rows keep Host-owned deterministic positions within their
assigned group.

## Compatibility fallback

Surface-contribution v5 through v8 documents remain byte-frozen. Every valid
legacy Manager navigation item resolves to effective group `other` with
assignment `legacy-fallback`. A surface-v9 item that omits `navigationGroup`
also resolves to `other`, with assignment `unassigned-fallback`. A valid v9
reference resolves with assignment `declared`.

An unknown explicit v9 group is invalid and fails closed; it never falls back.
Removing unknown fields or treating the old envelope `group` as a visual group
is not migration. Contribution identity, route/page identity, path policy,
authorization origins, disabled/when handling, mount lifecycle, and restore
behavior remain unchanged.

Older Hosts reject surface v9 and catalog v9 rather than flattening or guessing
the grouping. New Hosts continue to accept v5-v8 and apply the exact `other`
fallback.

## Extension-point management projection

The Host-generated projection contains the exact catalog and one bounded entry
per currently registered, structurally valid Manager navigation contribution.
Each entry reports owner, contribution id, surface schema version, insertion
group, order, optional declared group, effective group, and one of:

- `declared`;
- `legacy-fallback`; or
- `unassigned-fallback`.

The extension-point management page uses this data to show that catalog v9 and
item payload v2 are supported, explain `navigationGroup` versus the legacy
insertion `group`, and identify the current effective group and fallback reason.
This is diagnostics only; it exposes no renderer, DOM, route controller, policy
mutation, or plugin-owned localization seat.

## Product information architecture

The recommended Host assignment demonstrates the grouping contract without
creating additional Protocol route identities:

- `resources`: one unified **Plugins** destination and **Talent marketplace**;
- `development`: **Extension points** and **Routes**;
- `collaboration`: **Manage chats** and **Team structure**.

Plugins are the only first-level installation and management concept. A plugin
package is an installation carrier or special plugin handled inside the unified
Plugins page; it is not a second top-level destination. A separate plugin store
is likewise not a first-level Protocol concept. Compatibility redirects from
removed Host-owned routes are Host implementation details and do not appear in
these schemas, group references, or examples.
