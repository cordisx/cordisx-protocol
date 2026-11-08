# Managed-service browser ticket v1

Status: experimental additive contract. The renderer uses
`@cordisx/protocol/managed-service-console/v1`. The admitted Node declaration and
private exchange types use `@cordisx/protocol/managed-service-console-runtime/v1`.
The native `mount` contract and read-only web entry keep their existing behavior.

An admitted Node module may export `managedServiceBrowserConsole` for its own
service when it also declares web entry v1. The source declares a fixed
same-service operation and a fixed absolute-path reference for redemption.
The operation must be POST JSON, have the exact browser ticket request and
result schemas, use the effective broker-header authentication, and have a
bounded timeout. The path must be a non-root path of simple segments without
queries, fragments, network-path references, dot segments, or escapes. A Host
must reserve this operation against generic invocation, including when a
generic consumer grant would otherwise permit it.

## Issue and redeem

The optional owner-bound `authenticatedConsole.readBrowserEntry({ signal })`
is for an explicit load of the owning plugin's active Manager page. It takes
no account selector, destination, or operation. The Host binds the plugin and
generation, page lifetime, profile, service binding and generation, and proved
backend origin. It requires a live, Host-owned service and a supported browser
request boundary before requesting a ticket. It rechecks those bindings,
including cancellation, before issuing and after each awaited phase. Stale,
cancelled, unsupported, or unavailable calls return a typed unavailable result
without a cached URL. A browser-only capability still exposes `mount`, which
may return `unsupported`.

The Host privately sends only the proved backend origin and a fresh random
256-bit exchange binding. The backend origin is the identity used for the
service's existing management authorization. The service accepts only an
eligible existing management session and returns `sign-in-required` when
that authorization is absent, ambiguous, expired, or revoked. No source
starts a service or initiates login. The Host rejects redirects, malformed
results and unexpected fields. The only issued value is a random 192-bit
ticket in unpadded base64url. A ticket expires within 30 seconds and can be
redeemed at most once for its exact service instance and proved backend
origin. The service rechecks the parent authorization on redemption and
throughout use.

The Host builds the URL using only its admitted browser origin, the fixed
redemption path, and one `ticket` query parameter. The public result includes
the current service binding, service generation, browser origin, and this
one-use URL. The browser origin may differ from the backend origin when the
Host provides a confined route to that same proved service. The consumer
uses the URL once in its owned sandboxed embedded view with no referrer. It
must not log, persist, cache, send externally, open in a different view, or
request another URL on a background poll. The service redeems the ticket on
embedded navigation and immediately returns a redirect to a clean same-origin
path. It keeps the ticket out of redirects, referrers, and caches. The
distinct derived cookie is host-only, secure, HttpOnly, and partitioned.
Neither the public API nor the private issue response carries the cookie or
parent credential. A parent revocation invalidates the derived session.

## Browser request boundary

Cookie matching does not include ports. Before exposing this method, the Host
must verify that a cookie-bearing request cannot reach a different listener,
including another port under the same hostname. Exact-origin checks at the
backend, partitioned storage, and navigation-only restrictions alone do not
satisfy this condition. A dedicated per-service browser origin or an equivalent
network boundary must confine navigation and credential-bearing requests
including descendants, subresources, redirects, and upgrades. The Host must
fail closed when it cannot establish that boundary. The service must never
receive a browser session from another bound service or generation. Retiring
the owning page or service generation invalidates its route.

Hosts without the feature omit the optional method. When browser entry is
unavailable or the user is signed out, the consumer can still offer the
ordinary manual entry. Immediate and embedded failures can use the existing
public notifications service without including URL or credential material.
