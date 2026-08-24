# Manager settings tabs protocol

This specification is normative for structured CordisX manager settings tabs,
their controlled body outlet, deterministic projection, authorization origin,
and lifecycle. It is host-neutral and contains no Codex selector, native DOM
class, React type, or renderer-version assumption.

## Versions and compatibility

`surface-contribution.v1`, `.v2`, and `.v3` remain frozen. Version 3 owns the
bounded `routeBehavior` contract. Version 4 is an explicit additive superset
that adds only `manager.settings.tabs`. A v1/v2/v3 validator rejects v4; a v4
host may normalize conforming older contributions without changing their
meaning. Rejected v4 data is never downgraded to a free-DOM slot.

`host-extension-point-catalog.v3` adds the settings surface/outlet and makes
outlet page-chrome compatibility, presentation group, and route-path family
machine-readable. Catalog v1/v2 consumers reject v3.

Settings page bodies reuse `page.v2` with `chrome: "body-only"`. The page
schema stays general and frozen. Catalog v3 authorizes body-only pages for
`manager.settings.content`; no page v3 or settings-specific mount API exists.

## Extension points

The host declares exactly these manager-settings identities:

- surface `manager.settings.tabs`, payload family `manager-settings-tab`,
  stability `stable`, availability `available`; and
- outlet `manager.settings.content`, payload family `outlet`, stability
  `stable`, availability `available`, page chrome `body-only`, presentation
  group `manager.settings`, and route path family `manager-settings`.

These are CordisX manager points. They require no Codex adapter selector,
native anchor, DOM seat, or fallback overlay. Routes and pages are associated
resources rather than additional extension points.

## Contribution shape

The version-4 contribution envelope owns the local `id`, `order`, `when`, and
`disabled` state. `group` is invalid for `manager.settings.tabs`. Its item
contains exactly:

- `title`: retained `LocalizedText`;
- `icon`: a required `host:*` icon token; and
- `route`: a same-owner local route reference with optional scalar params.

The item cannot repeat `id`, `order`, `when`, or `disabled`. It has no badge in
this version. HTML, SVG, CSS, URL icons, selector strings, nodes, children,
components, header callbacks, mount callbacks, and authorization origin fields
are invalid. Executable trusted-local UI remains exclusively in the separate
page registry.

A fiber-owned update may replace the item and update envelope `order`, `when`,
or `disabled`. Owner, point, contribution id, and route ownership are immutable.
A stale-generation or post-disposal update is rejected.

## Route, page, and pending dependencies

The referenced route id is local, so it resolves only inside the contribution
owner. The route must:

- be registered by the same owner;
- use a path strictly below `/manager/settings/`;
- target `manager.settings.content`; and
- reference a same-owner page whose version-2 chrome is `body-only`.

Qualified cross-owner route/page ids are invalid. A wrong path, wrong outlet,
standard-chrome page, or incompatible page metadata is invalid. A route, page,
or outlet that has not resolved yet is pending and diagnostic; it does not
produce a clickable empty tab. Manager-local navigation does not change the
application URL, browser history, or a host application's router.

## Projection and collisions

CordisX merges external records with three non-spoofable host records:

| Qualified id | Order |
| --- | ---: |
| `host:marketplace` | 100 |
| `host:runtime` | 200 |
| `host:launcher` | 300 |

Plugin owners cannot be `host` or begin with `cordisx.`. A plugin may use the
same local id as a built-in, but it becomes a different qualified identity and
cannot replace the host record. Exact live `(owner, point, local id)` duplicates
are invalid.

Projection order is numeric `order`, then owner by Unicode code unit, then
qualified id by Unicode code unit. Registration sequence, localized title,
current DOM position, and active state are not tie-breakers. Reordering retains
the active qualified id. `host:marketplace`, not the first sorted third-party
tab, is the default and fallback.

`when=false` removes a tab. `disabled=true` retains a non-activatable tab with
the host-resolved reason. Pending, invalid, denied, inactive-owner, and stale
records remain available to manager diagnostics but are not activatable.

## Header, panel, and lifecycle

The host renders the complete tablist, labels, icons, disabled/error state,
overflow, keyboard behavior, focus, `aria-selected`, `aria-controls`, and the
active `role=tabpanel` with `aria-labelledby`. The page callback receives only
the panel-body child plus route/page props and `AbortSignal`. It receives no
header, tab, manager root, host node, or selector.

Before mount the host produces and rechecks three generation-fenced
`extension-point-access.v2` origins:

1. `surface.route.navigate` for `manager.settings.tabs`;
2. `outlet.route.navigate` for `manager.settings.content`; and
3. `outlet.page.mount` for `manager.settings.content`.

Every identity tuple uses the launcher-bound canonical source and owner. A
plugin cannot submit an origin through contribution data, route params, page
props, or page content. Point policy for the surface and outlet, whole-plugin
activation, and Platform/Agent permissions are independent gates.

When an active external tab becomes hidden, removed, blocked,
permission-blocked, denied, disposed, or stale, the host aborts its signal,
calls its disposer, clears its body, and falls back to `host:marketplace`.
Manager close and generation replacement perform the same cleanup. Restore or
re-registration makes the tab eligible but never steals activation. Reopen
starts at the built-in fallback. Mount failure aborts and disposes partial
content and produces a host-owned error projection rather than an empty panel.

## Trust boundary

Structured header data, origin checks, and lifecycle cleanup are cooperative
CordisX enforcement. The page body still executes as trusted local renderer
code. A controlled container is not process or iframe isolation, and this
protocol grants no Platform or Agent capability. Those calls continue through
their existing permission brokers.

## Conformance

`test-vectors/manager-settings-tabs` and
`conformance/manager-settings-tabs.mjs` cover version rejection, host-only
icons/header data, deterministic ordering, built-in collisions, item/options
updates, same-owner route/page rules, pending dependencies, body-only outlet
compatibility, access-origin identity/generation, lifecycle fallback, abort
before dispose, restore without activation theft, and mount failure cleanup.
