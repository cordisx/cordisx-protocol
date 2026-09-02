# TypeScript declarations

`manager-content-navigation.v2.d.ts` is the additive declaration successor for
an explicit localized tab label that may differ from the target route title.
An absent label retains v1 route-title derivation. It adds no description,
redirect, default child, DOM, renderer, or route-selection control.

`navigation-collection-actions.v1.d.ts` exposes the closed immutable action
list embedded by a Host's versioned successor to a route-only dynamic
navigation collection row. It distinguishes same-owner commands, copying the
enclosing validated route, and copying one bounded plain-text value; it also
defines direct/overflow placement, neutral/danger tone, pressed/disabled
state, Host-owned confirmation, and localized success/failure feedback. It
exposes no DOM, callback, clipboard handle, confirmation implementation,
renderer placement, or arbitrary URL field.

`manager-collection.v1.d.ts` exposes the generic Manager collection
registration, Host-owned query, source snapshot/lifecycle, structured row,
text-input command action, and closed action-result policy. It composes
`navigation-collection-actions/v1` and exposes no DOM, component, list, drawer,
input, dialog, confirmation, feedback, clipboard, or renderer handle.

`manager-content-navigation.v1.d.ts` exposes the two JSON documents in the
Manager Content v1 contract: plugin declarations and Host-generated
renderer-safe projections. It intentionally exports data-only types; no DOM,
callback, bridge, secret, router, or history-control type is available.

`icon-theme.v1.d.ts` exposes the closed semantic key, provider identity,
exact tuple coverage and proof, normalized vector, profile-pinned selection,
resolution, disposal, and rollback documents. The declarations intentionally expose no React component, DOM,
markup, style, URL, callback, accessibility, or local-path type.
The 64-key union keeps trust provenance and Manager action/content/turn-control
semantics distinct; no key carries accessible text or raw publisher/source
identity. `action.favorite` uses the existing `selected` state for its active
form.

`connector-service.v1.d.ts` exposes the versioned Connector descriptor,
registration identity, command/event unions, and the public client caller,
request, authorization, and typed execute-result unions. Host-only caller
issuance types are separate from `BoundConnectorClient`: the plugin-visible
surface has only discover/execute/subscribe/dispose, with an ordered async page
stream plus unsubscribe lifetime. Handles stay `string` because their values
are opaque; the declarations expose no transport, DOM, callback, bridge,
credential, platform, or task type.

Run `npm run typecheck` to compile the strict positive and negative fixtures.

`agents.v1.d.ts`, `sessions.v1.d.ts`, and `approval.v1.d.ts` expose the
additive `ctx.agents`, `ctx.sessions`, and `ctx.approvals` contracts. Agent is a
live handle whose `AgentId` is the same `SessionId`; Session is read-only and
SessionEvent is the new surface's sole persistent fact. Snapshot-pinned paging,
atomic replay-to-live subscription, `closed` first-terminal fencing, and
Agent-scoped approvals are explicit. The declarations coexist with and do not
remove the frozen AgentLoop v1-v4 entrypoints.

`agent-avatar.v1.d.ts` exposes the closed immutable Agent avatar reference
union, canonical seed inputs and helpers, Agent Definition fallback input, and
typed resolution result. Qualified refs expose no URL, path, bytes, DOM, CSS,
callback, or Host rendering handle.

`agent-conversation-shell.v1.d.ts` remains the frozen original data source,
ordered runtime subscription handle, disposal lifetime, participant list,
text-message/status timeline, and Host command-context contract.

`agent-conversation-shell.v2.d.ts` is its explicit successor. It adds exact
Agent participant identity, bounded room-snapshot active-run descriptors with
AgentLoop-v2-canonical structured details URLs, closed message provenance,
structured reaction lifecycles, and ordered member-presence items. Active runs
carry no private binding, task body, trace, route, arbitrary URL, or renderer
handle; presence retries remain bounded Host command references.

`agent-conversation-shell.v3.d.ts` preserves the complete v2 surface and adds
an optional Room description presentation plus a structured Room-settings CAS
mutation. Description omission means the source offers no description
capability, while explicit `empty` lets the Host render an add-introduction
entry. The mutation carries exact binding, owner-generation, shell-generation,
Room, and snapshot-sequence fences and returns closed applied, conflict, or
unavailable results. It exposes only bounded plain user text; persistence,
participant ordering, the settings form, and all visual behavior remain with
their existing Chatroom and Host owners. V3 also exports the bounded
`AgentConversationRoomCollectionLeadingVisual` embedded value for Host-owned
generic collection rows: either a semantic Host icon or an exact Room-associated
ordered composite of formal participant avatar references. It does not own the
row, collection snapshot, route, current selection, or renderer. V3 approval
items carry exact participant/run/binding/turn/approval association and bounded
pending Host command actions; the dedicated approval command context preserves
the shell binding, owner generation, shell generation, and item fence.

`agent-conversation-shell.v4.d.ts` is the additive Session-compatible
successor. It retains v3 Room/settings/collection and Shell-owned run
associations, adds exact `sessionId` plus optional `AgentDetailReference` to
active runs, uses structured SessionEvent message provenance, correlates
approvals by Session/generation/approval id, and correlates introductions by
Session/message id. Its subscription handle exposes a non-rejecting closed
fence. It contains no AgentLoop binding, turn, details URL, raw navigation, or
renderer authority; v3 remains independently importable.

`host-dom.v1.d.ts` exposes the versioned Host root catalog and one principal-bound
client. Plugins can request only canonical root ids, closed read/modify operations,
opaque handles, bounded serialized projections, and Host-rendered structured
children. It exports no selector, DOM node, document/window, HTML, CSS, script,
event, callback, owner/profile binding, or private renderer bridge.

`agent-loop.v1.d.ts` preserves the formal room-neutral, per-client-idempotency
contract without task-details or durable cross-client fields.
`agent-loop.v2.d.ts` additively exposes the same Agent definition catalog,
opaque task binding, typed create-or-bind/send exchanges, proactive events,
ordered subscription pages, and fiber-owned `BoundAgentLoopClient`. Durable
consumer operation ids survive
client disposal through an owner-provider, generation-fenced ledger; accepted
results report executed, replayed, or reconciled delivery. Every accepted
create-or-bind result carries a canonical Host or external details URL next to
the exact binding; accepted sends carry stable message and turn identities and
do not repeat the URL. Explicit `AgentLoopCreateOrBindResult` and
`AgentLoopSendResult` aliases retain accepted, denied, and unavailable branches
under TypeScript discrimination. It exposes no Room, UI implementation,
credential, callback, raw bridge, public provider identity, or external-channel
type.

`agent-loop.v3.d.ts` preserves the complete v2 surface and adds one durable
`approval-decision` command plus `BoundAgentLoopClient.decideApproval`. The
command is fenced by the full v3 task binding generation, turn, and approval
identity and uses the existing owner-provider durable operation ledger.
Accepted results echo that identity and decision; conflicts distinguish
operation-id reuse, stale binding, and approval state, while typed unavailable
results distinguish reconciliation, expiry, provider replacement, and approval
availability. Decision-resolved approval events require operation causation.
V3 also exposes durable request/cancel member-self-introduction intents under
`turns.introduce`. They carry only exact binding/member/run identity and a
closed intent or original request operation id; accepted results and events
share stable turn/message identity and operation causation. No consumer time,
prompt, body, model, canned response, callback, or abort signal is exposed.

`agent-loop.v4.d.ts` is the minimal immutable successor to v3. Accepted
approval and request/cancel member-self-introduction results require
`AgentLoopOperationCausation`; its `operationId` is the accepted operation's
own `commandId`. For cancellation it is the cancel command id, while
`requestOperationId` continues to identify the original request. V4 approval
commands/results use terminal-state `approved`, `denied`, and `cancelled`
tokens, and allowed-authorization unavailability adds `binding-closed` for an
approval or member-self-introduction operation whose authoritative exact
binding is closed. Any other task, definition, state, binding-id, or generation
drift is `binding-conflict` and fails before a side effect. Non-accepted results
and accepted create/bind/send results expose no result causation. Every other
v3 command, event, binding, lifecycle, authorization, retry, cancellation, and
ledger field is preserved.
