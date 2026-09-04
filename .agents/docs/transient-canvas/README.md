# Transient canvas protocol v1

Surface contribution version 8 adds the experimental
`composer.submit.effects` extension point and the
`transient-canvas-presentation` payload family. The point runs after a
non-disabled native composer submit activation that the Host did not cancel.
It does not redefine the submit action and it does not expose the submit node.

## Drawing boundary

The Host creates a transparent, full-window, pointer-inert canvas, transfers
only its `OffscreenCanvas` backing store to an isolated Worker, and removes the
Host element when the bounded presentation ends. The Worker has no `document`,
`window`, selector, raw node, CSS authority, Host event object, network API,
private bridge, or renderer framework access.

The plugin registers a versioned declaration plus a Worker-local presenter.
The declaration carries a stable contribution id, a compatible extension-point
id, a duration from 100 through 5000 milliseconds, and either `skip` or
`static` reduced-motion behavior. The presenter receives only the transferred
`OffscreenCanvas`, pixel dimensions, bounded pixel ratio, start time, reduced-
motion state, and an abort signal. A callback is never serialized into a
surface document or passed to the Host renderer.

The initial Host point accepts only the structured `isolated-canvas` item.
Confetti, particles, trails, and other artwork are plugin programs, not
protocol variants or Host presets.

## Selection and lifecycle

Normal exact `ui.extension-points.render` policy for the declared point gates
projection. Multiple eligible contributions never layer: deterministic
surface order selects one and the Host diagnoses the rest as not rendered.
Only one presentation is active at a time. A later accepted trigger replaces
the active presentation.

The Host owns viewport sizing, pixel-ratio caps, z-order, pointer inertness,
reduced-motion selection, timeout, resize cancellation, generation fencing,
disable/uninstall cleanup, and canvas element removal. Startup without the
isolated Worker or transferable OffscreenCanvas primitives reports the point
as unavailable; it must not fall back to renderer-main execution or a DOM
mount callback.

## Execution declaration

Runtime manifest version 7 adds the closed execution declaration:

```json
{
  "realm": "isolated-worker",
  "interfaces": ["ui.transient-canvas/v1"]
}
```

Package version 7 is the first package contract that may reference manifest
version 7. Older manifests and packages remain closed and never acquire the
Worker interface by reinterpretation.
