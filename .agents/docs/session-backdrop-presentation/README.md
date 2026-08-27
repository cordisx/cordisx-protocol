# Session backdrop presentation protocol

Surface contribution version 7 adds `session.backdrop` and Host catalog
version 7 adds the `session-backdrop-presentation` payload family. The point
lets a plugin describe a reversible visual stage behind an active session; it
does not let plugins locate or mutate native DOM.

## Payload and driver

The first version supports the `imperium` variant driven by the native
reasoning-intensity value. Two through eight ordered stages each provide one
semantic material, one closed ambience token, and one embedded PNG portrait.
The Host normalizes the native range and maps it to the nearest backdrop stage.

Portrait data is a bounded base64-encoded `image/png` with localized alt text.
Network URLs, file URLs, HTML, SVG, CSS, selectors, scripts, and event handlers
are rejected. The Host owns decoding, placement, masking, opacity, contrast,
responsive geometry, reduced-motion behavior, and all background effects.

## Composition and lifecycle

The Host may render the backdrop while an identified session is active. The
backdrop never receives pointer events, must not reduce native text contrast,
and must not move or resize native controls. Native reasoning interaction and
accessibility remain unchanged.

The Host may retain the last observed stage while the native reasoning popup
is closed for the same session. A session change resets that retained state
until a new native value is observed. Plugin removal, disablement, generation
replacement, permission denial, or session loss removes the backdrop and its
decoded images without leaving native styles behind.

Multiple active backdrop contributions do not layer. Normal contribution
ordering chooses one eligible contribution and diagnoses every other candidate
as not rendered.
