# Product-page Agent admission v1

`agent-page-admission/v1` is the additive admission family for a product-owned
React page. It does not reissue, reinterpret, or extend Agent Conversation
Shell v1–v9 or admission v1–v6.

## Scope

The Host creates one `AgentPageComposerOrigin` for one authenticated
`page-composer-submit` command execution. The origin binds the same owner,
plugin generation, connection, page binding, current page route, command, and
execution. It deliberately names no Room delivery or Agent. A product page
receives that origin only in the matching Host-injected
`AgentPageComposerCommandContext`; it cannot mint, alter, retain, or reuse it.

The Host page-command adapter is the only injection boundary. It is a required
new Host public seam, not an existing generic `ctx.commands.execute` capability.
The Host successor exposes the public context type through its public page prop
and `cordisx/contracts` adapter exactly while it invokes the matching generic
command handler. Its mounted page prop is an
`AgentPageComposerCommandAdapter`: the page calls
`execute({ command, submitPayload })`, and the Host creates the exact origin
then supplies `AgentPageComposerCommandContext` as the generic handler's Host
context. Protocol does not introduce a second command registry, page callback,
or plugin service. A command invoked without that Host context is honestly
unavailable for page admission.

`page.outlet` and `page.routeDefinitionId` are Host-validated mount metadata.
`routeDefinitionId` is the local declared route id, not a qualified runtime page
id. `page.roomId` is present only when the Host has validated the exact mounted
`roomId` route parameter; a plugin may not derive it from a page label, route
name, or local correlation value.

The product page may first persist its own Room intent, then declare each exact
`{ roomId, participantId, memberId, runId }` target. The Host validates every
target against the still-live origin, issues one opaque capability per target,
requires the exact acquired `AgentHandle`, and captures the exact message before
the reservation's one-shot `submit()` invokes the driver. A denied target has
no ordinary `Agent.send`, `Session.sendToRoom`, or retry fallback.

One command may declare N=1, N=2, or N=3 (or another Host-bounded number) of
targets only for one Room. Each target has a distinct opaque capability; a
cross-target, cross-Room, stale, duplicate, revoked, completed, replaced, or
forged capability fails closed. These capabilities never create a second
SessionEvent or approval ledger.

## Existing Room: same page binding

For an existing Room whose page binding remains active through submission, use
`AgentPageAdmissionTargetService` followed by
`AgentPageAdmissionReservationService`. The Host retains the clone-safe receipt
only for that same page binding. Page, route, plugin-generation, connection,
or command replacement closes the capture; it never turns into a route transfer.

## Fresh Room: exact route continuation

For a fresh Room, the product persists the exact Room and targets while the
originating new-room page binding is live. It then uses
`AgentPageAdmissionRouteDeclarationService` and its exact Room destination
route, reserves every target, and awaits accepted `submit()` before navigating.
The Host captures the exact `{ sessionId, messageId }` only on accepted submit
and retains a pending continuation, not the old binding and not a copy.

When the declared same-owner Room page binding activates, the Host alone calls
`AgentPageAdmissionRouteClaimService.claim` with Host-generated binding and
source values. It must do so atomically before navigation resolves or deferred
scenario work begins. A successful claim moves the capture once to that exact
new binding. Claim before accepted submit, a foreign/changed route, target or
source mismatch, reuse, command completion, page replacement, owner/plugin
generation replacement, connection replacement, or disposal purges the pending
continuation and fails closed. The Host must never keep the old page binding
alive or perform a generic post-navigation Room/Session lookup.

## Boundaries

This contract authorizes ordinary same-owner page delivery only. It does not
recover an expired pending approval, transfer approval authority, grant
cross-owner access, infer a Room target, expose a driver, or carry DOM,
framework, callback, raw path, or private Host state. The public TypeScript
entrypoint is `@cordisx/protocol/agent-page-admission/v1`; Host availability is
separate and must be honestly unavailable until the matching Host runtime is
installed.
