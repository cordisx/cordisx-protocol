# Channel Manager v15: presentation capabilities

The additive [v15 service](../../../types/channel-manager.v15.d.ts) exposes
`presentationCapabilities()` on a generation-bound `forOwnPresentationService()`
facade. The result is a versioned, read-only presentation descriptor. Its shape
is not a permission, service grant, credential, or proof of owner identity.
Ordinary Host authorization, service ownership, and generation fences remain
mandatory for each operation.

`standard` preserves the preceding service's behavior. It does not promise
that a particular action is available; clients still inspect the existing
snapshot's `availableOperations` and method support.

`snapshot-only` offers a current or explicitly time-stamped Channel account
snapshot and the existing local subscription needed to update that view. It
does not offer credential, connection, policy, binding, conversation, message,
event, or log operations. Consumers must not offer controls, routes, or tabs
for those operations. A Host must still reject such requests, regardless of
client presentation. Observation must retain its original observation time
when a refresh is unavailable. A service or authorization lifetime change
retires the facade; a renderer must not infer current state from an old view.

The mode is fixed for the facade's owner and module generation; a change
retires that facade and requires a new one. Consumers use v15 only when the
owner-bound method is present. An older service without it retains its frozen
behavior; an advertised but invalid or failed descriptor is not evidence of
standard access and must fail closed. This contract does not implement a Host,
grant cross-client permissions, or establish that a particular service runs.
