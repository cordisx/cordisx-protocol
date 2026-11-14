# Channel Manager v3 identity projection

[`channel-manager/v3`](../../../types/channel-manager.v3.d.ts) inherits every
operation, target, log, permission and subscription from
[`channel-manager/v2`](../../../types/channel-manager.v2.d.ts). Its inherited
`snapshot()` stays frozen at runtime snapshot v3. New
`snapshotWithIdentity()` returns runtime snapshot v4, which adds only optional
`accountName` and `accountAvatar` on accounts.

The name describes the authenticated connection account or bot; `displayName`
remains the optional user-facing connection label. The avatar is a completed
[bounded PNG](../raster-image/README.md), not an account URL, identifier,
filesystem path, browser cookie, token or credential. It comes from the
Host-owned adapter's authenticated identity source. Failure to obtain it leaves
the field absent and does not fail or reconnect the transport.

`refreshIdentity(signal)` is read-only. It reads the current Host-owned
projection and notifies existing subscribers when display data changes. It
does not grant connection, credential, binding, message or account permission,
perform a login or reconnect, or let the producer choose another account.
The Host must fence late responses to the current profile, generation and
request lifetime. Page disposal aborts its consumer request; service disposal
retires the Host-owned identity work and cache.

No operation or opaque token shape advances. Existing v2 callers keep their
exact v3 snapshots, and older Hosts simply lack these v3 methods. A supporting
collection can show its platform icon while account artwork is unavailable.
The two display fields never provide operation authority or searchable private
metadata.
