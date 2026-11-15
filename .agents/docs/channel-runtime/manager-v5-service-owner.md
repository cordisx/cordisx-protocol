# Channel Manager v5: invoking an owned service

`channel-manager/v5` adds `forOwnService()` to the frozen v4 interface. It
returns a v4 management facade only when the Host has actually activated the
caller's Channel management service. Missing ownership returns `undefined`;
older Hosts do not expose the method. Consumers show unavailable rather than
substituting a private bridge or manufacturing a permission grant.

The provider uses this facade for its own account and connection management,
configuration, diagnostics and bindings. These internal calls require no
`channel.accounts.read`, `channel.accounts.connect`, `channel.bindings.read`
or `channel.bindings.write` declarations, permission prompts or persisted user
grants. A provider consumer should omit those declarations when it exclusively
uses its owned service. Existing declarations and inherited delegated APIs
keep their prior scope and permission behavior, including explicit denial.

Ownership comes from successful Host service activation, not the plugin id,
manifest service declaration, development mode, package label, or message
content. The Host matches source, plugin, service id and kind, service
incarnation, runtime/profile lifetime and module generation. Each invocation
through Host Cordis tracing checks the originating caller again. A facade
traced into a foreign caller,
retained after replacement, or used after its service is retired is unusable.
Service-owned target scopes, opaque target validation, revisions, cancellation
and generation fences still apply. Creating or changing a connection remains
a normal Host-owned credential workflow; no secret is returned to the plugin.

This management facade supplies no transport handle, credential resolver,
message sending/subscription authority, filesystem access, rendering grant or
native task authority. Those operations remain separate. Platform consent
and conversation command/access policies continue to apply.

## Security analysis

The exception describes a provider's internal call, not broader user consent.
The Host creates the ownership association only from a successfully loaded
service, then binds it to the exact renderer generation. Neither a consumer
declaration nor matching the provider's name is evidence of service ownership.
Unrelated consumers continue to use the delegated interface and its existing
permission broker. Authorization records for those consumers cannot create,
widen or revoke another provider's internal service association.

Retirement removes the association. Stale returned results cannot publish
into a replacement generation. A runtime read window, execution budget or
permission page must not invent a binding-count limit.

This is a cooperative service boundary within the trusted plugin runtime,
not isolation from arbitrary same-realm code. Deliberately forwarding a
provider's already bound callbacks cannot be identified as a new caller by
the JavaScript runtime; consumers must use normal Cordis service tracing.
