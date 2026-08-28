# Icon theme provider protocol

This specification is normative for public icon-theme provider contracts
version 1. It lets a Host use Reicon by default and lets a user select a
registered provider from a future theme package without transferring rendering,
DOM, accessibility, or policy ownership to that provider.

The Host is the only renderer. A provider resolves a closed semantic key into
one bounded normalized vector descriptor. It does not return a component,
element, asset location, style, or executable renderer.

## Scope and exclusions

Version 1 applies only to Host-rendered semantic interface glyphs. It does not
apply to:

- the CordisX `BrandMark` or any product/logo mark;
- plugin package metadata such as `presentation.icon`;
- marketplace artwork, avatars, portraits, screenshots, or other remote
  images; or
- native-product icons that the Host does not own.

Those values keep their existing contracts and never pass through an icon-theme
provider. A plugin or provider never owns icon DOM, event handlers, focus,
tooltip content, accessible names, roles, labels, hit targets, contrast, theme
colors, or cleanup.

## Closed semantic catalog

`icon-theme-common.v1.schema.json#/$defs/semanticIconKey` is the complete version
1 key catalog. It is closed by category:

- `action.*`: add, back, close, copy, delete, edit, external-link, more, open,
  refresh, reset, save, search, settings, and share;
- `agent.*`: reasoning;
- `content.*`: calendar, clock, files, folder, key, layers, palette, panel, and
  tags;
- `control.*`: check, four chevrons, minus, and plus;
- `navigation.*`: about, channels, dashboard, extensions, history, launcher,
  marketplace, overview, plugins, routes, runtime, and store; and
- `status.*`: error, info, pending, success, and warning.

An implementation must not synthesize new keys, accept provider-private keys,
or reinterpret `host:*` token spelling as an extensible theme namespace. A new
semantic meaning requires a later protocol schema version.

Every resolution request also carries one closed variant (`regular`, `filled`,
or `duotone`) and one closed state (`default`, `hover`, `active`, `selected`,
`disabled`, `danger`, `success`, or `warning`). These values select geometry;
they do not grant styling or interaction authority.

## Provider identity and registration

A provider identity is the tuple `(providerId, namespace, protocolVersion,
providerVersion)`. `protocolVersion` is `1`; `providerVersion` is SemVer.
Built-ins use `builtin:<namespace>`. Theme packages use
`plugin:<pluginId>:<namespace>`.

The mandatory default identity is `builtin:reicon` with namespace `reicon` and
complete version-1 coverage. The Host registers it before accepting a custom
selection. Reicon is also the only version-1 fallback provider.

Registration documents are Host-authored projections, not provider claims. The
Host binds a plugin registration to an already-issued principal handle, derives
the exact `plugin:<pluginId>:<namespace>` identity, assigns an opaque provider
handle, and fences it to one provider generation. A provider cannot choose a
built-in id, reuse another plugin id, assert a different source principal, or
put its identity in a resolution result. Duplicate identities, namespaces, or
handles are rejected by the Host registry.

Coverage is either `complete` or an explicit partial list of key, variant, and
state sets. Coverage is advisory for routing and diagnostics, not permission to
return anything outside the requested tuple. Duplicate or overlapping partial
entries for the same key are invalid. A custom provider may omit any tuple.

## Selection and fallback

Selection is profile-scoped, revisioned, Host-authored, and fenced to both the
Host generation and exact provider generation. The Host prepares and validates
a candidate generation before publishing it as selected. A selected custom
provider does not replace the fallback reference: `builtin:reicon` remains
pinned in the same selection snapshot.

For each requested tuple the Host follows this order:

1. resolve against the exact selected provider handle and generation;
2. accept only a correlated `resolved` result whose descriptor conforms;
3. on `missing`, rejected output, timeout/unavailability, stale generation, or
   invalid descriptor, resolve the same tuple with the pinned Reicon fallback;
4. if the fallback cannot resolve, render the Host's non-provider safe fallback
   or no glyph while retaining the accessible name on the Host control.

The Host must not ask a provider to choose another provider or return fallback
markup. Missing partial coverage is normal and does not deactivate the provider.
Repeated provider failures may trigger the lifecycle rollback policy below.

## Resolution descriptor

The only successful provider payload is
`normalizedVectorDescriptor` version 1:

- a fixed `0 0 24 24` view box;
- one to sixteen paths;
- structured `move`, `line`, `quadratic`, `cubic`, and `close` commands with
  bounded numeric coordinates;
- closed fill/stroke paint modes, bounded opacity, and bounded stroke geometry.

The first command of every path is `move`; `close`, when present, is final. The
Host supplies semantic color, sizing, state projection, mirroring policy, DOM,
and accessibility. Unknown fields invalidate the entire descriptor.

The schemas explicitly reject React or framework components, DOM nodes, raw
SVG, raw HTML, CSS/style values, colors, URLs, selectors, callbacks, event
handlers, `foreignObject`, transforms, images, fonts, local paths, and provider
identity assertions. Structured numeric path commands are data; they are not
raw SVG path strings and must never be injected as markup.

## Generation lifecycle, disposal, and rollback

Every externally visible lifecycle operation carries an expected registry
revision and Host generation. Provider work is isolated by provider handle and
provider generation.

- `register` stages a plugin-principal-bound identity, generation, and coverage.
  The Host validates representative resolutions before marking it ready.
- `select` atomically publishes one ready exact generation. The prior active
  generation remains last-good until publication succeeds.
- `dispose` targets one exact non-selected or retired generation. Disposal is
  idempotent; late results from that generation are ignored. Providers receive
  no DOM cleanup hook because they never own DOM.
- `rollback` retires the failed exact generation and restores an exact last-good
  generation, normally the pinned Reicon generation when no custom last-good
  generation is usable. Selection publication and rollback are atomic.

A failed prepare leaves the current selection unchanged. A failed dispose does
not make an old generation eligible again. A failed rollback reports
`rollback-failed` and the Host uses its non-provider safe fallback; it must not
accept results from the failed generation. Revisions increase only for
published registry state.

The operation/result schemas are serializable lifecycle records. They do not
define a JavaScript callback API or expose a transport. Provider invocation,
timeouts, cancellation, worker/process isolation, and principal-handle issuance
are Host-private implementation concerns.

## Compatibility and downgrade

A Host that does not support icon-theme protocol version 1 ignores custom
provider registration and continues using its own icons. A version-1 Host
rejects unknown protocol versions, keys, variants, states, descriptor formats,
or fields. It never approximates a future descriptor.

Consumers may rely on Reicon being the default and fallback identity only after
the Host publishes a conforming version-1 selection. This protocol defines no
claim about a particular Reicon package version or framework binding; those are
Host implementation details behind the versioned provider identity.
