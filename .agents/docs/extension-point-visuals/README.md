# Extension point visuals v1

Status: experimental contract. This successor does not establish Host adoption,
live verification, merge or publication. Existing versions remain frozen.

## Seats and ownership

Surface contribution v10 and catalog v10 add `composer.primary-action.visual`
and `composer.frame.overlay`, with payload family `extension-point-visual-v1`.
The item names a renderer registered by the same owner in the same generation.
A renderer is lazy: resolving its module requires a currently granted, available
seat and a visible owning generation. Registration must not evaluate it early.
Host integrations may offer a controlled React/SVG component mount using their
shared runtime; the protocol does not prescribe a framework, DOM or renderer
implementation. The callable renderer never receives a Host node or container.

The primary seat replaces only visual content. The Host keeps the native
control, click, focus, disabled/busy state, tooltip, keyboard activation and
accessible name. Its visual is pointer-inert and hidden from accessibility.
It cannot register activate or drag. The overlay occupies Host-issued bounds;
transparent space passes through. A future interactive overlay uses explicitly
Host-issued hit regions and semantic events; permission alone never creates a
hit region or authorizes a native action. Version 1 Hosts may support only
`pointer.observe`. Unimplemented activate/drag requests remain unavailable;
they must never become raw pointer handlers or native action proxies.

The Host selects at most one eligible visual per seat using the existing
code-unit group/order/id ordering with owner identity as the final tie breaker.
Errors, ambiguous anchors, denial and unload restore native presentation.
Stale asynchronous module completions cannot mount after withdrawal or replace
a newer generation. The Host owns error containment and every root/listener.

## Authority and downgrade

Rendering requires `ui.extension-points.render` with exact `extensionPoints`.
Pointer delivery separately requires manifest v10's `ui.extension-points.interact`
with both exact `extensionPoints` and a nonempty `events` list. No wildcards,
unscoped interaction, or other scope dimensions are accepted. Permission common
v5, plan/decision/policy v5 and capability catalog v4 carry this scope.
Each event and seat must be in the declaration, user grant and adapter support;
all three are intersected, never unioned. Denial or revocation immediately
stops delivery and clears the last pointer. Render-only visuals remain useful
with `pointer: null`. Required unsupported capability prevents activation;
optional unsupported interaction degrades to rendering without events.

Official or certified provenance does not bypass the declaration or user deny.
Interaction is explicitly prompted and must not receive certified implicit
approval. Changes to either scope dimension require reauthorization under the
existing fingerprint/generation rules. The permission broker evaluates current
authority before loading and before every event delivery.

Older Hosts reject unknown required manifest versions/capabilities. Plugins may
ship a separately declared older compatible entry, but cannot silently register
these seats under an older surface schema, use free-DOM points, or fall back to
`ui.host-dom.modify`. Older catalogs remain unchanged.

## Semantic projection

The schema and public `extension-point-visual/v1` types define the snapshot.
`action` identifies the operation actually bound by the Host, independently of
`draftEmpty`: voice, send, stop, cancel, queue, steer, resume or end-voice.
Hosts publish only operations they can prove. Unknown operations, ambiguous or
zero anchors yield pending/unavailable, never a guessed action or coordinate.
`enabled` includes native disabled and interaction blocking; `busy` represents
the operation's actual pending state, not a synonym for generating a response.
`draftEmpty` contains no draft content. Accessible labels are Host UI copy and
must not interpolate input text. Bounds are available local CSS-pixel dimensions;
no document coordinates or native geometry objects cross the boundary.

Pointer coordinates are finite normalized numbers clamped to [0,1], plus an
inside flag. The Host coalesces observation to at most one frame update and
never passes an event, target, identifier, button handler, document or window.
Theme and reduced-motion changes update the same immutable source. Reduced
motion is authoritative even when the plugin's own preferences request motion.

Snapshots have monotonic sequence numbers within a mount generation. Transient
events have a separate strictly increasing sequence, ordered in each bounded
batch (at most 32); consumers track the last seen sequence and must not replay
old events after state updates. A new mount starts a new event history and must
not replay earlier submissions. `submitted` requires confirmed Host acceptance;
a click or keydown is only intent. `submit-failed` requires confirmed failure.
An adapter without acceptance evidence emits no such events. Rejected intents,
voice activation, queue and stop must not be fabricated as successful sends.

## Security analysis

This is an authority and lifecycle boundary, not a JavaScript sandbox. Trusted
renderer plugins retain the existing renderer trust model. Controlled renderer
arguments expose semantic data only; plugins must not use ambient globals to
escape their seat. No document/window, selector, native node, HTML, class/style,
raw PointerEvent or native handler is part of this contract. SVG assets and
expressions belong to the plugin; the Host owns placement and clipping. A Host
must reject unsupported render content and isolate a failed contribution so
native controls continue functioning. Resource loading is fenced by authority,
availability and generation; revocation invalidates pending loads and event
subscriptions as well as already mounted visuals.

## Representations

- [Snapshot schema](../../../schemas/extension-point-visual.v1.schema.json)
- [Surface successor](../../../schemas/surface-contribution.v10.schema.json)
- [Catalog successor](../../../schemas/host-extension-point-catalog.v10.schema.json)
- [Public types](../../../types/extension-point-visual.v1.d.ts)
- [Conformance](../../../conformance/extension-point-visuals.mjs)
