# TypeScript declarations

`manager-content-navigation.v1.d.ts` exposes the two JSON documents in the
Manager Content v1 contract: plugin declarations and Host-generated
renderer-safe projections. It intentionally exports data-only types; no DOM,
callback, bridge, secret, router, or history-control type is available.

`icon-theme.v1.d.ts` exposes the closed semantic key, provider identity,
coverage, normalized vector, selection, resolution, disposal, and rollback
documents. The declarations intentionally expose no React component, DOM,
markup, style, URL, callback, accessibility, or local-path type.

Run `npm run typecheck` to compile the strict positive and negative fixtures.
