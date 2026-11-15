# Channel connection configuration v2

The launcher-only `cordisx.channel-service-config/v2` document is a successor
to frozen v1, not an extension of v1. Its public type entrypoint is
`@cordisx/protocol/channel-service-config/v2`; its serialized shape is
[the v2 schema](../../../schemas/channel-service-config.v2.schema.json).

V2 adds an optional bounded `displayName` and an optional distinct nonempty
`selectors` array to a connection. Selectors are `direct`, `group`, `mentions`
and `replies`. They select receive behavior, not permissions or task routing.
An absent array preserves the existing adapter behavior. A present array admits
a message matching one of its selected classes. The Host must not advertise a
selector it cannot implement for its active adapter.

V1 remains readable and unchanged. A v2-capable Host upgrades only when saving
connection configuration; it preserves existing references and unrelated
connections. A v1-only Host rejects v2. Downgrade requires an explicit launcher
projection that removes the two new fields and restores the v1 contract/version;
it cannot silently discard user settings in durable storage.

Existing manifest declarations still name v1 service input. The launcher keeps
the v2 settings in its Host configuration layer, applies selected receive
behavior in its official adapter, and supplies a deliberate v1 projection to
v1-only service artifacts. Service artifacts do not receive credentials.
Manager snapshots may project only the display name through the already
versioned public Manager type. V2 storage never adds identifiers, secret values
or secret references to opaque Manager requests, results or safe logs.

Credential capture stays Host-owned and explicitly user-triggered. Successful
creation/rotation consumes an exact, expiring, profile/generation/purpose/owner
bound draft through CAS. Cancellation, expiry or failure must preserve the
previous configuration and valid credential. A newly staged Keychain item uses
its own identity so a failed rotation cannot overwrite the previous item.
