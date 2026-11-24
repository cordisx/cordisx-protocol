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
When a route can select from multiple upstreams, a provider MUST declare efforts only
when it can determine the exact supported efforts for every eligible upstream,
and then only their intersection. It MUST NOT infer a default from an ordered
list or from a generic provider default. An unavailable, ambiguous, malformed,
or empty intersection is treated as unknown and MUST be omitted. These declarations
come from discovery and do not constitute evidence that each upstream has been
independently tested.

## Managed native provider context windows

`ManagedNativeProviderRouteV1.contextWindow` optionally declares the number of
tokens in the route's discovered context window. It MUST be a positive safe
integer, at most `9007199254740991`. Omission means unknown, never 128000 or
any other implicit limit. An invalid or ambiguous discovery value MUST NOT be
published as known. When a route can select from multiple eligible upstreams under
the same credential scope, the provider MAY publish their minimum only when
every candidate has a valid known window; otherwise it MUST omit the value.
This limit is a source declaration, not a guarantee that the upstream has been
tested. Hosts MUST preserve the unknown state and MUST NOT present a fallback
as a discovered or verified route limit. A Host unable to express unknown to
its native catalog MUST expose that limitation instead of assigning a guessed
limit as if it were known.

The optional registration handle property
`nativeProviderCapabilities.contextWindow` serves as the Host's positive capability
signal. It is available on both the result of `managedServices.register()` and
the registration passed to progressive startup preparation. A provider MUST
send `contextWindow` only if that property is exactly `true`; absence means the
Host might reject the closed catalog route shape. When unavailable, the provider
may publish a legacy route without the field, but the route's window remains
unknown to the Host. Neither the signal nor the metadata grants any new
endpoint, authentication or execution authority.

Catalog digests are SHA-256 over UTF-8 JSON without whitespace of
`[generation, defaultAlias, canonicalRoutes]`. Routes sort by UTF-8 byte order
of JSON `[alias, gatewayModelId]`. Each canonical route is
`[alias, gatewayModelId]` when both metadata fields are omitted, preserving the
existing digest. With reasoning metadata but no window it is
`[alias, gatewayModelId, reasoningCapabilities]`; with a window it is
`[alias, gatewayModelId, reasoningCapabilitiesOrNull, contextWindow]`, where
`null` is used only as a tuple placeholder when reasoning metadata is absent.
The reasoning object writes `efforts` first and optional `defaultEffort` second.
Changing either metadata field therefore changes the catalog digest.
[Digest vectors](../../../test-vectors/managed-native-provider-catalog.v1.json)
cover the legacy and metadata forms.

This additive field retains existing catalogs. Older Hosts may reject routes
containing the new field; consumers requiring reasoning choices MUST use an
implementing Host. A compatibility fallback may publish an unchanged legacy
route with metadata omitted, but MUST keep the choices unknown instead of
claiming the new capability survived. Publication and native interoperability
remain separate from Protocol conformance.

## Managed native provider credential scope

A provider MAY add `credentialScope` to a publication only when
`nativeProviderCapabilities.credentialScopeLease` is exactly `true`. An absent
signal means that the provider MUST omit it. An absent scope means that the Host
has no evidence to resume the publication's conversations across a service
restart. Older publication shapes and behavior remain unchanged.

The [scope](../../../schemas/managed-native-provider-credential-scope.v1.schema.json)
is a non-secret, random 256-bit base64url revision prefixed `scope_`, and the
`path-v1` request-binding scheme. It covers every route, credential, account,
gateway instance and routing permission in the publication. The provider may
use one snapshot for multiple accounts, but MUST rotate the entire revision
when any covered binding changes. The provider MUST verify the active bindings
before publishing and MUST revoke the previous scope before switching credentials,
permissions or route mappings. A revision MUST NOT be reused, including after
an A-to-B-to-A change. If continuity cannot be verified, it MUST be omitted.
The value is not an authorization credential or an independently verified
account identity and MUST NOT contain account names, keys or other private data.

For `path-v1` the Host appends `/.cordisx-scope/<revision>` to the declared
composition origin path; the plugin cannot supply another URL or path. Existing
gateway authentication still applies. Before forwarding each model request,
the gateway MUST verify that its revision is still active and that the model
resolves within that exact immutable scope. It MUST reject a stale or unknown
revision without forwarding. In-flight requests retain their admitted scope.
The Host MUST bind the scope to its verified profile, plugin source, service,
provider and catalog; it MUST preserve generation fences for live connections.
It may resume a conversation after restart only when the new active scope and
the stored route and catalog evidence agree. A missing or uncertain binding
MUST fail closed; old records without such evidence cannot be silently upgraded.

This is a cooperative contract with the admitted plugin and gateway, not a
proof against malicious trusted code. Declaration does not grant additional
credential access or authorize model, account or history sharing.

## Opted-in progressive startup

[Startup v1](../startup/README.md) adds manifest v15 provider ownership, an awaited
base-apply/per-capability-prepare boundary, Node catalog/milestone reports and a
pre-binding observer. It reuses these backend definitions and publication wire;
legacy modules keep their original blocking apply behavior.

## Optional management webpage entry

[Web entry v1](web-entry-v1.md) adds a separate Node declaration and renderer
capability for current owned loopback management origins, including proof for
a separate listener. Reading it does not start, authenticate or navigate a service.

[Authenticated console v1](authenticated-console-v1.md) separately adds an
owner-bound isolated browser mount for a verified existing management session.
[Browser ticket v1](browser-console-v1.md) adds a separate, optional single-use
navigation entry for Hosts with a proved browser request boundary.
