# Navigation collection actions v1

This contract is the versioned, data-only action list embedded by a Host in
the successor to its route-only dynamic navigation collection item. The
machine schema is `schemas/navigation-collection-actions.v1.schema.json`; the
TypeScript export is `@cordisx/protocol/navigation-collection-actions/v1`.

The generic collection row, collection source, revision, ordering, leading
visual, route registry, selection, and renderer remain Host-owned. A Host v2
item preserves its existing `id`, `label`, `description`, `icon`,
`leadingVisual`, `route`, `order`, and `disabled` fields and adds an optional
`actions: NavigationCollectionActions`. Existing actionless sources and every
frozen `surface-contribution.v1` through v7 document remain valid and
unchanged. The Host successor uses the exact options discriminator
`contract: "cordisx.navigation-collection/v2"`; accepting unknown fields in
the old API is not migration.

## Closed shape and bounds

An action list contains at most eight immutable snapshots in array order.
Action ids are local ids and must be unique within the enclosing item even
when two otherwise-identical snapshots would pass JSON Schema `uniqueItems`.
The Host deep-clones and freezes a replacement snapshot before projection; a
producer replaces the whole item or collection revision rather than mutating
an action in place.

Every action explicitly carries `kind`, `id`, localized `label`, optional
localized `ariaLabel`, optional registered `icon`, `placement`, `tone`,
`pressed`, structured `disabled`, and localized success/failure `feedback`.
`placement` is `direct` or `overflow`; `tone` is `neutral` or `danger`.
`pressed` is producer-owned presentation state for this exact action snapshot,
not route selection, command completion, permission, or proof that a side
effect occurred. A Host may add its own disabled state but must never treat a
producer's `disabled.value: false` as authorization.

Localized-text keys are stable message identifiers. Opaque Room or provider
identities belong in the enclosing route params, command arguments, or the
bounded `copy-text.text.value`; they must not be encoded in `key`,
`namespace`, an action id, or a synthetic localization key. Icons are
structured registered icon references, never markup, paths, bytes, or URLs.

## Activation kinds

`command` carries exactly one command reference and may carry a structured
confirmation. The Host resolves the command against the action owner's live
generation and performs the normal authorization check at activation time. It
must not derive a command, tone, placement, or confirmation requirement from
the action id, label, icon, or translated text.

`copy-route-link` deliberately carries no route, path, origin, or URL. The
Host consumes only the enclosing item's already validated, same-owner route
reference, resolves its named params through the canonical route registry,
and constructs the deep link for the current Host origin. A missing, stale,
unauthorized, or non-canonical enclosing route fails closed. Neither command
arguments nor display text can replace that association.

`copy-text` carries only `{ value }`. The value is one through 4096 Unicode
code points, excludes NUL, and is copied literally. It is not parsed, opened,
fetched, resolved, or granted URL semantics even if its characters resemble a
URL. The action cannot carry a route or command. This is the valid location
for a bounded opaque Room id that the user explicitly chooses to copy.

The closed union rejects callbacks, event handlers, DOM, HTML, CSS, selectors,
clipboard objects, `window.confirm`, arbitrary URL fields, renderer placement,
and combinations of command/copy effects. Confirmation is available only on
`command`; copy actions cannot hide an additional command behind a copy.

## Host execution and feedback ownership

For an enabled `command` action without confirmation, selection dispatches
the exact command once. With confirmation, the Host renders its own modal or
equivalent accessible UI from `title`, `description`, and `confirmLabel`.
Only an affirmative result dispatches the command. Cancellation closes the
Host UI, restores focus when practical, and produces no command, copy, success
feedback, or failure feedback.

For a copy action, the Host resolves the exact source described above and
performs the clipboard write. The plugin never receives a clipboard handle.
After a command resolves successfully or a clipboard write completes, the
Host presents `feedback.success`; any resolution, authorization, dispatch,
command, route-link construction, or clipboard error presents
`feedback.failure`. Raw thrown values, paths, URLs, command arguments, and
clipboard contents are not interpolated automatically. The Host owns loading,
duplicate-selection suppression, confirmation layout, menus, focus, keyboard
interaction, accessibility, feedback placement and duration, cancellation,
and teardown.

Disposal, owner generation replacement, item replacement, or collection
unload invalidates the projected action before side effects. Action ids are
only item-local reconciliation identities; they cannot forge ownership,
route association, command availability, confirmation, or authorization.

## Host and Chatroom migration

The Host adds `CordisXNavigationCollectionOptionsV2`,
`CordisXNavigationCollectionItemV2`,
`CordisXNavigationCollectionSnapshotV2`, and
`CordisXNavigationCollectionSourceV2`. `OptionsV2` requires
`contract: "cordisx.navigation-collection/v2"`; `ItemV2` preserves every
existing item field and adds optional `actions: NavigationCollectionActions`.
The existing `ctx.slots.registerCollection` method may expose an explicit v2
overload, but it selects that path only from the exact `contract` literal and
validates `actions` against
`navigation-collection-actions.v1.schema.json`. It must retain the enclosing
owner/generation and exact item route while projecting an action. The existing
route-only `CordisXNavigationCollectionItem`, snapshot/source types, and
undiscriminated `registerCollection` behavior remain accepted without actions.

Chatroom imports `NavigationCollectionActions` (or the discriminated action
types) from `@cordisx/protocol/navigation-collection-actions/v1` and supplies
immutable per-Room actions in its v2 collection snapshot. Its registration
options add only `contract: "cordisx.navigation-collection/v2"`. Pin, archive,
and delete are `command`; delete uses `tone: "danger"` and structured
confirmation. Copy deep link is `copy-route-link`. Copy Room id is `copy-text`
with the opaque id only in `text.value`. Chatroom registers the referenced
commands but does not render buttons, menus, confirmation, clipboard, or
feedback UI.
