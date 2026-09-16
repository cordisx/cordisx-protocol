# Manager Settings navigation groups v2

This additive successor introduces the Host-owned `external-accounts` visual
group without changing the frozen groups-v1, surface-v9, catalog-v9, or
projection-v2 contracts. Plugins still contribute only a structured group
reference; the Host owns labels, ordering, rendering, accessibility, selection,
permissions, diagnostics, and lifecycle.

The versioned contracts are:

- `manager-settings-navigation-groups.v2.schema.json`, the exact five-group
  Host catalog;
- `surface-contribution.v11.schema.json`, the surface-v10 successor whose
  Manager navigation item may reference catalog v2;
- `host-extension-point-catalog.v11.schema.json`, the catalog-v10 successor
  that advertises the v2 navigation catalog; and
- `manager-settings-navigation-projection.v3.schema.json`, the Host-generated
  diagnostics projection for v9, v11, and legacy-unversioned registrations.

The public TypeScript entrypoint is
`@cordisx/protocol/manager-settings-navigation/v3`.

## Exact Host group catalog

The catalog is an ordered tuple. Its ids and orders are fixed:

| id | order | purpose |
| --- | ---: | --- |
| `resources` | 100 | finding, installing, and managing product resources |
| `development` | 200 | extension and route development facilities |
| `collaboration` | 300 | chat and team collaboration facilities |
| `external-accounts` | 400 | accounts and subscriptions managed outside CordisX |
| `other` | 1000 | deterministic compatibility fallback |

Each group carries Host-owned localized text with a required fallback.
Recommended English copy for `external-accounts` is **External accounts**.
Localization remains a Host implementation responsibility. Plugins cannot
supply or replace group labels, orders, collapse state, layout, or rendering.

## Contribution compatibility

A surface-v11 Manager navigation item retains the same route reference,
insertion `group`, ordering, conditions, disabled state, permissions, and
lifecycle as its predecessor. Its optional `navigationGroup.id` may name any
catalog-v2 group, including `external-accounts`.

Surface-v9 remains frozen and accepts only `resources`, `development`,
`collaboration`, and `other`. An explicit `external-accounts` reference with
the v9 identity is invalid; a Host must not silently reinterpret it as v11.
Surface-v10 remains valid for its visual presentation additions but uses the
frozen groups-v1 Manager navigation reference.

For both v9 and v11, omitting `navigationGroup` resolves to `other` with
assignment `unassigned-fallback`. A registration with no public schema/version
pair remains `legacy-unversioned`, cannot carry `navigationGroup`, and resolves
to `other` with assignment `legacy-fallback`. Unknown explicit group ids fail
closed.

## Public runtime provenance

A v11 Manager navigation registration supplies the exact pair:

```ts
{
  $schema:
    'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/surface-contribution.v11.schema.json'
  schemaVersion: 11
}
```

The Host may also accept the exact v9 pair and fully omitted legacy identity.
Projection v3 reports one of:

- exact surface-v9 provenance;
- exact surface-v11 provenance; or
- `{ kind: "legacy-unversioned" }`.

A declared v9 contribution can report only a groups-v1 id. A declared v11
contribution can report any groups-v2 id. Unassigned and legacy entries always
report effective group `other`. Provenance is derived only from the exact
public pair, never from item shape, imports, plugin version, registration time,
or private state.

## Host presentation

The Host projects visual groups by catalog order. Within one group it preserves
the existing deterministic ordering: insertion seam, contribution order, owner
by Unicode code unit, then owner-qualified contribution id. Empty groups are not
rendered in Manager navigation but remain available in extension-point
diagnostics.

This version adds no route, authorization, visibility, selection, or lifecycle
authority. Existing route/page requirements, permission origins, disabled and
condition handling, generation replacement, cleanup, and fallback behavior are
unchanged.
