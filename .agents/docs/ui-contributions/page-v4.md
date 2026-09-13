# Page metadata v4

Page v4 extends [standard page chrome](README.md) with bounded images, anonymous
avatars and single-level menus. [Schema](../../../schemas/page.v4.schema.json)
and [types](../../../types/page.v4.d.ts) describe the closed data shape.

The v4 schema tuple is required. Versions 1–3 remain frozen and supported; an
older Host rejects v4. A consumer targeting older Hosts must register a v3 page
with ordinary command actions instead. It must not pass new fields under an old
version or replace Host chrome with plugin DOM. This contract does not introduce
a runtime feature probe or an independent page-header service.

A header action has exactly one of `command` or `menu`. A menu contains 1–12
ordinary command actions; nested menus and menu-item visuals are forbidden.
Top-level action ids are unique per page, item ids per menu. The maximum remains
12 top-level actions. Array order is display order. Menu invocation uses the
existing outlet/page/command authorization, with action identity
`<trigger-id>/<item-id>`; the Host rechecks visibility, availability, disabled
state and authorization immediately before dispatch. Opening a menu invokes no
plugin command and supplies no new authority.

An optional `visual` replaces the icon; the two cannot coexist. `image` requires
`src`; `avatar` may omit it to request a neutral anonymous-guest glyph. Sources
are inline PNG/JPEG/WebP base64 data URLs, at most 262144 characters; external
URLs, SVG, HTML and executable content are rejected. Images are decorative:
the localized action label or ariaLabel supplies the accessible name. Failed
avatar decoding displays the same guest glyph; failed image decoding displays
a neutral action icon. No account identity is inferred from the native user,
email, initials or unrelated profile state. Consumers own image provenance.

The Host owns compact square triggers, clipping, theme, tooltips, disabled and
pending state, focus, menu layout and cleanup. Enter/Space and ArrowDown open a
menu. Arrow keys and Home/End navigate enabled visible items. Escape closes and
restores trigger focus; Tab closes and continues ordinary focus navigation.
Outside pointer input, route teardown, generation teardown and unavailable
triggers close menus. Async dispatch suppresses duplicate activation while
pending. Menus cannot outlive their page owner.

For native-history-backed `app` and `main` pages, Host chrome omits the legacy
page Close action. Existing Host/native navigation remains the way to leave;
this neither removes native window controls nor changes programmatic `close`
or `back` semantics. Other outlet close policies are unchanged. Plugins must
not add duplicate back or close controls.

## Security and compatibility scope

This is display data and existing command dispatch, not a new privileged
capability or trust boundary. Bounded raster-only sources avoid network fetches
and executable image markup. Menu actions retain owner-qualified authorization,
context checks, and page lifecycle. A schema pass checks shape, not successful
image decoding, native rendering, or Host adoption. Host/browser verification
must establish keyboard behavior, command policy enforcement, theme and cleanup.

## Primary command presentation

Within this unreleased v4 experiment, command actions may optionally declare
`presentation: 'primary'` to show their localized label beside the Host icon.
Omission or `icon` retains the compact icon-only presentation. At most one
primary action is allowed per page; menus and identity visuals cannot claim
primary presentation. Host owns the same height, typography, bounded label
width, tooltip, focus and pending state. This is presentation only and adds no
command authority. An earlier experimental v4 Host rejects this unknown field;
consumers must omit it when targeting that candidate. Versions 1–3 still reject
it, and no released version is changed by this experimental refinement.

## Standard header text alignment

A standard-chrome page body on matching experimental Hosts exposes read-only
CSS lengths `--cordisx-page-content-title-inset` and
`--cordisx-page-content-leading-center`. Their origin is the mounted body content
box's left edge, after its actual border and padding, including Host React root
padding. They locate the title text start and leading cell horizontal center
respectively. The cell persists for an icon, Back or an empty leading seat.
Lengths may be signed and change with layout. Consumers account for additional
plugin-owned padding, icon size and gap, and keep normal layout when absent.
Plugins must not override these tokens or inspect/style native chrome. Body-only
and Agent conversation pages do not provide this guarantee. The older
`--cordisx-page-title-inset` remains relative to the outer chrome container;
consumers must not treat it as a body-content offset.

Within this unreleased v4 experiment, the matching public Host SDK's
`CordisXPageControls.setHeaderActionVisual(actionId, visual): boolean` updates
only an existing visual action in the current mounted standard page. Kind must
match the declared avatar/image kind, and the same v4 inline-raster validation
applies. Unknown actions, invalid visuals and retired/unavailable page headers
return false. Commands, menus, visibility and authorization remain the immutable declaration.
Label updates use the separate bounded method described below. Updates retain the trigger, focus and menu lifecycle;
image decode failure uses the existing fallback. Older Hosts may omit the
method; feature-check it and retain the declared fallback. The SDK controls type
is exported by `cordisx`, rather than this Protocol types-only page subpath.
No frozen schema changes are made by these experimental refinements.

## Exit icon token

The additive Host token `host:log-out` represents a door frame with an arrow
pointing outwards. A page-header command may use it for leaving a room or
signing out. The token chooses a glyph only: the existing command, localized
label/ariaLabel, tooltip, confirmation and authorization continue to define the
action. It neither signs out nor closes a page by itself; `host:close` remains
the close glyph. Host owns regular weight, size and theme projection.

The existing `hostIconToken` pattern and page-v4 `host:${string}` type already
permit this token, so no frozen schema or semantic icon-theme catalog changes.
An older Host without this glyph rejects its registration; such a consumer
must retain a supported token until using the matching Host implementation.

## Content inset

Within this unreleased v4 experiment, `contentInset: 'none'` removes the
Host-provided body inset while retaining the selected `chrome` policy, including
the standard header. Omission or `standard` preserves the existing body inset.
The setting applies to the whole page body, including plugin-owned split panes;
it does not remove spacing inside plugin components, cards or canvases, change
scroll ownership, or affect other pages. Body-only and Agent conversation
surfaces retain their existing inset policy. The Host owns the projection and
styles; plugins must not override Host selectors or write its projection
attributes. Arbitrary CSS lengths are not accepted.

Versions 1–3 remain frozen and reject this field. An earlier experimental v4
Host may also reject it; consumers targeting that candidate must omit the field
and keep its existing layout. This is presentation metadata, with no additional
permissions, DOM seat or command authority.

During the unreleased page-v4 experiment, a command action with
`presentation: 'primary'` may additionally declare `variant: 'outlined'`.
Its idle surface is transparent with a Host border; hover adds the standard
Host surface background. Focus, disabled and pending states retain the shared
action behavior. Omission preserves the existing primary appearance. Icon-only
actions, menu triggers and menu items cannot declare this variant. Earlier
experimental Hosts reject the new field; omit it when targeting those Hosts.

## Mounted title breadcrumbs

The matching experimental public Host SDK exposes
`CordisXPageControls.setHeaderBreadcrumbs(items: readonly CordisXLocalizedText[], back: CordisXRouteReference): boolean`.
It projects 1–8 validated LocalizedText labels as a single standard-header title
line separated by `/`, with an owner-scoped Back route in the existing leading
cell. Labels ellipsize, retain full text, and the final label is the current page.
Consumers provide current product data when it changes; localization refreshes
rerender the latest cloned labels. Back runs through the normal Host route
registry's owner checks and authorization. The entire labels/route payload is
at most 16KiB UTF-8, params are finite JSON scalars, and no native DOM is exposed.
Invalid updates, unavailable/retired headers return false. Older Hosts may omit
the method; feature-check it and retain the immutable title. The preexisting
metadata.breadcrumbs second row remains unchanged; consumers omit it for this
single-line workflow. This method belongs to the cordisx SDK controls type and
the same unreleased experiment; no frozen page schema is changed.

## Ordinary text commands and mounted label updates

Within this unreleased v4 experiment, `presentation: 'text'` shows an ordinary
command's localized label with an optional Host icon. Its idle surface remains
transparent, with the shared compact height, typography, bounded ellipsis,
hover, tooltip, focus and pending behavior. Text commands retain array order
and the 12-action maximum; they do not count toward the single primary command.
Menus and avatar visuals cannot use text presentation, and `variant` remains
exclusive to primary commands. Earlier experimental Hosts and frozen versions
1–3 reject the new presentation; consumers targeting those Hosts omit it.

The matching public Host SDK exposes
`CordisXPageControls.setHeaderActionLabel(actionId: string, label: CordisXLocalizedText): boolean`.
It changes an already declared top-level command or menu trigger label in the
current mounted standard header. Primary and text commands show it; icon commands use
it for their accessible name and tooltip. Menu triggers also update an open
menu's accessible name while retaining the menu and its items. A declared `ariaLabel` remains the
accessible override, and a declared disabled reason remains the tooltip while
disabled. Menu items, unknown ids, unsupported or retired headers,
and invalid updates return false without changing the current label.

The label uses LocalizedText validation with finite scalar params and a maximum
16KiB UTF-8 JSON payload. Host clones inputs, renders text only, and localization
refreshes use the latest clone. Updates retain the trigger and focus; they do
not change command arguments, visibility, disabled/pending state, authorization
or menu lifecycle, and cannot affect native or other pages' controls. They do
not register or remount a page. Route/generation teardown retires the handle.
Older Hosts may omit the method; feature-check it and retain the declared label.
The controls type belongs to the `cordisx` SDK, as for visual and breadcrumb
updates; this Protocol types-only page subpath describes metadata. This adds no
DOM handle, HTML, native account access or new command authority.

### Leading images on text commands

Matching unreleased v4 Hosts allow `presentation: 'text'` with
`visual: { kind: 'image', src }`. The image replaces the optional icon and
appears before the visible localized label. It reuses the existing bounded
inline PNG/JPEG/WebP source rules and decorative image semantics; avatars,
menus and primary variants remain forbidden on text commands. The Host owns
the compact image size and spacing. A failed image uses the existing neutral
action icon while preserving the label. Mounted visual and label updates retain
the trigger, focus, command identity and pending state. This adds no service,
permission or account authority. Earlier experimental v4 Hosts reject this
combination; omit `visual` and retain the numeric/text label when targeting them.
Frozen versions 1–3 remain unchanged.
