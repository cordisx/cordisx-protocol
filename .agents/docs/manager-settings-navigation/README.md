# Manager settings navigation protocol

This specification is normative for plugin-contributed top-level destinations
in the CordisX Manager's settings-adjacent navigation group. It is
distinct from the tabs that switch content inside Settings, specified by
[`manager-settings-tabs`](../manager-settings-tabs/README.md). The contract is
host-neutral: no Codex selector, native node, DOM class, layout framework, or
renderer version is part of its identity.

## Versions and compatibility

`surface-contribution.v5` and `host-extension-point-catalog.v4` are separate
closed contracts. Older surface/catalog validators reject them; the v1-v4
surface schemas and catalog v1-v3 remain frozen. Version 5 also carries the
existing `manager.settings.tabs` point with the more precise
`manager-settings-content-tab` payload family. Its stable point id and v4
`manager-settings-tab` meaning do not change, so existing policy tuples and
plugins need no id migration.

Top-level navigation requires route metadata v2 and page metadata v3. Both
provide retained localized title and description. The navigation item does not
repeat those fields: the route supplies navigation destination text and the
page supplies standard page-shell text. This prevents two independently
updated localization sources. Legacy route-v1 or page-v1/v2 records remain
valid in their owning protocols but are pending/incompatible for this point.

## Extension points and contribution

Catalog v4 declares:

- surface `manager.settings.navigation-items`, payload family
  `manager-settings-navigation-item`, stable and available; and
- outlet `manager.content`, accepting only `standard` page chrome, with
  presentation group `manager` and route-path family `manager`.

The version-5 contribution envelope owns local `id`, required `group`, `order`,
`when`, and `disabled`. Group is exactly `before-settings` or
`after-settings`. Those names are stable protocol identities for the two sides
of the Manager extension seam; they do not require a visible Host Settings row.
The item contains exactly a same-owner local route reference
with optional scalar params. Title and description are required on route v2
and page v3 instead of the item; the required `host:*` icon comes from page v3.
Thus route and page metadata are the only display-data sources for this point.

Contributions cannot contain HTML, SVG, CSS, URLs, selectors, native nodes,
children, components, header or mount callbacks, badge renderers, overflow
controls, layout values, access origins, or executable actions. The Host owns
the navigation row, icon projection, selected/hover/focus states, compact and
wide layouts, overflow, keyboard behavior, and accessibility.

## Route, page, and Host shell

The referenced route must be registered by the same owner, use a path strictly
below `/manager/extensions/`, target `manager.content`, and reference a
same-owner page-v3 record. The page must use standard chrome. Qualified
cross-owner route/page references, body-only pages, duplicate live paths, or a
different outlet/presentation group are incompatible.

Unresolved route, outlet, or page dependencies are pending and diagnostic;
they do not produce an empty clickable row. A route is selected by its
owner-qualified identity and canonical path, so a refresh, deep link, back
navigation, and Manager close/reopen can reproject the correct selection
without reading DOM state. The application URL and outer router remain Host
implementation concerns; no plugin controls history.

The Host renders the standard page shell: breadcrumbs/back behavior, the
required page-v3 Host icon, localized title and description, optional
structured Host-rendered actions,
focus, loading/error state, and accessibility. Page-v3 breadcrumbs and header
actions are data, never callback or DOM seats. Any action icon accepted for
this outlet is a Host token. The trusted-local page mount receives only the
controlled body child, route/page props, and an `AbortSignal`.

## Multi-page plugin applications and body primitives

A plugin application with multiple top-level Manager destinations contributes
one independent surface record, route-v2 record, and page-v3 record per
destination. The contribution id is the navigation-row identity, the route id
and canonical path are the navigation identity, and the page id is the
controlled mount identity. The route supplies destination text; the page
supplies standard-shell text and icon. There is no aggregate application
record, page-kind discriminator, or plugin-supplied navigation group beyond
the existing closed insertion seam.

Top-level rows, standard page chrome, route-level breadcrumbs/back/history,
route-level tabs from `manager-content-navigation.v1`, page-v3 header actions,
focus, accessibility, and mount lifecycle are reusable Host primitives. Trees,
business lists, record detail layouts, and body-local controls remain inside
the plugin's authorized controlled body unless a separate versioned Protocol
contract explicitly gives their projection, selection, accessibility, and
lifecycle to the Host. Page names or the number of pages in one plugin are not
reasons to add a new wire shape.

A body that needs a Host-rendered searchable collection uses the independent
[`manager-collection`](../manager-collection/README.md) contract. That contract
does not grant access to Manager chrome or alter this navigation surface.

## Deterministic projection and collisions

The current Manager IA has no top-level Settings destination. The projection is
one fixed merge:

1. Host core `host:plugins`, `host:extensions`, `host:routes`, and
   `host:marketplace`;
2. eligible `before-settings` plugins;
3. the stable virtual settings seam (no rendered Host row);
4. eligible `after-settings` plugins; and
5. `host:about`.

The group strings stay unchanged so existing version-5 documents, ordering,
and policy tuples remain valid. A Host must not synthesize an empty Settings
destination merely to visualize the seam.

Within either plugin group, order is numeric envelope `order`, then owner by
Unicode code unit, then qualified contribution id by Unicode code unit.
Registration time, localized text, DOM position, active state, and the other
group do not break ties. Host records have fixed positions rather than numeric
orders. Owners `host` and `cordisx.*` are reserved; a plugin's equal local id
remains a different qualified identity and cannot replace a Host destination.
Exact live owner/point/id duplicates and duplicate Manager paths are invalid.

`when=false`, pending, denied, inactive-owner, and stale records are not
projected. `disabled=true` remains visible but cannot activate and carries a
Host-resolved reason. Updating order or group retains an already active
qualified route; restore/re-registration never steals activation.

## Authorization and lifecycle

Before mount the Host creates and rechecks three generation-fenced
`extension-point-access.v2` origins:

1. `surface.route.navigate` at `manager.settings.navigation-items`;
2. `outlet.route.navigate` at `manager.content`; and
3. `outlet.page.mount` at `manager.content`.

All origins use the launcher-bound canonical source, owner, route, page,
contribution, and generation. Plugin data, URL params, page props, mounted DOM,
or stale controls cannot submit or override an origin. Surface/outlet point
policy, whole-plugin activation, and Platform/Agent capabilities are separate
gates and are rechecked at their operation boundary.

When the active plugin destination becomes hidden, disabled, removed,
uninstalled, blocked, permission-denied, point-denied, unavailable, or stale,
or its generation is replaced, the Host aborts the active signal, then calls
its disposer, clears the controlled body, and falls back to `host:plugins`.
Restore makes it eligible without stealing activation. Manager close performs
abort then dispose while retaining the selected route identity; reopen may
mount that still-eligible route again. Mount failure cleans partial content and
falls back to `host:plugins` with a Host-owned error projection.

## Trust boundary and conformance

This controlled-seat protocol governs cooperative CordisX APIs. Trusted local
renderer code is not a process, iframe, or hostile-code sandbox, and this
contract grants no Platform or Agent capability.

`test-vectors/manager-settings-navigation` and
`conformance/manager-settings-navigation.mjs` cover closed-version rejection,
free header data, Host icons, groups/order/ties/collisions, same-owner
route/page/path/chrome, pending dependencies, exact origins, lifecycle cleanup,
stable close/reopen selection, restore without activation theft, stale routes,
generation replacement, and mount failure fallback.
