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

## V2 completion round trip

V1 reports only page-command dispatch availability. V2 preserves every V1 byte
and adds the completion contract required by a page that must retain its draft
until all exact reservations have actually submitted.

The V2 `AgentPageComposerCommandAdapter.execute` awaits the existing generic
handler. The Host, never the plugin, derives the completion from its retained
reservation receipts. An `accepted/submitted` result contains one Room id,
either `existing-room` or `fresh-room` disposition, and a non-empty list of
exact `{ target, sessionId, messageId }` admissions. The page clears its draft
only for that result. Every returned target has the completion's exact Room id;
Host rejects a mismatched or partial success as `failed` rather than fabricating
an accepted completion.

Handler failure, an incomplete target set, navigation failure, or claim failure
returns `failed` with the Host-derived accepted and denied delivery outcomes.
The page retains its draft. Already accepted messages remain durable facts; the
Host never rolls them back, reissues a request, or retries automatically.

For a fresh page command the V2 Host context contains an opaque fresh-Room
navigation permit. After every declared target has accepted `submit()`, the
handler calls the Host-owned fresh navigation service with its declared route.
The Host performs navigation and every exact destination binding claim before
that service resolves. The generic handler then settles, and only after that
does the page adapter return its final completion. A page replacement before
submission, any nonaccepted target, navigation abort, or claim failure denies
or fails the completion and revokes the continuation. This sequencing prevents
the command-complete-before-claim failure class without retaining or copying
the old binding.
