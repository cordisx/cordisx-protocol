# Current Host user display profile v1

Experimental read-only capability; [types](../../types/current-user.v1.d.ts)
at `@cordisx/protocol/current-user/v1`, [result schema](../../schemas/current-user-result.v1.schema.json).
Hosts expose `ctx.currentUser` to an active trusted plugin context. Consumers
check availability and retain their ordinary guest/profile fallback on older
Hosts or unavailable providers. This does not create an account or login flow.

## Projection and compatibility

`read()` returns an exact available result with `profile`, or an unavailable
result with only reason signed-out, host-unavailable or generation-retired.
Profile contains only `subject`, optional `displayName` and optional `avatar`.
Subject is 1–128 ASCII alphanumeric/dot/underscore/colon/hyphen characters,
opaque and stable for the same current account within one plugin identity and
Host profile. Different accounts and plugin identities have distinct subjects.
It is not a global provider account ID; clearing the Host profile may change it.
Callers do not parse it or assume portability across devices or Host profiles.

Display name is 1–128 Unicode code points, with no email fallback. Missing name
does not imply signed-out. Avatar is at most 65536 characters, a nonempty
PNG/JPEG/WebP base64 data URL. The Host resolves allowed native assets and
normalizes raster bytes before projection; no remote URLs, SVG, file paths or
identity references cross this interface. Missing/undecodable images use the
consumer's normal fallback. No arbitrary URL or user-supplied fetch operation
is exposed. Older consumers can ignore this independent optional capability.

`subscribe(listener)` asynchronously emits an initial result and subsequent
changes, including sign-out, account switch and display-profile updates. The
Host may poll its source; availability does not promise push notifications or
instant remote updates. Consumer subscriptions return an idempotent disposer.
The Host discards source reads spanning an account switch and clears stale
profile data on unavailability. Reads/listeners are fenced by plugin ownership
and generation; disposed services return generation-retired and do not notify.
Individual listener failures do not disrupt other consumers. Public results
are independent clones, never references to provider state.

## Security analysis and usage

This introduces a bounded current-user display projection for trusted plugins,
not a credential API, identity permission, login mechanism or authority grant.
Host-private native/client account IDs can be used to derive an opaque,
plugin-scoped local subject but are never exported. The Host must project
explicit fields rather than spreading account/native payloads. Access/refresh
tokens, raw account/user IDs, email, subscription/plan, usage, private provider
state and native bridges are excluded from types, schema and runtime results.
Unsupported native adapters fail closed instead of scraping DOM or credentials.

Consumers may use these display fields, with user authorization, to initialize
or update their existing product profile and header avatar. A copied subject or
display name is not proof of a server-verified provider identity. Product server
credentials and account association remain the product's existing mechanism;
the capability never authenticates a user to that server or transfers native
credentials. An account switch must isolate per-account local associations;
guest/current-room compatibility remains product-owned. Reuse the existing
page v4 header action `visual: { kind: 'avatar', src }` and retain its menu
command. The Host owns the outer action/focus/hover; the image remains circular.
