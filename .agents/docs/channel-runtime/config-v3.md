# Channel connection configuration v3

`cordisx.channel-service-config/v3` extends the launcher-owned configuration
with `pendingConnections`, distinct from resolved v2 `connections`. A pending
entry identifies the application account, not a tenant, and stores only an
opaque credential reference. It is not a Channel tenant reference. Creating a
pending entry requires successful application credential authentication. Failure
of optional tenant metadata discovery does not undo that authentication.

Pending accounts must be distinct and must not duplicate an account in
`connections`. Existing resolved connections retain their v2 identities. The
combined number of entries must not exceed 64, and a pending account's adapter ID must match its
adapter kind. A pending entry cannot be registered with a tenant-scoped adapter,
emit tenant-scoped events, create bindings, or access tenant-scoped history.
The Host exposes its incomplete state and a way to retry or supply the genuine
tenant key without replacing the credential. A successful resolution moves the
entry atomically into `connections` under revision control, preserving its
credential and reception settings. Resolution must use a trusted source for the
application's tenant; a sender's tenant in a cross-tenant message is not proof.
No bindings or tenant-indexed records may be created before resolution, and
existing resolved connections and their records must not be rewritten.
The existing Manager snapshot represents a pending entry with
`configurationState: "incomplete"` and the safe `lastErrorCode`
`TENANT_IDENTIFICATION_PENDING`; its opaque token identifies the connection,
not a tenant. It offers a Host-owned recovery form and no tenant-dependent
operations until resolution.

V1 and v2 documents remain readable. Hosts which do not support v3 reject it;
a downgrade must not discard pending entries or manufacture a tenant ID. A Host
may project the resolved entries to a v1 service artifact without persisting the
projection; it must retain pending entries in the owning configuration.
