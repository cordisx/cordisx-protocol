# Managed Service V1

Status: normative additive v1 contract. Public renderer import:
`@cordisx/protocol/managed-service-ui/v1`. Host runtime declarations use
`@cordisx/protocol/managed-service-runtime/v1`.

Managed-service handles expose owner-bound, renderer-safe projections and
explicit authentication controls without exposing credentials, raw process
handles, unrestricted endpoints, or the Host registrar.

## Explicit logout

`ManagedServiceV1.logout(request)` is the preferred logout entrypoint. Its
request is `cordisx.managed-service-logout-request/v1`, carries the exact
`ManagedServiceV1.binding`, fences the projection with `expectedSequence`, and
has the literal action `logout`.

The Host MUST accept logout only for a fresh `explicit-click` gesture produced
by the invoking owner page. A timestamp alone does not prove a gesture. Startup,
reload, background effects, scheduled work, automatic retries, and synthetic
events MUST NOT initiate logout. The Host MUST reject a stale sequence, stale
generation, replaced binding, or cross-owner binding without invoking the
managed service.

An accepted `cordisx.managed-service-logout-result/v1` reports
`stateAt: "logged-out"` and the resulting projection sequence. Denied, failed,
and unavailable results return a bounded managed-service error and do not claim
a state transition.

For CLI authentication definitions, `authentication.logout` is optional. A
successful CLI logout exit maps to the existing backend outcome
`authentication-required`; the renderer-facing accepted result maps that
completed transition to `logged-out`. When no logout action is declared, the
Host reports `capabilities.logout: false` and returns an unavailable logout
result without attempting login, refresh, process restart, or credential
mutation.

## Compatibility

Existing login consumers and documents remain valid. The existing
`authenticate(ManagedServiceLoginRequestV1)` surface, literal `action: "login"`,
and its accepted v1 wire shape remain unchanged. New consumers use the distinct
logout request, result, and method so login and logout cannot be confused by
names or result semantics.

Older definitions that omit `authentication.logout` remain valid. The runtime
registration control continues to accept `login`, `logout`, and `refresh`; this
Protocol contract does not establish Host adoption or authorize a renderer to
call the Node-side registration handle.
