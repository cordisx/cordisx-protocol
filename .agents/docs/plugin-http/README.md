# Plugin HTTP v1

Experimental, implementation-independent contract for owner-bound HTTP. The
[types](../../../types/plugin-http.v1.d.ts) define the public interface; a Host
must advertise unavailable until its real authorization, credential and network
adapters are installed. This is not an arbitrary transport or wallet service.

## Authority

The Host binds each client to profile, source, plugin and runtime generation.
`authorize` displays the exact canonical origin and requesting plugin through
Host-owned consent. Only HTTP and HTTPS origins without userinfo, path, query or
fragment are accepted. Scheme, host and port are significant. HTTP, loopback and
private-network servers require that same explicit exact-origin consent; no
wildcards or implicit grants from another server, plugin or credential exist.

A bearer token is entered into a masked Host-owned capture control and retained
by the Host credential store. It never appears in public method parameters,
results, configuration, diagnostics or logs. Unsupported storage fails closed.
The Host adds Authorization only after resolving the exact owner/origin-bound
connection. Opaque connection records may be retained as non-secret correlation
data; copying one is not authority. A new runtime must authorize again.

## Requests

Only the declared methods and headers are accepted. Paths start with one slash,
do not contain backslash, userinfo or fragments and resolve to the exact origin.
All redirects are refused, including redirects to the same origin. Ambient
cookies, proxy authentication and user-provided Authorization are not forwarded.
Request bodies are limited to 256 KiB, responses to 1 MiB. Connections allow at
most eight concurrent requests. Deadlines are absolute Unix milliseconds, must
be in the future, and are capped at 30 seconds by the Host. Abort, deadline,
revocation, owner retirement and Host disposal cancel the underlying transport;
late responses cannot become success. A cancelled mutation may already have
reached the remote server: callers use server idempotency and reconciliation.

Responses expose only status, content type and bounded text. The Host must never
project Set-Cookie, Authorization or credential-store details. Diagnostics use
closed failure codes and exclude URLs with query, body and credential data.
HTTP failures preserve their statusCode as accepted transport responses; network
failure and authorization failure are distinct from remote business rejection.

## Security analysis and downgrade

This capability protects cooperative plugin access to Host credential storage;
it does not make trusted renderer plugins a malicious-code sandbox. Untrusted
uploaded content must never receive a connection, token, HTTP client or arbitrary
command bridge. A missing consent UI, secret backend or launcher transport yields
`unsupported`/`host-unavailable`, never a renderer fetch fallback. DNS and IP
addresses may vary within an explicitly authorized hostname; deployments that
need address pinning must enforce that additional network policy at their Host.
