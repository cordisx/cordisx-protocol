# UI extension catalog protocol

This specification is normative for the host-neutral CordisX UI extension
catalog, structured surface contribution versions 2 through 7, and host-generated
invocation context version 1. It is independent of Codex selectors, React,
native DOM layout, and distribution format.

Manager settings extends this catalog through two independently documented
contracts. [`manager-settings-tabs`](../manager-settings-tabs/README.md)
defines the content switcher inside Settings; version 4/catalog v3 remain
compatible inputs, while version 5/catalog v4 names that payload family
`manager-settings-content-tab`. The separate
[`manager-settings-navigation`](../manager-settings-navigation/README.md)
contract adds top-level Manager destinations through
`manager.settings.navigation-items` and `manager.content`. The v2 catalog and
v1/v2/v3/v4 surface vocabularies remain frozen.

## Compatibility

`surface-contribution.v1` remains frozen with its eleven structured surfaces.
The five retired free-DOM slots remain invalid. Version 2 is an explicit
superset: every v1 contribution that conforms to the normative host-icon and
structured-data boundary can be represented in v2. A v1 document that relied
on the overly broad v1 `iconToken` schema is rejected during normalization.
A v1 host must reject a v2 document instead of dropping fields or converting
it to a DOM slot.

Version 3 preserves the version-2 vocabulary and payload families while adding
the bounded `routeBehavior` field to route-backed actions. Omission means
`navigate`; `toggle` delegates exact route/parameter comparison, pressed state,
activation, close, and focus restoration to the host. A version-2 host rejects
a version-3 document rather than guessing toggle behavior.

`host-extension-point-catalog.v2` adds `payloadFamily`, protocol `stability`,
and current-host `availability` to the v1 descriptor. Version 1 hosts continue
to consume only v1 catalogs. Stability is `stable`, `experimental`, or
`reserved`; availability is independently `available`, `pending`, or
`unavailable`. This separation represents a stable point whose native seat is
currently ambiguous and an experimental point that a particular adapter can
uniquely project. Pending/unavailable entries require a localized diagnostic,
and a reserved point is always unavailable.

Availability is a host-adapter fact, not a plugin preference. Plugins cannot
register a descriptor or promote its availability.

Anchored surfaces may publish per-anchor placement and availability snapshots.
This permits `composer.toolbar.items/submit/before` to be available while
`model` remains pending. Point-level availability never turns an unavailable
anchor into a fallback seat.

## Structured payload families

Version 2 uses a bounded set of payload families:

- `action` and `menu-item` contain retained localized text, a host icon token,
  and a command or route reference;
- `contextual-action` has the same declaration shape, while the host injects
immutable invocation identity at dispatch time;
- `tab` contains an id, title, optional icon/badge, route, order, and `when`;
- `presenter` is one of `banner`, `status`, `chip`, or `progress` with bounded
  tone, text, optional detail/icon/activation, and finite progress values;
- the existing `navigation-item`, `environment-section`, and
  `environment-row` families stay compatible; and
- `outlet` is descriptor-only and is joined to the separate route/page/outlet
  protocol when a host actually declares it.

Version 5 adds two Manager-only structured payload families. A
`manager-settings-content-tab` retains the version-4 title/icon/route shape
for an internal Settings content switcher. A
`manager-settings-navigation-item` contains only a same-owner route reference;
its required `before-settings` or
`after-settings` group plus envelope order control relative placement. The
route-v2 and page-v3 records, not the navigation item, are the single source
of localized destination title and description. Page v3 must declare a
`host:*` icon for this point and is the sole icon source for both navigation
and the standard page header.

Version 6 adds `composer.reasoning-intensity` with the separate
`reasoning-intensity-presentation` family. It is a Host-owned projection of a
uniquely resolved native range, not whole-composer replacement. The plugin
supplies only a localized title and ordered semantic material stages; the Host
owns native discovery, visual rendering, motion, focus, accessibility, event
continuity, restoration, and cleanup. The complete behavior and failure rules
are specified by
[`reasoning-intensity-presentation`](../reasoning-intensity-presentation/README.md).

Version 7 adds `session.backdrop` with the separate
`session-backdrop-presentation` family. It is a pointer-inert, Host-owned
session stage driven by the native reasoning value. Plugins provide closed
material/ambience tokens and bounded embedded PNG portraits; the Host owns
decoding, responsive placement, contrast, motion, and cleanup. See
[`session-backdrop-presentation`](../session-backdrop-presentation/README.md).

The separate
[`composer submit celebration profile`](../composer-submit-celebration/README.md)
does not add a surface or payload family. It uses the existing
`composer.toolbar.items` point and control-plane-v1 scalar bindings so native
submit observation and transient full-window presentation remain Host-owned.

Contribution options retain `group`, `order`, `when`, and disabled state. The
host decides direct-action capacity, overflow, keyboard hints, focus,
accessibility, error presentation, and native-menu integration. A contribution
never contains HTML, SVG, CSS, selectors, DOM nodes, a popover renderer, or a
mount callback.

A version-3 route action may select `routeBehavior: toggle`. Its host-generated
pressed projection is true only while the exact owner-qualified route with the
resolved contextual parameters is active and presented. Re-activation closes
that outlet route. Plugin state is not an input to this projection, and a
toggle action cannot also reference a command.

Contribution identity is `(point id, owner-qualified contribution id)`.
Anchor and target are immutable registration fields: an update may replace the
validated presentation snapshot but cannot retarget the same identity to a new
native seat.

Action-bearing surfaces may define semantic `anchor` and `placement` fields.
`composer.toolbar.items` accepts only `leading`, `model`, or `submit`; a host
projects `menu` only into an already existing native menu. An unresolved or
ambiguous anchor is pending and diagnosable, never simulated with an overlay.

## Contextual invocation

`surface-invocation-context.v1` is generated by the host after a control is
activated and immediately before command dispatch. It carries the originating
point/contribution plus a host-owned opaque `contextRef`. Agent identity is a
provider-neutral `sessionKey` with optional turn, step, item, message, and
tool-call ids aligned with `cordisx.agent-events/v1`. Platform identity is a
separate `{ providerId, remoteSessionId }` pair. Neither form is a naked
cross-provider `sessionId`; workspace and generic context references remain
opaque.

The envelope includes `provenance`, generation, command id, and an adapter or
CordisX source. Observed/inferred identity must have an adapter source;
CordisX provenance must have a CordisX source. A plugin source is invalid.
Contributions, command arguments, route parameters, page props, and renderer
DOM state cannot submit or override the envelope. A field
inside plugin JSON that happens to be named `sessionId` remains ordinary
plugin data and never becomes host context.

Extension-point access version 2 adds generation fencing and
`surface.route.navigate`. Both surface command and route activations re-check
the source point policy and live availability before dispatch; route
navigation then separately checks the target outlet policy.

Contextual surfaces require only the identities the adapter truly observes.
For example, `session.message.actions` needs a message identity, while
`session.tool.actions` needs a tool-call or item identity. Missing hierarchy is
left absent; the host does not invent a step id or relabel an inference as
observed.

## Catalog

The complete version-2 vocabulary contains the eleven v1 surfaces plus:

- `session.header.actions`, `session.tabs`, `session.banner.items`,
  `session.message.actions`, `session.turn.footer`, and
  `session.tool.actions`;
- `composer.toolbar.items`, `composer.command-menu.items`,
  `composer.reasoning-intensity`, `composer.dock.above`, and
  `composer.dock.below`;
- `sidebar.workspace.menu`, `sidebar.session.actions`, and
  `sidebar.session.menu`;
- `panel.right.header-actions`, `panel.right.tabs`,
  `panel.bottom.header-actions`, and `panel.bottom.tabs`; and
- the existing `app`, `main`, and `session.content` outlets plus reserved
  `panel.right.content` and `panel.bottom.content` outlet identities.

Environment points remain the existing five ids. Generic panel points do not
alias or duplicate environment sections/rows.

The status and exact payload family of every point are recorded in the
complete catalog conformance vector. The current Codex adapter implements the
two new stable seats `session.header.actions` and `composer.toolbar.items` in
addition to the existing catalog; other new points remain experimental or
reserved until that adapter supplies unique-seat evidence.

## DeepSeek Harness mapping and refusal

| DSH intent | CordisX mapping |
| --- | --- |
| `input.left` / `input.right` | `composer.toolbar.items` semantic anchor/placement |
| input/composer dock | `composer.dock.above` / `composer.dock.below` presenter |
| session actions/utilities | `session.header.actions` contribution groups |
| `conversation.view` | route/page plus `session.tabs` and `session.content` |
| assistant actions | `session.message.actions` contextual action |
| `turnTail` | `session.turn.footer` presenter |
| `details.tool` | right-panel route/outlet plus `session.tool.actions` |
| settings content switcher | `manager.settings.tabs` plus `manager.settings.content` |
| top-level Manager plugin destination | `manager.settings.navigation-items` plus `manager.content` |

Keyed chat/message/tool renderers and whole composer, session, header, chat,
message, or tool replacement are refused. Future replacement authority needs a
CordisX-owned complete wrapper and a separate versioned presentation registry;
it cannot be encoded as an action, presenter, tab, or outlet.

## Security and downgrade

Schemas and host origin checks enforce cooperative use of CordisX APIs. They
do not sandbox trusted renderer code. Versions 2 and 3 fail closed for unknown
versions, surfaces, families, anchors, placements, presenter kinds, arbitrary
icons, route behaviors, free-DOM fields, plugin-supplied invocation sources, or catalog family
mismatches. No version may downgrade a rejected contribution to raw DOM.

Version 4 additionally fails closed on an unknown manager surface, a repeated
settings identity/order/condition field inside the item, `group`, badges,
non-host icons, free header DOM, or a qualified cross-owner settings route.

Version 5 additionally fails closed on an unknown navigation group, title,
description, or icon duplicated inside a navigation item, a missing/non-host
page icon, DOM/CSS/selector/header callbacks, or a qualified cross-owner route. Catalog v4,
route v2, and page v3 remain closed, so older validators reject them rather
than projecting incomplete navigation or headers.

Version 6 additionally fails closed on arbitrary visual code or assets,
unknown variants, motion modes or material tokens, fewer than two or more than
eight stages, and any attempt to select, hide, or mutate native DOM from the
contribution.
