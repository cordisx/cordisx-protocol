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

## Managed native provider reasoning capabilities

`ManagedNativeProviderRouteV1.reasoningCapabilities` optionally carries the
exact route's discovered effort choices and optional default. The serialized
catalog shape is [managed-native-provider-catalog.v1](../../../schemas/managed-native-provider-catalog.v1.schema.json).
Missing, empty, or malformed discovery metadata means unknown; providers MUST
NOT infer choices from a model name, another provider, or support for reasoning
output alone. An explicit single effort describes a fixed choice.

`efforts` MUST contain distinct values ordered as `none`, `minimal`, `low`,
`medium`, `high`, `xhigh`, `max`, `ultra`; the optional default MUST be a member.
Hosts MUST validate the capability before publication and retain it with the
route through safe model-catalog projection. This display metadata grants no
endpoint, credential, authentication, process, or request authority.

Catalog digests are SHA-256 over UTF-8 JSON without whitespace of
`[generation, defaultAlias, canonicalRoutes]`. Routes sort by UTF-8 byte order
of JSON `[alias, gatewayModelId]`. Each canonical route is
`[alias, gatewayModelId]` when capability metadata is omitted, preserving the
existing digest, or `[alias, gatewayModelId, reasoningCapabilities]` otherwise.
The capability object writes `efforts` first and optional `defaultEffort` second.
Changing capability metadata therefore changes the catalog digest.
[Digest vectors](../../../test-vectors/managed-native-provider-catalog.v1.json)
cover both forms.

This additive field retains existing catalogs. Older Hosts may reject routes
containing the new field; consumers requiring reasoning choices MUST use an
implementing Host. A compatibility fallback may publish an unchanged legacy
route with metadata omitted, but MUST keep the choices unknown instead of
claiming the new capability survived. Publication and native interoperability
remain separate from Protocol conformance.
