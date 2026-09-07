# Extension-point drag v1

Experimental optional companion to visual snapshots v1/v2; those frozen wire
shapes are unchanged. Public types: [drag v1](../../types/extension-point-drag.v1.d.ts).
This is a callable capability, not a serialized document.

A renderer integration may supply an `ExtensionPointDragHandleV1` only for a
point supporting `drag`, declared by the visual and authorized by the exact
`ui.extension-points.interact` point/event scope. Pointer observation alone
never authorizes dragging. Absence means unavailable; visuals must remain usable.

The plugin reports one finite positive rectangle and accessible label in local
CSS pixels through `setRegion`; null removes it. The Host clips the rectangle
to the point, owns hit testing, capture, keyboard equivalents and event handling,
and must not let the region take over native input or submission controls.
Raw events, native nodes, screen coordinates and native action invocation are
not exposed. Artwork remains pointer inert.

Snapshots are immutable. Sequence increases on every transition; gesture changes
at start. `deltaX`/`deltaY` are cumulative CSS-pixel displacement since that start.
Start/move/end/cancel remain the latest snapshot until a new transition, so a
renderer cannot miss release because updates coalesced. Consumers must handle
an end snapshot even if start/move was coalesced. Keyboard movement can be a
complete gesture. Cancel, permission withdrawal, focus loss, generation retirement
or removal must release capture and remove hit targets. Retired handles are inert.

The Host owns authorization and geometry bounds. Plugins own placement and any
release animation, must cancel timers on disposal, respect reduced motion and
clamp placement after resize. No persistence is implied by this contract.

The handle may also deliver `activate` when the exact point independently grants
`activate`. It is a completed short press or keyboard activation, with zero
deltas and a new gesture. Drag authorization never grants activation. A gesture
that exceeded the Host drag threshold cannot later activate, even if it returns
to its starting position. A combined hit region may serve both capabilities.
