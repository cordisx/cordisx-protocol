# Structured UI contribution protocol v1

This specification is normative for serializable CordisX version-1 commands,
shell contributions, routes, page metadata, and outlet declarations. It is
independent of Codex versions, DOM selectors, React, and distribution format.

## Trust boundary

Structured shell entries are data rendered by the host. They cannot contain
HTML, SVG, CSS, event handlers, selectors, or a DOM mount callback. Host icon
tokens name glyphs already supplied by the host. Command schemas contain
metadata and references only; executable handlers are trusted-local runtime
bindings owned by `cordisx`, not serialized protocol fields.

Page metadata and page-header declarations are serializable, but a page body
mount callback is a trusted-local runtime binding. The mount receives only the
host-owned body container below the structured header; version 1 exposes no
header mount seat. A controlled page body container and lifecycle signal are
not a permission sandbox. Capability enforcement, isolated execution,
signatures, installation, marketplace activation, atomic generation
publication, and rollback are not part of this protocol version.

## Identity and ownership

A local id matches `^[a-z0-9][a-z0-9._-]{0,95}$`. A reference is either a local
id or the qualified form `<owner>:<local-id>`. The runtime qualifies local ids
with the registering plugin id. Cross-owner references must already be
qualified and may resolve only to a public live registration.

Commands, routes, pages, and host outlets are unique by qualified id. Surface
entries are unique by `(surface, target, qualified contribution id)`. Exact
duplicates are invalid; registration order never silently chooses a winner.
Entries sort by group, numeric order, qualified id, and registration sequence.

Every registry record retains its owner and renderer generation. Owner unload,
plugin block, generation disposal, or renderer shutdown invalidates the record
and any update handle.

## Commands and activation

`command.v1` describes display metadata only. Shell buttons, menus, navigation
actions, and environment actions refer to a command id. Runtime handlers are
registered separately.

A primary navigation activation follows one rule: execute `command` when it is
present; otherwise navigate through `route`; when neither is present the entry
is invalid. Both may be present to provide an explicit command override with a
route fallback understood by diagnostics. Independent navigation trailing
actions always reference commands and must not activate the row.

The host owns async loading, duplicate-click suppression, cancellation, error
presentation, keyboard interaction, focus, accessibility, and disabled state.
The descriptor never supplies replacement DOM for those states.

## Localization v1

Every host-rendered title, label, description, tab, menu, configuration text,
and disabled reason is `LocalizedText`, not an already translated string. It
contains an optional namespace, key, typed scalar params, and optional fallback.
The registering owner is the namespace when `namespace` is absent. The ledger
preserves the reference and resolves it only during projection.

A plugin registers fiber-owned namespace-by-locale dictionaries. Locale tags
must equal `Intl.getCanonicalLocales(tag)[0]`; non-canonical spellings are
invalid. Message values use ICU MessageFormat syntax. Re-registering the same
owner/namespace/locale replaces that fiber's current dictionary; disposing its
handle restores any earlier live registration or removes the dictionary.

Resolution tries, in order, the exact canonical locale, its base language, and
the namespace's single declared default locale. Duplicate default dictionaries
for one live namespace are invalid. When namespace or key is missing, formatting
fails, or required params are absent, the result carries a deterministic
diagnostic and uses `fallback` when present; otherwise it renders
`[[namespace:key]]`. Extra typed params are allowed so callers can share stable
parameter objects.

The locale kernel publishes `{ locale, direction, version }`. `locale` and
`direction` follow the upstream document's `html[lang]` and `html[dir]`; the
adapter observes them and never writes language preferences. Locale change,
dictionary replacement, and dictionary unload increment `version` and reproject
host-rendered contributions and page chrome without plugin re-registration.

After declaring a namespace, the runtime injects a typed `t` seat. Page mounts
receive that seat plus `getSnapshot/subscribe`, a fiber-owned reactive effect,
and framework-agnostic text/attribute binding. Framework adapters such as React
may consume the same external-store pair. Missing namespace/key/params remain
visible to manager diagnostics.

## Conditions and updates

`when` is a JSON condition AST over host-declared context keys. Version 1
supports `key` predicates with `exists`, `equals`, or `notEquals`, plus nested
`all`, `any`, and `not`. Unknown keys evaluate unavailable and are diagnosed.

`disabled` is an object containing a boolean `value` and optional text `reason`.
It blocks activation without hiding the entry.

A runtime contribution may expose `update(snapshot)`. The new immutable
snapshot must validate against the same surface item schema and retains the
same owner, surface, target, and identity. Updating after disposal is invalid.
Snapshots never contain host nodes.

## Structured surfaces

The closed version-1 surface vocabulary is:

- `sidebar.footer.before-control` and `sidebar.footer.after-control`: compact
  command actions surrounding the designated native control;
- `sidebar.footer.menu`: command menu entries inside the designated native
  footer/help menu;
- `sidebar.account.menu`: command menu entries inside the designated native
  account/profile menu;
- `sidebar.navigation.items`: navigation rows with primary activation and one
  or more independent command shortcuts;
- `workspace.toolbar.items`: command actions targeting a host semantic anchor
  at `before`, `after`, or `menu`;
- `environment.panel.header-actions`: panel header commands;
- `environment.panel.sections`: section metadata;
- `environment.section.actions`: commands targeting a section id;
- `environment.section.rows`: label/value/status rows targeting a section id;
- `environment.row.trailing-actions`: commands targeting a row id.

Toolbar `anchor`, environment `sectionId`, and environment `rowId` values are
semantic references. Unknown targets remain pending and diagnosed; they never
fall back to arbitrary placement.

Both sidebar menu surfaces accept only the structured `action` item: localized
label and optional accessible label/icon plus a command reference. The host
renders each projected contribution as a native menu item and owns menu
semantics, focus, keyboard interaction, dismissal, disabled state, and command
dispatch. A contribution cannot provide a node, mount callback, HTML, CSS,
selector, submenu implementation, or route-only activation.

The footer/help menu and account/profile menu are distinct extension points.
An adapter projects `sidebar.account.menu` only when it resolves the exact,
unique native account trigger and its native menu for the current host state.
While either cannot be resolved or is ambiguous, the contribution remains
registered but pending and the manager reports the unresolved point. The host
must not project it into `sidebar.footer.menu`, attach it to another menu, or
create a CordisX button or standalone fallback menu. The same fail-pending rule
applies independently to `sidebar.footer.menu` and its designated native
footer/help trigger.

The experimental free-DOM `header.actions`, `composer.before`,
`composer.after`, `sidebar.footer`, and `shell.overlay` slots are not valid v1
surface names. Hosts must reject them with a migration diagnostic rather than
accept a mount function or raw node.

## Routes, pages, and outlets

A route joins a path pattern, outlet id, and page id. A page supplies host-owned
title, icon, breadcrumb, tab, and header-action metadata. An outlet declaration
supplies semantic scope, placement, and context policy. Only a host/adapter may
register an outlet that touches host DOM; plugin-provided outlet declarations
are invalid at runtime.

The standard page header contract is outlet-neutral. An `app` route and a
`main` route use the same page fields and host projection rules; plugins do not
declare an app-specific or main-specific header renderer. The host renders the
complete header and may adapt its layout to the outlet geometry without
changing page metadata.

Page metadata version 2 adds one bounded host chrome policy. `standard` is the
default and preserves version-1 behavior. `body-only` asks the host to mount
the page body without a second CordisX header, breadcrumb row, tab row, or
header actions. The page still declares a localized title and may declare an
icon for diagnostics, management, and accessible naming. It cannot provide
header DOM, CSS, selectors, a close control, or a replacement renderer.

`body-only` is a general page capability with an outlet-policy gate, not a
session- or plugin-specific adapter exception. A host may accept it only when
the target outlet retains persistent external host chrome with an independent
keyboard-reachable close path. In the initial catalog, only `session.content`
qualifies because it begins below and preserves the native session header;
`app` and `main` reject `body-only` navigation. A body-only descriptor cannot
also declare breadcrumbs, tabs, or header actions. Unknown policy values fail
closed.

Catalog version 3 adds a second body-only-compatible outlet,
`manager.settings.content`. It retains persistent CordisX-owned settings
header/tab chrome outside the page body and belongs to the isolated
`manager.settings` presentation group. Its routes live below
`/manager/settings/`. This is an additive outlet policy, not a change to the
frozen page-v2 schema or permission for a page to render settings tabs.

Each `headerActions` entry contains only a page-local action id, localized
label, optional localized accessible label, optional icon token, command
reference, and optional `when`/`disabled` state. Action ids are unique within
one page and array order is presentation order. The referenced command must be
live and visible to the page owner. The host owns buttons, overflow behavior,
focus, keyboard interaction, loading, cancellation, errors, disabled state,
and command dispatch.

Structured surface contribution version 3 adds `routeBehavior` to route-backed
actions. Its default is `navigate`, preserving version-2 behavior. `toggle`
means the host compares the owner-qualified route and resolved parameters with
the current outlet stack: inactive activation navigates, while exact active
activation closes that route. The host projects selected/pressed state and
must never accept a plugin boolean as its source of truth. A toggle cannot also
name a command.

For a contextual session surface targeting a route whose only missing
parameter is `sessionId`, the host may bind that parameter from its current,
host-issued session identity immediately before authorization and activation.
Plugin arguments and DOM state cannot supply or override that binding. Session
changes, close, policy denial, plugin deactivation, and generation disposal
therefore clear the projection through outlet lifecycle state rather than a
plugin-owned flag. Escape and pointer/keyboard reactivation use the same host
close operation, and focus returns to the still-connected originating control
when practical.

A page descriptor and header action cannot contain DOM nodes, HTML, CSS,
selectors, framework renderers, `children`, a header component, or a mount
callback. The trusted-local page mount is exclusively for page body content;
attempting to render, replace, or adopt the host header is invalid rather than
a compatibility fallback.

Only structured surfaces and host outlets are extension points. Commands,
routes, and pages are associated resources. Host descriptor identity, per-point
policy, and command/route/page authorization origin are defined by the
[extension-point management protocol](../extension-points/README.md).

The TypeScript runtime may extend its outlet vocabulary through module
augmentation, but every live outlet declaration and every route is still
schema-validated. Version 1 initially declares `app`, `main`, and
`session.content`; later host packages can add `panel.right`, `panel.bottom`,
`sidebar`, or other ids without changing a core TypeScript union.

Routes support static path segments and named `:parameter` segments. Wildcards,
query strings, fragments, empty segments, and duplicate parameter names are
invalid. Contributions navigate by route id plus parameters and never assemble
paths themselves.

Path and outlet are double-validated:

- `/main/<path>` requires `main`;
- `/sessions/:sessionId/<path>` requires `session.content` and the named
  `sessionId` parameter;
- other single-root paths require `app`; `/main` and `/sessions` are reserved.

For a session route, the runtime must also verify that the resolved `sessionId`
equals the current native session. Route navigation cannot switch a native
session. Back and close operate on CordisX-owned in-memory route state; this
protocol does not authorize browser history or a host router call.

## Context lifecycle

An outlet resolution includes a semantic `contextKey`. Replacing a host anchor
with the same key migrates the same outlet and retains the page mount. A changed
key aborts and disposes the old page and context-scoped state. Version 1 does
not restore page stacks per prior context. The `app` context persists across
host-internal navigation for the renderer generation; `main` and
`session.content` follow their native semantic contexts.

These are lifecycle requirements, not DOM instructions. Selectors, geometry,
portal fallback, observers, overlay styling, and native-node safety belong to
the host-private adapter.

## Compatibility and downgrade

All documents set their exact versioned schema URL, use
`additionalProperties: false`, and fail closed on unknown schema versions,
unknown surface kinds, unknown chrome or route behaviors, unknown condition
operators, or unknown required fields. Version-1 pages remain frozen and imply
standard chrome. Version-2 surface contributions remain frozen and imply
`routeBehavior: navigate`. Older hosts may preserve newer entries for
diagnostics but must not render, execute, or navigate them.

A host that does not implement this protocol cannot downgrade a structured
entry to a free-DOM slot. A plugin targeting a newer version must remain
inactive with an explicit compatibility diagnostic.

This version-1 surface vocabulary is frozen. The complete additive catalog,
new structured families, and contextual invocation origin are defined by the
[UI extension catalog protocol](../ui-extension-catalog/README.md) and
`surface-contribution.v2` and `surface-contribution.v3`; manager settings is
added only by `surface-contribution.v4`. None rename or restore a retired
free-DOM slot.
