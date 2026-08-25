# TypeScript declarations

`manager-content-navigation.v1.d.ts` exposes the two JSON documents in the
Manager Content v1 contract: plugin declarations and Host-generated
renderer-safe projections. It intentionally exports data-only types; no DOM,
callback, bridge, secret, router, or history-control type is available.

Run `npm run typecheck` to compile the strict positive fixture.
