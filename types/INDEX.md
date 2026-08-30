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
AgentLoop-v2-canonical structured details URLs, closed message provenance,
structured reaction lifecycles, and ordered member-presence items. Active runs
carry no private binding, task body, trace, route, arbitrary URL, or renderer
handle; presence retries remain bounded Host command references.

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
