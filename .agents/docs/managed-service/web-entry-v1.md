# Managed-service web entry v1

Status: experimental normative additive contract. Renderer types are exported by
`@cordisx/protocol/managed-service-web-entry/v1`; Node declarations by
`@cordisx/protocol/managed-service-web-entry-runtime/v1`. Host adoption, package
publication and native navigation evidence are separate from conformance.

## Declaration and capability discovery

An admitted managed-backend Node module may export optional
`managedServiceWebEntry: ManagedServiceWebEntrySourceV1`. The declaration has
literal contract `cordisx.managed-service-web-entry-source/v1`, its own local
`serviceId`, an `operationId` and optional secondary-origin verification. The
Host binds it to that module's already validated package/source, plugin,
registration and generations. A different service id, duplicate source, unknown
operation, unsupported declaration or caller-supplied source fails admission.
This declaration does not create another service or grant another plugin access.
It works with both existing base modules and progressive startup modules by
intersecting the optional extension with their existing module type.

The operation MUST already exist in the current registered definition, use GET,
accept no renderer payload, use `requestEncoding: "query"`, and declare response schema
`managed-service-web-entry-source-result.v1.schema.json`. An optional requestSchema
must name `managed-service-web-entry-challenge.v1.schema.json`; validate the
Host-generated `{challenge}` against it when present. The query is always exactly
that challenge object, with no request body. Its effective HTTP
authentication MUST be the existing configured authorization-header mechanism;
it MUST NOT opt out to `none`. Only the dedicated web-entry broker uses this
response schema to interpret origin/proof values. Generic invoke's safe-value
filter and grants remain unchanged. Discovering this capability does not grant
a generic renderer operation or disclose its path, credential or registration.

Renderers use the existing `managedServices` owner-bound get path, typed with
`ManagedServiceWebEntryUIContextV1` / `ManagedServiceWebEntryUIRegistryV1`. A
returned `ManagedServiceWithWebEntryV1` may expose `webEntry` with exact contract
`cordisx.managed-service-web-entry/v1`. Its only method is `read({signal?})`.
It accepts no URL, owner, profile, service id, challenge or operation argument.
Consumers check for the property and exact contract; absence means unsupported,
not an invitation to guess a port or use a previous address. Existing service
methods and DI injection name are unchanged; no frozen Context augmentation or
managed-service wire document is expanded.

## Current binding and read lifecycle

A handle exposes readonly `binding` and `serviceGeneration` captured at get time.
The web-entry binding is independently issued by the Host for this capability's
current service generation. It has the same owner, `identity` and `scope` as the
parent service, but its opaque `bindingId` differs from the parent's stable
`service.binding.bindingId`. The Host issues a fresh unpredictable binding id
when the service generation changes and invalidates the old issued pair. It
MUST validate the exact issued `(binding, serviceGeneration)` pair and its caller
ownership, rather than accepting any currently correct generation string with
an otherwise stable service binding. An old web-entry binding combined with a
new generation, or the parent binding supplied to the dedicated read RPC, is
rejected. A fresh registry get obtains the replacement pair; changing captured
values never retargets an old handle. The web-entry binding is an opaque UI
reference, not a raw broker credential, process/registration handle or general
service authority. Parent service methods, binding and subscriptions preserve
their existing contracts.
The browser bridge builds `ManagedServiceWebEntryReadRequestV1` with literal
contract `cordisx.managed-service-web-entry-read/v1` and exactly these captured
values. The Host validates the closed request plus the caller's existing owner
scope; supplying another generation or editing binding data cannot retarget it.
Neither the facade nor the transport may replace captured generation with a newer
one when issuing read. Every result repeats that captured binding/generation. Each read
revalidates owner, active profile, source identity, binding id, Host/plugin/service
generation, current source registration, process/endpoint ownership and service
availability before dispatch and after every awaited operation. The source and
registered endpoint used for one read cannot be replaced mid-read. The backend
must already be running and usable for the read; stopped, failed, disposed,
missing, stale or replaced services yield unavailable. Authentication-required
user state alone does not deny a useful login webpage if the existing backend
and dedicated broker authentication are already usable.

The read MUST NOT acquire demand that starts a service, run ensureReady,
authenticate, refresh credentials, restart, mutate configuration, navigate or
create a window. It may use only the existing running authenticated broker.
Abort/dispose cancels the read and any owned request; late completions cannot
return an origin. One caller's cancellation does not cancel another caller or
stop a process. Apply the declared bounded operation timeout as one deadline across the whole
read, including both HTTP exchanges and body parsing. Limit each response body
to 64 KiB, rejecting an oversized stream before unbounded buffering.
Return unavailable for unsupported, owner-unavailable, service-unavailable,
stale-generation, binding-replaced, disposed, cancelled, timeout, invalid-source
or ownership-unverified as applicable; do not forward raw errors or responses.
Unavailable has no origin. Its binding/generation identify the captured handle,
never a secretly substituted replacement. Replacement requires a fresh get.

Do not reuse a previously verified origin as current read evidence. A successful
result states ownership at the final fence, not a durable guarantee that an
address will remain assigned. Consumers clear stale iframe/open-action targets
on service lifecycle invalidation and re-read before a later explicit open;
existing subscriptions/lifecycle notifications may trigger such reads. Read
itself never performs navigation or sets a URL in the UI.

## Canonical origin and primary endpoint proof

An origin is exactly its canonical URL origin string, with scheme `http` or
`https`, literal host `127.0.0.1` or `[::1]`, and an effective port in 1..65535.
No trailing slash, path, userinfo, query, fragment, backslash, percent encoding,
hostname/DNS resolution, shorthand/alternate numeric IP or default-port spelling
that differs from URL canonical origin is accepted. HTTPS keeps normal
certificate validation. The shape schema is supplemented by semantic URL/port
checks; a schema match alone is not ownership evidence.

The Host sends a fresh cryptographically random 32-byte challenge, encoded as
64 lowercase hexadecimal characters, to the declared current backend operation
as its only `challenge` query parameter, using the current broker authorization.
The source returns the closed source-result document with either unavailable,
or available origin and optional verification. The source is the Node service
endpoint selected by the package declaration; the renderer cannot select it.

If the sanitized origin is exactly the Host's current owned registered backend
origin, existing endpoint ownership plus before/after fences suffices. Loopback
syntax by itself never suffices, even for another service of the same plugin.
Both HTTP fetches MUST use redirect rejection and credentials omission (equivalent
to `redirect: "error"`, `credentials: "omit"`); only the source request explicitly
carries its existing broker Authorization header. The Host MUST NOT dispatch ordinary authenticated
requests to an origin supplied by the renderer or by an unverified source.

## Secondary listener proof

A separate webpage listener requires declared verification
`{kind:"shared-instance-hmac-sha256",path:"/declared/proof"}`. The path is a fixed
absolute sequence of alphanumeric, underscore or hyphen segments, with no query,
fragment, traversal, encoding or authority. It is chosen by the admitted Node
module, never by a source response or renderer.

Both service endpoints must share a private, unpredictable instance secret of
at least 256 bits, scoped to the current service instance/generation. It must
not appear in the public webpage, source/proof response, logs, renderer or Host
result. An implementation can keep it in the same owned process. This contract
does not add a credential store, ask the user for credentials or send that secret
to the Host. Replacing the instance replaces its secret and instance id.

The authenticated backend response includes `verification: {instance, proof}`.
`proof` is lowercase hex HMAC-SHA256 with that private instance secret over the
UTF-8 compact JSON serialization of:

`["cordisx.managed-service-web-entry-proof/v1", challenge, canonicalOrigin, instance]`

The Host retains this proof privately, validates the origin, then performs one
bounded GET of `origin + declared verification.path` with only its challenge
query parameter. This request carries NO broker authorization, cookies,
credentials, expected proof or expected instance id, does not follow redirects,
and does not load scripts or webpage content. The secondary listener computes
its proof using its actual configured listening origin and its own instance id,
never an origin/id or forwarded Host header supplied by the request. It returns
the closed proof document `{contract, instance, proof}`.

The Host compares the two instance ids and proof bytes (constant-time for proof),
then revalidates all current-generation fences. Matching public UUIDs, PID,
static strings, a plugin assertion or an endpoint's generic success response are
insufficient. A different listener cannot produce the per-read same-secret proof
for its own origin. Do not forward the source proof to help it pass. If the
backend cannot establish this pairing or the Host cannot validate it, return
ownership-unverified without exposing the candidate origin. Each read uses its
own one-use challenge; replay from another read, binding or generation fails.

These tightly bounded probes are Node/Host-only ownership verification and
require a declared source plus a successful authenticated backend response.
They do not grant an arbitrary loopback fetch API. A malicious admitted backend
is still subject to the existing plugin trust boundary; this protocol does not
claim to sandbox an authorized Node plugin's own code.

## Safe result and compatibility

`ManagedServiceWebEntryResultV1` exposes only its versioned contract, generation-specific
UI binding, explicit serviceGeneration, status and canonical origin OR a bounded
unavailable code. It carries no instance id, PID, proof/challenge, credential,
filesystem path, runtime/registration handle or arbitrary diagnostic. It grants
no filesystem, account, execution, login or navigation authority.

The source declaration, Host challenge, source-result, secondary proof, read
request and renderer result have independent v1 schemas. The read request is
captured by the handle rather than accepted as public read method arguments. Frozen definitions, managed service v1 methods, startup
v1 and manifest/package v15 remain unchanged. A package may advertise this
optional versioned extension to a supporting Host; an older Host ignores the
unknown optional module export and has no renderer webEntry capability. A
consumer requiring automatic webpage discovery must declare compatibility with
an implementing Host or show unavailable. Downgrade MUST NOT guess fixed/default
ports, tunnel URLs through catalogs/diagnostics/generic invoke, expose Node
proof data or silently use an older address.
