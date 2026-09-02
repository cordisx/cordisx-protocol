# TypeScript declarations

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

`agent-avatar.v1.d.ts` exposes the closed immutable Agent avatar reference
union, canonical seed inputs and helpers, Agent Definition fallback input, and
typed resolution result. Qualified refs expose no URL, path, bytes, DOM, CSS,
callback, or Host rendering handle.

`agent-conversation-shell.v1.d.ts` remains the frozen original data source,
ordered runtime subscription handle, disposal lifetime, participant list,
text-message/status timeline, and Host command-context contract.

`agent-conversation-shell.v2.d.ts` is its explicit successor. It adds exact
Agent participant identity, bounded room-snapshot active-run descriptors with
Host-owned detail references, closed Session-backed message provenance,
structured reaction lifecycles, and ordered member-presence items. Active runs
carry no private runtime binding, task body, trace, route, URL, or renderer
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
items carry exact participant/member/session/turn/approval association and bounded
pending Host command actions; the dedicated approval command context preserves
the shell binding, owner generation, shell generation, and item fence.

`host-dom.v1.d.ts` exposes the versioned Host root catalog and one principal-bound
client. Plugins can request only canonical root ids, closed read/modify operations,
opaque handles, bounded serialized projections, and Host-rendered structured
children. It exports no selector, DOM node, document/window, HTML, CSS, script,
event, callback, owner/profile binding, or private renderer bridge.

`sessions.v1.d.ts` exposes `SessionRegistry`, one permission-filtered read-only
`Session` handle, fixed `SessionSnapshot` watermarks, snapshot-pinned pages,
and an atomic replay-to-live subscription. `SessionEvent` is the only durable
Agent runtime fact stream. Its core turn, step, user, assistant chunk/message,
tool, request, inbox, approval, and seed variants are merge-extensible; unknown
required variants fail closed. Handles are generation-fenced and cannot be
serialized or reconstructed.

`agents.v1.d.ts` exposes the plugin-facing `AgentRegistry` and live `Agent`.
Create/resume return an owner- and plugin-generation-bound `AgentHandle`; get
returns only a permission-filtered bare Agent. The same `Session` handle is
available as `Agent.session`. Message admission and pending-message discard use
the supplied `MessageId` as their only public idempotency identity. Agent live
events are non-durable projections and whole-Agent idle reports unavailable
when the runtime authority cannot observe it. Agent definitions and setup remain
business-neutral; navigation uses a Host-owned reference, never a URL.

`approval.v1.d.ts` exposes a separate Agent-scoped approval service. Exact
question and decision identities are mirrored as `approval/asked` and
`approval/decided` in the same Session log. Permission requests, user input,
and elicitation are not approval variants.
