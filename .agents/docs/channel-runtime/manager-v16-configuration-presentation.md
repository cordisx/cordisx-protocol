# Channel Manager v16: configuration presentation

The additive [v16 service](../../../types/channel-manager.v16.d.ts) lets the
owning plugin explicitly request `forOwnConfigurationPresentationService()`.
The returned facade advertises the versioned `configuration-only` descriptor
through `configurationPresentationCapabilities()`. The descriptor controls
presentation only; it is not a permission, owner identity, or credential.
Every read, form mount, and write retains its owner, authorization, generation,
and revision fences. An unavailable or invalid facade must fail closed.

This facade supports the existing account snapshots, identity refresh and
subscription, and the v8 Host-owned connection configuration form. It may
advertise `connection.update` only for accounts that can use that form.
For an existing resolved account, the Host-owned form may offer credential
rotation when the Host can authorize and coordinate that transaction. Otherwise
it omits the credential input. Credential values, references and private draft
identifiers are not exposed through the plugin-facing facade. The Host rejects
plugin-issued credential operations, as well as creation, connection control,
policies, conversations, bindings, events, and logs. Consumers expose only the
account list, configuration, and runtime-status surfaces for this mode. A
pending identity that cannot yet be configured remains unavailable.

An inline credential write retains the account authorization, owner generation
and configuration revision checks. Private drafts are retired with their form
or renderer; an unconfirmed cleanup or write does not produce an applied
receipt. The Host must not persist the entered credential in browser storage
or automatically retry an uncertain write.

The new facade is requested separately. The existing v15
`forOwnPresentationService()` and its `snapshot-only` descriptor retain their
read-only semantics, including enforcement by the Host, even when the new
facade is available. A consumer must never infer configuration support from
the old descriptor or method presence alone. Older Hosts and plugins retain
their existing behavior; no automatic widening of an old facade occurs.
The facade is bound to the actual service owner and module generation and is
retired when either is no longer current. Failed or uncertain saves do not
report an applied receipt and must retain the user's draft when possible.

This proposed contract does not establish cross-client synchronization, a
credential broker, an adapter implementation, or a released Host.
