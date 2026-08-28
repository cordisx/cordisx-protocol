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

`agent-conversation-shell.v1.d.ts` exposes only the data source, ordered runtime
subscription handle, and disposal lifetime for the Host-owned conversation shell.
