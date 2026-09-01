# Composer submit celebration presentation profile v1

This specification is normative for the version-1 composer submit celebration
profile. It is an application profile of the existing
[`extension-point control plane v1`](../slots/control-plane-v1.md), not a new
event, command, overlay, or DOM API. Its profile identifier is
`cordisx.composer-submit-celebration/v1`.

The profile lets one authorized plugin observe an accepted activation of the
native composer submit control and request a bounded, Host-owned celebration.
The plugin never receives a selector, node, native event, callback, message
body, canvas, stylesheet, animation implementation, or presentation mount.

## Existing-contract boundary

The profile uses the existing `composer.toolbar.items` semantic point and the
closed version-1 control-plane schemas:

- `host-extension-point-control-catalog.v1` advertises the profile and its
  safe property, commands, and event;
- `extension-point-control-declaration.v1` requests an explicit `proxy` claim;
- `extension-point-control-snapshot.v1` proves selection, exact profile
  support, and current binding availability;
- `extension-point-control-event.v1` projects native submit activation; and
- `extension-point-control-access.v1` plus
  `extension-point-control-result.v1` request and acknowledge presentation.

The existing `overlay` mode is not sufficient by itself. It requires an
authorized structured presentation at its semantic point and does not define a
full-window confetti payload. The generic `presenter` family is limited to
banner, status, chip, and progress. `session.backdrop` is a reasoning-driven
background, not a transient submit effect. Hosts must not reinterpret any of
those contracts, revive `shell.overlay`, or accept free DOM for this profile.

No new JSON Schema is needed: all wire values fit the scalar-only, closed
control-plane v1 documents. The profile identifier, exact binding descriptors,
and the additional semantic bounds below are enforced by its conformance
suite.

## Control catalog profile

A conforming Host advertises the profile on `composer.toolbar.items`. The
point retains the required legacy `compose` mode. The celebration observer uses
an authorized `proxy` mode that explicitly coexists with `compose` and belongs
to an exclusive group. `host-priority` selection ensures that at most one
claim receives each native submit activation. A Host may merge unrelated modes
or bindings into the point only when all control-plane coexistence and
selection rules remain valid.

The exact profile bindings are:

| Kind | Id | Shape |
| --- | --- | --- |
| safe property | `celebrationProfile` | immutable renderer-safe string enum containing only `cordisx.composer-submit-celebration/v1` |
| Host-projected event | `submitActivated` | required string `activationId` |
| Host-brokered command | `presentCelebration` | required strings `requestId`, `activationId`, `effect`; required integer `durationMs`; `effect` is the one-value enum `confetti` |
| Host-brokered command | `dismissCelebration` | required string `requestId` |

The plugin registers one fiber-owned explicit `proxy` declaration and requests
the profile property plus the event and commands it consumes. The declaration
`contributionId` is stable data identity for the proxy claim; it is not a DOM
mount or a replacement surface.

Profile support is established only when all of the following are true in the
same Host generation:

1. `composer.toolbar.items` and its semantic `submit` anchor are reported as
   supported by the current Host catalog;
2. the control catalog exposes the exact profile binding shapes above;
3. the claim is `selected` and projects
   `celebrationProfile = cordisx.composer-submit-celebration/v1`; and
4. `submitActivated` and `presentCelebration` are currently available.

Catalog presence is capability discovery, not authorization or current mount
evidence. A plugin must not infer support from a similarly named point,
renderer behavior, or DOM state.

## Native submit event

The Host emits `submitActivated` once after its native composer submit
activation has been accepted. Pointer, keyboard, and other native activation
paths share this semantic event. A disabled, rejected, or otherwise unaccepted
native activation emits no event. Event delivery is observational: it cannot
cancel, delay, replace, repeat, or modify native submission.

`activationId` is an opaque Host-issued value scoped out of band to the exact
principal, claim, plugin fiber/module generation, and Host generation. It
contains no session, message, prompt, account, or provider identity. It may be
used by one accepted `presentCelebration` request and expires on first use,
after 5 seconds, when selection or authorization changes, or when either the
plugin or Host generation is fenced. Stale, cross-owner, or replayed activation
ids are rejected with `activation.stale`.

## Presentation request

The plugin creates a unique `requestId` within its module generation and sends
`presentCelebration` with the received `activationId`, `effect: confetti`, and
`durationMs`. Duration is required and must be an integer from 250 through
5000 inclusive. Out-of-range duration is rejected with
`argument.out-of-range`; the Host must not silently clamp an invalid request
into success.

The Host rechecks the current claim, selection, profile value, binding
availability, activation correlation, request identity, and both generations
before rendering. An accepted result is an acknowledgement that the Host took
ownership of the request. It is not permission for the plugin to mount or
animate anything. Repeating the same `requestId` with identical arguments is
idempotent and must not start a second effect. Reusing it with different
arguments is rejected with `request.conflict`.

The Host presents a decorative, pointer-inert celebration over the active
Host window content area. It owns theme adaptation, compositing, geometry,
contrast, accessibility, reduced-motion behavior, animation, and restoration.
It must not move, resize, hide, or intercept native controls. Reduced-motion
policy may replace non-essential movement with a restrained Host-owned
celebration, but an implementation with no conforming presentation must report
unavailable instead of returning a false success.

At most one celebration request is active in one Host window. A later accepted
request removes the earlier presentation before starting the new one.
`dismissCelebration` removes a currently active request with the same owner and
generation. It cannot dismiss another plugin or generation.

## Ownership, timeout, and rollback

Every presentation and timer belongs to the requesting plugin fiber and module
generation under the existing plugin lifecycle contract. The Host must fence
new calls first and synchronously remove the presentation, scheduled work, and
Host-applied state when any of these occurs:

- `durationMs` elapses or `dismissCelebration` is accepted;
- claim deselection, permission denial, point loss, session/window loss, or
  Host-generation replacement;
- plugin fiber unload, disable, uninstall, restart, or module-generation
  replacement; or
- renderer failure, candidate abort, or last-good rollback.

Candidate requests remain staged and visually inert before atomic generation
publication. A failure before publication produces no live presentation. If a
published candidate fails and rolls back, the candidate presentation is
removed; a retired transient celebration is not replayed. Partial rendering
failure removes every applied presentation fragment before returning or
recording failure.

Late commands from a disposed generation are stale. Cleanup is Host-owned and
does not depend on plugin cleanup code, a DOM observer, or the delivery of a
terminal event to an already disposed fiber.

## Failure and downgrade

The Host or injected runtime must surface one of these stable outcomes rather
than silently no-op or emulate the effect with plugin DOM:

| Condition | Outcome | Reason/diagnostic |
| --- | --- | --- |
| profile or required binding absent | unavailable | `celebration.unavailable` |
| point/submit anchor not currently mounted | unavailable | `point.not-mounted` |
| exact claim is denied | denied | `authorization.denied` |
| binding is projected unavailable | unavailable | the snapshot's required reason |
| stale/replayed activation | rejected | `activation.stale` |
| invalid duration | rejected | `argument.out-of-range` |
| request id reused with different arguments | rejected | `request.conflict` |
| Host renderer cannot start or fully rolls back | unavailable/rejected | `presentation.failed` |

On the wire, command failures use the existing control result
`outcome: rejected` and the stable reason. Product/runtime APIs may project
that result as the typed `denied` or `unavailable` status shown above. A Host
that does not recognize this profile must leave it inactive with an explicit
compatibility diagnostic. It must not drop unknown fields, downgrade the
profile to a generic presenter, or claim success without a Host-owned effect.

## Plugin consumption

1. Discover the exact point, submit anchor, catalog binding shapes, selected
   proxy claim, profile property, and runtime availability. On any miss, report
   `celebration.unavailable` and stop.
2. Subscribe through the fiber-owned control-plane event handle. Do not add a
   native listener or query the Host DOM.
3. For each `submitActivated`, generate `requestId` and invoke
   `presentCelebration` in the same claim and Host generation, normally with a
   short bounded duration such as 2400 ms.
4. Treat only `outcome: accepted` as acknowledgement. Surface denied,
   unavailable, stale, conflict, and renderer-failure diagnostics.
5. Optionally invoke `dismissCelebration`; otherwise rely on the mandatory
   Host timeout and lifecycle cleanup. Plugin disposal never needs DOM cleanup.

## Host consumption and testing

The Host adapter privately observes its native submit semantic action and
emits the Host-authored event only after that action is accepted. The public
boundary begins with the scalar event; native listeners, selectors, nodes, and
event objects never cross it. The Host validates the correlated command, calls
its own celebration renderer, owns the deadline, and registers cleanup with
the exact fiber/module-generation effect scope.

A Host may expose a private test-only marker so an integration recorder can
verify start and cleanup deterministically. That marker is not a CordisX
protocol field, capability, property, event payload, command argument, or
portable plugin dependency. Closed schemas and profile conformance reject a
marker carried on any public wire document.

`test-vectors/extension-point-control/valid/submit-celebration.json` provides
the exact catalog, claim, event, accepted/denied command exchanges, and
Host-private lifecycle harness cases. The focused executable check is
`node conformance/submit-celebration-presentation.mjs`.
