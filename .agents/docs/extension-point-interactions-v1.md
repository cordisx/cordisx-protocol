# Extension-point interactions v1

Optional, experimental callable companion to [drag v1](extension-point-drag-v1.md).
Public types: [interactions v1](../../types/extension-point-interactions.v1.d.ts).
There is no new serialized wire document. Frozen visual snapshots and legacy
single drag handles retain their existing behavior. A renderer may expose an
optional `interactions` factory with version `cordisx.extension-point-interactions/v1`.
Absence means unavailable; consumers must not synthesize native hit targets.

Each factory is scoped to one visual registration generation and point. `create(id)`
returns a stable live handle for an owner-local nonempty id (at most 100 characters).
At most 32 handles may be live per factory. Invalid ids or exhaustion throw;
disposing a handle releases its slot. Retired factories cannot create new handles.
The legacy single drag handle is separate. Consumers should use one mode for
an artwork so they do not register overlapping duplicate targets.

Every entity inherits drag v1 geometry, capture, keyboard and clipping rules.
Host owns all hit targets and menu nodes; plugin artwork stays inert. Regions
may overlap; later-created targets win hits, and active dragging may be raised.
`setRegion(null)` removes the target and dismisses any menu. Individual disposal,
permission withdrawal, unmount and generation replacement release all resources.

`hovered` describes pointer presence in this entity's authorized hit region,
not a global pointer stream. It is available with a drag or activation grant.
Menus require the exact existing `activate` grant in
`ui.extension-points.interact`; drag or pointer observation alone cannot open
menus or select items. This authorizes local semantic activation only, not any
additional platform command. Commands still need their own capabilities.

`setMenu` accepts null or at most 20 flat items with unique nonempty ids (at most
100 characters), nonempty labels (at most 200), and optional boolean disabled.
Invalid input throws without replacing the previous menu. Labels are plain text;
no HTML, raw events, coordinates, nested menus, callbacks or native action ids
are accepted. Replacing items closes the current menu, preventing stale actions.
Right click or the context-menu keyboard gesture opens Host chrome, cancelling
any pending gesture without emitting activate. Escape and outside interaction
close it; Host manages focus restoration and arrow/Home/End navigation. Disabled
items never emit actions. Menu opening and selection never initiate a drag.

Snapshots are immutable and sequence-monotonic. Hover/menu-only transitions use
phase `idle`, retain the gesture number and reset deltas to zero. `menuOpen`
allows a scene to pause autonomous motion. Selecting an enabled item emits its
`actionId` only on that transition; consumers deduplicate by sequence. Ordinary
gesture snapshots retain hovered/menuOpen but omit actionId. On retirement all
handles are inert. Consumers must clean up subscriptions and timers as usual.

Security: only bounded plugin-declared rectangles participate in hit testing;
menus stay Host-controlled and viewport-clamped. No native DOM, raw pointer
coordinates, message content or shell action authority is conveyed. Allocation
and menu bounds limit resource growth. Implementations must fence permission
changes at open, selection and gesture delivery, not merely at allocation.
