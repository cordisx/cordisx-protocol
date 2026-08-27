# Reasoning intensity presentation protocol

This specification is normative for the Host-owned visual projection of a
native reasoning-intensity control. It adds
`composer.reasoning-intensity` in surface contribution version 6 and the
`reasoning-intensity-presentation` family in host catalog version 6.

The contribution is presentation data, not a setting implementation. The
native product remains the sole owner of the current value, allowed values,
input/change events, persistence, keyboard behavior, focus, and accessible
name. A CordisX Host may visually project the unique native range only while
that range is available and unambiguous. It must leave the native control as
the interactive and accessible source of truth.

## Payload

One contribution supplies a localized title, an `imperium` visual variant,
optional `smooth` or `ascension` motion, and two through eight ordered stages.
Every stage has a localized label and one closed material token: `plastic`,
`bronze`, `steel`, `silver`, or `gold`.

Materials are semantic Host tokens. They are not colors, images, gradients,
CSS classes, selectors, or asset references. The Host owns all rendering and
may adapt each material to the active theme, contrast mode, motion preference,
and available geometry.

## Native value mapping

The Host normalizes the native range from its finite `min`, `max`, and `step`
values and maps that progress to the nearest ordered presentation stage. If
the native value count differs from the number of declared stages, the Host
interpolates across the full range rather than changing the native values.
The native product label and setting semantics are never replaced by a plugin
label.

The Host may animate a click between values. During a pointer drag it should
track continuously without introducing input lag. `prefers-reduced-motion`
must disable non-essential movement.

## Lifecycle and failure

The Host reevaluates the projection as the native popup appears, changes, and
disappears. Removal, disablement, generation replacement, permission denial,
or loss of a unique native seat restores every Host-applied native style and
removes the projection. An ambiguous or missing range is pending and produces
no fallback control and no unrelated DOM mutation.

Multiple active contributions do not layer. The Host deterministically picks
the first eligible contribution using normal contribution ordering and
diagnoses the others as not rendered.

## Security boundary

Version 6 rejects arbitrary HTML, SVG, CSS, selectors, DOM references, script,
event handlers, mount callbacks, raw color values, image URLs, unknown variants,
unknown motion modes, and unknown material tokens. Plugins cannot locate or
hide the native control themselves and cannot synthesize a replacement range.
