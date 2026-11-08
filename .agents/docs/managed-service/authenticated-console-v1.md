# Authenticated managed-service console v1

Status: experimental additive contract. The renderer uses
`@cordisx/protocol/managed-service-console/v1`. The Node declaration and private
wire types are exported by `@cordisx/protocol/managed-service-console-runtime/v1`.
Web entry v1 stays read-only and remains independently available.

An admitted Node module may export `managedServiceConsole`. It must also declare
web entry v1 for the same service. The authenticated console source identifies
one fixed same-service operation and one fixed relative landing path. Admit it
only for a POST JSON operation with the v1 request and response schemas,
effective existing broker-header authentication, and a bounded timeout.
The operation is reserved to this broker, including when declared in a generic
service consumer grant. It is never invokable by the renderer or a different
plugin. The Host resolves the landing path only against the current proved
web entry origin.

The owner-bound renderer get path may expose `authenticatedConsole`.
`mount(target, {signal})` accepts only an empty, live body seat owned by that
owner's currently active Manager page. Mounting captures that page, profile,
source identity, plugin generation, service registration, service generation,
and proved loopback endpoint. The Host issues a random 256-bit binding for this
one view. Another mount cannot take over the seat or reuse its binding. Before
and after each awaited phase, the Host rechecks the captured ownership and view
lifetime. Hide the view while its seat is obscured or out of view. Abort,
unmount, navigation, binding replacement, owner disposal, and adapter loss
retire the view and its browser storage. No lifecycle path starts the service
or attempts a fresh login.

Only an existing authenticated management identity explicitly authorized for
this local view can be used. The service decides whether a current session is
eligible and resolves a single identity in the current service instance.
Catalog or model-use credentials, configured account names, package install
and Certified render permission cannot establish management authority. The
request carries no account selector. Missing, ambiguous, revoked or expired
management authorization returns `sign-in-required`, with no cookie.

The Launcher performs the private `prepare` operation, sending only the
validated origin and its per-view binding. The service mints a distinct
derivative of the valid parent session, never returning the parent credential.
The `prepared` result contains a single host-only cookie value with an expiry
limited by the parent session and capped at eight hours. Apply a single
operation deadline and bounded response parsing. Reject redirects, wrong
origins, wrong service generations, malformed or unexpected result states.
No public result, renderer message, URL, telemetry, command argument or log
may carry a cookie or exchange proof.

The Host may invoke prepare only after it has a supported isolated browser
adapter for the owned seat. Before any credential is installed, this adapter
must own a new private ephemeral browser session and enforce an exact-origin
network and navigation fence, including ports, all descendant frames, popups
and redirects. Never install it into the ordinary app or iframe session.
Cookies and browser storage must be discarded on retirement. The service checks
the parent identity, expiry and permissions throughout use. On retirement, the
Host makes a best-effort private `revoke` request for the exact issued binding.
An explicit browser sign-out retires the derived session and suppresses
automatic reattachment to the same management authorization until a fresh
user authorization. A parent sign-out invalidates all of its derivative sessions.

An older Host or an adapter without proven isolation omits the capability.
The consumer can still offer the normal manually authenticated web entry,
without treating an unavailable mount as authenticated or moving an existing
credential into that fallback.

[Browser ticket v1](browser-console-v1.md) is a separate optional exchange. It
does not install a native mount credential in an embedded browser view.
