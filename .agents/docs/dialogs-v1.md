# Dialogs v1

Maturity: experimental additive renderer-local capability. This document defines
behavior; it does not assert Host release or native verification. Public types:
[dialogs.v1.d.ts](../../types/dialogs.v1.d.ts).

## Ownership and presentation

The injected `dialogs` facade binds identity, registrations, handles and queued
requests to one plugin source and activation. Callers cannot select another
owner, impersonate Host permission UI, or close another owner's dialog.
The Host owns title, subtitle, plugin identity, modal frame, header/footer
layout, icons, styles, focus, keyboard dismissal and lifecycle. The close button
is always the rightmost header control. Up to two header actions appear directly;
additional actions use a Host-rendered More menu (eight total maximum). Footers
permit one primary action, at most three secondary actions and a status string.
Header/footer never accept JSX, DOM, HTML, CSS or replacement render functions.

Bodies are full interactive renderer seats, not plain-text or rich-text
containers. Registered mount functions receive only the plugin body container,
props, lifetime signal and handle. Mount cleanup runs when closed, unregistered,
retired or unloaded. Props and callbacks stay renderer-local; no wire transport
or serialization of JSX is implied. A React adapter may preserve context by
portaling from the original React tree. Imperatively mounted views establish
explicit providers of their own. Body-render failures must preserve Host close
controls and offer recovery without exposing raw exception text.

## Queue, actions and results

Ordinary requests do not preempt the active dialog. The window queue admits at
most 20 entries and each binding at most five. Overflow resolves `queue-full`;
missing views resolve `unavailable`; retired owners resolve `disposed`. There
is no silently suppressed request with an unresolved result. Deduplication uses
binding + stable semantic kind + explicit instance key. Different objects never
coalesce solely because their kind is identical. Existing descriptors are kept
when a duplicate request returns its handle.

Requests originate from a user interaction. Background events use notifications
with an explicit action to open a dialog. No automatic timeout or persisted body
content. Owners dispose all visible and queued requests on retirement.

Actions execute at most once concurrently per dialog. Pending/disabled actions
are unavailable. Successful actions close only when requested. Failed operations
retain the dialog and report a safe message via the Host notification system;
field validation stays beside the field. Notifications must remain visible and
operable while a modal is open. Neither raw exceptions nor server payloads are
automatically shown.

The standard close button, Escape, optional backdrop dismissal and handle close
share the asynchronous `beforeClose` gate. Repeated close attempts while checking
are ignored. Body unmount, owner retirement and registration disposal are forced
cleanup and cannot be vetoed. Signals are aborted at final dismissal, including
while a business task is pending. Signal cancellation does not imply rollback of
remote effects; the plugin owns idempotency and durable task tracking.

One same-owner child confirmation may interrupt its active parent, including
inside a close guard. Other child requests or foreign/stale parent handles are
unavailable. Parent close waits for the child; parent disposal disposes it.
The result settles exactly once as completed, closed, disposed, unavailable or
queue-full. No positive confirmation is inferred from dismissal.

## Forms, accessibility and compatibility

`form` covers a bounded set of labeled string, number and boolean fields using
the Host form renderer. Required and min/max constraints are validated before
submission; string bounds measure trimmed length, number bounds measure value.
Complex schemas and workflows use the registered or declarative body seat.

The Host supplies light/dark themes, bounded width presets, a viewport-limited
height, one body scrolling owner or an explicit fill layout, accessible names,
focus entry/containment/restoration and focus-visible controls. Body popovers use
a container inside the active modal's flat tree. Long titles, narrow windows and
additional actions cannot displace the close button.

This is not a sandbox for malicious renderer JavaScript. Host chrome must resist
ordinary plugin CSS through an explicit style boundary; body seats do not grant
Host DOM authority. Trusted renderer code retains its existing trust model.
Older Hosts do not implement the capability: require `dialogs` injection and a
compatible SDK/Host, with no private DOM fallback. Existing collection and schema
contracts remain compatible and can adopt the shared renderer internally.
