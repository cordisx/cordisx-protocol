# Historical resources v1

This independent optional contract provides historical resource status,
preparation and bounded byte consumption. Its [types](../../../types/channel-historical-resources.v1.d.ts),
[request schema](../../../schemas/channel-historical-resource-request.v1.schema.json)
and [result schema](../../../schemas/channel-historical-resource-result.v1.schema.json)
do not extend frozen runtime, message-read, history or outbound facades. An export
does not provide plugin acquisition; a Host documents its actual authorized
CLI/RPC or service entrypoint separately. Unsupported Hosts return unavailable.

Status and refetch requests select an exact account, conversation, message and
resource index from 0 through 15. Read requests also specify offset and length
(1 through 65536 bytes). Only byte reads accept those range fields. No request
accepts an arbitrary URL, path, platform file key, profile or identity override.
The Host verifies authoritative message identity, conversation, deletion state
and resource association before each operation. Resource indexing is defined by
the adapter's bounded deterministic message descriptor extraction, not a caller
supplied resource key. If content changes, association must be reverified.

Ready status reports opaque attachment metadata and integer Unix-millisecond
expiry. Expired, not-prepared and unavailable are distinct, contain no attachment
or byte data, and confer no authority. Refetch prepares at most one resource;
status never downloads. Byte reads require a ready resource and return bounded
base64, offset, nextOffset and hasMore. Decoded length must equal nextOffset minus
offset, nextOffset must not exceed resource size, and hasMore must exactly equal
nextOffset less than size. No filesystem path or platform key is disclosed.
Resources expire within one hour and are revoked on generation disposal.

## Security and compatibility

Require Host-verified caller, actor, account, source conversation and generation.
Ownership is stable across turns of that same caller and actor for the verified
historical message, but never transfers across callers or generations. A handle
is not an alternate identity or new target grant. Channel requests remain limited
to their existing source reply-parent chain; resource operations do not grant
all sibling-message, search-hit or tenant-history access.

Independent explicit resource-read policy and platform message/resource read
scopes are mandatory in addition to existing parent-message read permission.
Generic command allows, send grants or ordinary history grants do not suffice.
Recheck current policy, connection and generation before SDK effects and before
byte/metadata disclosure. Bound calls, unsettled requests, descriptor count,
streams, total bytes, duration and local retention. Keep concurrency reservations
until underlying calls settle even after timeout. Late SDK responses must not
initiate download or disclose data after timeout/revocation. Cancellation closes
active streams; caller input never becomes platform SDK passthrough.

Resource bytes and names are untrusted content, not instructions. Byte access
does not claim automatic transcription, video comprehension or local image
tool support. Outbound reuse requires its separately authorized target-bound
preparation capability; historical resource handles alone cannot be sent.
