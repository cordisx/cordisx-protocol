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

### Public runtime provenance

The public `ctx.slots.register(options, item)` call does not carry the serialized
surface envelope automatically. A Host that supports navigation item v2 adds
the exact pair below to `CordisXContributionOptions` for
`manager.settings.navigation-items`:

```ts
{
  $schema:
    'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/surface-contribution.v9.schema.json'
  schemaVersion: 9
}
```

Both fields are required together. When present, the Host reconstructs the
surface-v9 document from `options` and `item`, excluding the runtime-only
control lease request, and validates it before registration. When both fields
are absent, the call is `legacy-unversioned` and accepts only the legacy
route-only Manager navigation item. A half-present pair, another schema URL or
version, or `navigationGroup` on a legacy-unversioned call fails closed. The
Host must not infer provenance from TypeScript imports, item shape, registration
time, plugin version, or a private flag.

The additive `manager-settings-navigation-projection.v2.schema.json` replaces
the ambiguous v1 numeric `surfaceSchemaVersion` in runtime diagnostics with the
closed `surfaceProvenance` union:

- `{ kind: "versioned", $schema: <surface-v9>, schemaVersion: 9 }`; or
- `{ kind: "legacy-unversioned" }`.

Projection v1 remains frozen for serialized ledgers whose exact v5-v9 source
version is already known. Runtime `ctx.slots.register` diagnostics use
projection v2. Exact v9 with a group is `declared`; exact v9 without one is
`unassigned-fallback`; legacy-unversioned is `legacy-fallback`. No runtime path
guesses a v5-v8 number.

## Product information architecture

The recommended Host assignment demonstrates the grouping contract without
creating additional Protocol route identities:

- `resources`: one unified **Plugins** destination and **Talent marketplace**;
- `development`: **Extension points** and **Routes**;
- `collaboration`: **Manage chats** and **Team structure**.

The Host-owned **Plugins** destination is the only first-level entry for plugin
discovery, installation, and installed-plugin management. This does not absorb
business surfaces contributed by plugins: a plugin may still register one or
more independent top-level Manager destinations through the versioned
`manager.settings.navigation-items` contract, choose their supported visual
groups, and have those entries removed through the existing plugin fiber and
generation lifecycle.

A plugin bundle is only a package and runtime carrier. Installing or discovering
a bundle does not automatically create a top-level entry; only an explicit,
authorized navigation contribution does. A bundle or plugin package is managed
inside the unified Plugins destination and is not a second installation entry.
A separate plugin store is likewise not a first-level Protocol concept.
Compatibility redirects from removed Host-owned routes are Host implementation
details and do not appear in these schemas, group references, or examples.
