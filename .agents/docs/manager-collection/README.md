# Manager collection protocol v1

This specification defines a generic, data-only source for a Host-rendered
searchable collection inside an authorized CordisX Manager page body. It is
not a Chatroom API and it does not expose the private HostCollection renderer,
a DOM seat, a list component, a drawer, or a dialog handle. The closed JSON
contracts are registration, Host query, source snapshot, and action result v1;
the TypeScript source lifetime is exported by
`@cordisx/protocol/manager-collection/v1`.

This contract composes
`@cordisx/protocol/navigation-collection-actions/v1`. It references that
action union and does not copy or redefine its command, confirmation,
copy-route-link, copy-text, feedback, placement, tone, pressed, disabled, or
clipboard semantics.

## Registration, views, and Host search

A registration has one stable local collection id, retained localized label
and description, one through eight closed views, a default view, and an exact
search descriptor. View ids are generic owner-local identities. A source may
name views `active` and `archived`, but those strings have no built-in Room or
Chatroom meaning.

The Host renders the view selector and search input. Search fields are exactly
the resolved public row `title` and `summary`; raw ids, route params, command
arguments, localization keys, avatar refs, and private source data are never
search fields. The Host NFKC-normalizes and case-folds the input, issues a
monotonic `queryRevision`, and provides both original and normalized text to
the source. It also filters the returned resolved title/summary as a defensive
check, owns match highlighting, clear/Escape behavior, focus, labels, empty
and no-match states, and never accepts a plugin-supplied input element.

### Exact `nfkc-casefold` algorithm

`nfkc-casefold` has one frozen meaning. Implementations use Unicode 17.0.0 and
perform these steps in order:

1. Convert the input to Unicode scalar values by replacing every isolated
   UTF-16 high or low surrogate with U+FFFD. No other replacement is allowed.
2. Apply Unicode 17.0.0 `toNFKC_Casefold` from rule R5 of the Default Case
   Algorithms. Equivalently, map each scalar through the Unicode 17.0.0
   `NFKC_CF` mapping in `DerivedNormalizationProps.txt` (an absent mapping is
   identity and an empty mapping removes the scalar), concatenate the mappings,
   and apply Unicode 17.0.0 NFC to the result.
3. Map each code point in the Unicode 17.0.0 `White_Space` set to U+0020. The
   exact set is U+0009..U+000D, U+0020, U+0085, U+00A0, U+1680,
   U+2000..U+200A, U+2028, U+2029, U+202F, U+205F, and U+3000.
4. Replace every non-empty run of U+0020 with one U+0020, then remove a leading
   or trailing U+0020. Do not trim, collapse, remove, or rewrite any other code
   point.

Normative Unicode references are
`https://www.unicode.org/versions/Unicode17.0.0/`,
`https://www.unicode.org/reports/tr44/tr44-36.html`,
`https://www.unicode.org/Public/17.0.0/ucd/DerivedNormalizationProps.txt`, and
`https://www.unicode.org/Public/17.0.0/ucd/PropList.txt`. A Unicode-data
upgrade, transform change, or whitespace-set change requires a new
normalization token and a new contract version. JavaScript `toLowerCase`,
`toLocaleLowerCase`, NFKC alone, or any locale-sensitive approximation is
non-conforming.

The Host applies the algorithm independently to the original query and to the
resolved title and summary of every returned row. An empty normalized query
matches every row. Otherwise a row matches exactly when the normalized query
is a contiguous Unicode-code-point substring of normalized title or normalized
summary; matching never spans the boundary between those two fields. The Host
must perform this final filter before rendering and must not trust source-side
filtering.

The source may ignore search and return the complete selected-view snapshot.
It may use `query.search.normalized` only as an optimization that returns a
superset of every row the Host algorithm would match; false positives are
allowed because the Host removes them, but false negatives are forbidden. A
source that cannot guarantee that superset returns the complete view instead
of using lowercase, locale, database-collation, token, prefix, fuzzy, or other
approximate filtering. It still echoes the exact query fence. If the complete
view cannot fit the snapshot bound, the source fails the snapshot rather than
truncating possible matches.

The Host never truncates normalized text. Query input remains bounded at 256
code points; its normalized value is bounded at 8192 code points. If the exact
result exceeds that bound, the Host fails the query closed with sanitized
Host-owned error UI and does not call the source.

## Source, query fencing, and rows

The Host calls `source.snapshot(query, signal)` and may await the result. A
source snapshot echoes the exact collection id, query revision, view, and
normalized search plus a monotonically increasing source revision. A late,
mismatched, regressing, or post-abort snapshot is discarded. `subscribe`
means data changed; it does not submit a query or snapshot. The Host reissues
its current query. Page close, route change, owner disposal, policy denial, or
generation replacement aborts the query, disposes the source exactly once,
clears the controlled collection root, and removes Host controls and dialogs.

The runtime registry is scoped to the current authorized `manager.content`
page mount; it is not a global placement service. Its v1 `register` call
claims that page mount's single Host-created collection child root. The plugin
receives the registration handle, never the root. A second active registration
in the same scoped registry fails closed. The Host automatically disposes the
handle and source when the enclosing page mount ends, even if plugin cleanup is
late or absent.

A row contains only stable opaque id, display title, public summary,
Host-rendered leading visual, same-owner route, explicit order and disabled
state, and a bounded structured action list. The Host owns row/list semantics,
selection, navigation activation, direct/overflow controls, responsive
layout, keyboard behavior, loading/error projection, localization, and a11y.
Rows cannot carry DOM, CSS, HTML, selectors, callbacks, arbitrary metadata,
search aliases, a detail renderer, a drawer, or an outer-router URL.

Leading visual is a closed semantic Host icon, one formal Agent avatar ref, or
an ordered avatar stack of at most sixteen stable entries. The Host owns its
geometry, fallback, contrast, accessible treatment, and cleanup. This generic
value does not contain a Room id and does not replace the separate Agent
Conversation Shell Room visual contract.

## Actions, text input, confirmation, and results

Rows reuse the predecessor command/copy action union. Row-body activation uses
the enclosing same-owner route. Pin, archive, restore, or delete are ordinary
command actions; action ids do not grant semantics or authorization. Every
danger-tone command in a Manager collection requires the predecessor's
structured confirmation. The Host renders it, dispatches only after an
affirmative choice, restores focus on cancel, and owns feedback and clipboard.

The only additive action kind is `text-input-command`. It is neutral-tone and
contains one command reference plus one single-line text request: Host dialog
title, optional description, field label/placeholder, optional initial value,
submit label, argument name, bounds, and trim policy. The command's existing
arguments must be an object and must not already contain the input argument.
After Host validation, the Host creates a new object by adding exactly the
collected value at that argument and dispatches once. For example, arguments
`{ roomId }` plus argument name `title` dispatch exactly `{ roomId, title }`;
the schema does not know either business field.

Command handlers used by this primitive return
`cordisx.manager-collection-action-result/v1`. `applied` requires the new
source revision; `rejected`, `conflict`, and `unavailable` forbid it. The
result contains no arbitrary business payload or display message. Only
`applied` selects predecessor `feedback.success`; all other valid results,
invalid results, throws, aborts, authorization failures, or snapshot refresh
failures select sanitized `feedback.failure`. A result never patches a row;
the Host waits for or re-reads the authoritative source snapshot.

The Host rechecks live owner, generation, collection, row, action, command,
point/outlet policy, and disabled state immediately before side effects. A
producer's visible row, `disabled.value: false`, pressed state, result, or
source revision is never authorization.

## Primitive boundary and compatibility

This v1 primitive owns collection views, Host search, rows, actions, query
fencing, and source lifecycle only. Route-level tabs/breadcrumbs/back/history
remain `manager-content-navigation.v1`; top-level navigation remains
`manager.settings.navigation-items`; page chrome remains page v3. Business
trees, record detail content, forms, and body-local workflows stay inside the
authorized plugin body. Settings write/apply is explicitly outside this
contract.

Frozen surface-contribution v1 through v7, route v1/v2, page v1/v2/v3,
Manager navigation, and the legacy sidebar `registerCollection` API are
unchanged. An older Host keeps an unknown Manager collection registration
inactive with a compatibility diagnostic and must not reinterpret it as the
private HostCollection or sidebar collection API.
