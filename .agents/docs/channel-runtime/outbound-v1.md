# Channel outbound v1 and runtime v2

Status: normative explicit successor. `channel-outbound/v1` defines the new
wire documents and live capabilities; `channel-runtime/v2` adds `outbound` and
`adaptersV2` to the source- and generation-bound runtime. All v1 methods,
declarations, snapshots, notification shapes and adapter `send` remain frozen.
V2 uses an explicit context type, not a conflicting Cordis module augmentation.
Availability is feature-detected; a missing v2 service is not permission to
invoke a private Host API. These contracts do not establish Host adoption.

## Message descriptor and capability negotiation

`ChannelMessageSendV1` carries a frozen `ChannelThreadRef`, notification kind,
idempotency key, one closed content descriptor and an explicit fallback policy.
The standard types are text, image, audio, file, video, richtext and card.
Richtext is bounded blocks of plain/strong/emphasis/code text, not HTML,
Markdown, arbitrary platform JSON or active links. Card is a portable title and
body, not an interactive action, script, embed or vendor payload. Multi-part
messages, buttons and external links require a future version.

`capabilities(target)` reports target-specific types and maximum media bytes.
The Host intersects adapter declarations with platform, account and policy
limits; it never treats adapter declarations as authority. The send boundary
rechecks authorization and current limits before queue acceptance and dispatch.
Native content is selected when supported. Unsupported content may become text
only when the caller explicitly supplies `fallback.mode = text` and text is
supported. Otherwise reject with `CHANNEL_OUTBOUND_UNSUPPORTED`; do not silently
drop media or reinterpret one media kind as another. Oversize media is rejected
with `CHANNEL_MEDIA_TOO_LARGE`, not downgraded. No success receipt is created for
a rejected request. Frozen v1 adapters have text-only capabilities; a v2 Host
may dispatch effective text through their inherited `send` method.

The complete serialized UTF-8 send request is at most 196,608 bytes. Per-field
bounds do not replace this aggregate transport bound, especially for richtext
blocks. Receipts must report `downgraded` exactly when effectiveType differs from
requestedType; the only different effectiveType allowed is text with explicit
fallback. Adapter deliveries contain the selected effective content, original
idempotency key and target; the original descriptor stays in Host-owned state.

## Scoped media preparation and resolution

Sources and prepared handles are opaque, branded strings. Their serialized
prefixes only distinguish token families; matching a schema does not confer
authority. Only the Host issues them. Source issuance belongs to an already
authorized Host producer (for example a quarantined inbound attachment or a
generated artifact). A second input kind, `bytes`, accepts bytes already read
within the caller's own authorized sandbox. Neither input accepts a path, URL,
download instruction or ambient Host file-reader API. Inbound v1 attachment strings are
not automatically outbound sources. Source issuance must explicitly check the
caller's existing access and permitted outbound use. Do not expand file,
network, workspace, attachment-read or secret permissions to make send work.

No public source-issuance API is intentionally defined in this version. A Host
with no authorized source producer must reject source preparation with
`CHANNEL_MEDIA_UNAVAILABLE`; it must not fabricate a source or reinterpret an
inbound handle. Bytes preparation is the standalone usable path. A future public
producer or chunk upload needs its own explicit capability/version contract.

`prepare` accepts an `input` (source or bytes), media kind and target. The Host verifies caller
source identity, caller generation, profile, source ownership, expiry and target
authorization, validates content/MIME/size and produces an immutable descriptor.
Prepared handles bind those same scopes, exact target (including thread), kind
and immutable source bytes. Image/audio/video require corresponding validated
MIME families; file permits other validated MIME types. Filenames are display-only,
not paths. Preparation itself never sends. Forged, expired, revoked, cross-caller,
cross-profile, cross-target or stale-generation tokens fail closed with
`CHANNEL_MEDIA_UNAVAILABLE`, without disclosing the other scope's existence.
Target denial remains the existing Channel authorization denial.

Bytes input is canonical padded RFC 4648 base64, nonempty and at most 174,764
characters; decoded bytes are at most 131,072 bytes and also within current
target `maxMediaBytes`. `size` is an integer from 1 through 131,072 and must
equal decoded length. `sha256` is exactly 64 lowercase hexadecimal characters
and must match SHA-256 of decoded bytes, not the base64 string. Reject malformed,
noncanonical, length/hash-mismatched or oversized data before issuing a handle.
Check encoded bounds before decode; enforce decoded bounds during allocation;
bound concurrent/aggregate preparation, retention and caller quotas. The Host
validates MIME against actual content; filename is bounded display text, required for file/video.
Never log/persist base64 in receipts or errors. The prepared bytes are immutable
and Host-owned; hash is integrity, not proof of origin or authorization.
The Host derives and verifies source task identity from the authenticated task
execution context and caller source/generation, never a taskId supplied in the
payload. A caller without an authorized task/source context is denied. This
boundary grants no sandbox escape and never asks the Host to open a caller path.

The complete serialized UTF-8 prepare request must be at most 196,608 bytes,
leaving envelope space under a 256 KiB Host RPC limit. Do not raise any global
RPC limit. Larger source-based media may remain within the 30,000,000 bytes descriptor
limit; larger bytes uploads need a separately versioned chunk capability owned
by the Host implementation, not repeated inline prepares or concatenated tokens.
No begin/chunk/commit capability is introduced by this version.

`maxMediaBytes` is the target's decoded media ceiling, from 0 through 30,000,000
bytes, not an inline upload allowance. Effective inline preparation limit is
`min(131072, maxMediaBytes)`; source preparation and dispatch use
`min(30000000, maxMediaBytes)` plus stricter adapter/policy/quota limits. Zero
disallows media. Size, integrity, scope or authorization failures never trigger
text fallback; fallback handles unsupported content types only.

Descriptor size ceilings are image 10,000,000 bytes;
audio/file/video 30,000,000 bytes. Apply the kind ceiling as well as target limits.
These descriptor ceilings do not enlarge the inline RPC preparation boundary.
Preparation returns a usable handle only after complete bytes, declared size,
SHA-256 and declared-format signature validation succeeds. A chunk-backed Host
performs these checks at commit before sealing/returning the handle; inline
prepare performs the equivalent commit internally. Signature means content
format recognition, not a cryptographic signature or a new descriptor field.
Binary has no format magic requirement; other supported formats must pass their
format validation. Failure must not expose a usable prepared handle.

Only an active registered adapter's Host-issued `media.resolve(handle,
deliveryId)` capability can resolve bytes. The Host checks that the delivery is
currently dispatched to that exact adapter/account/generation and uses that
handle with that target. Resolution yields bounded bytes and validated metadata,
never a path, URL, credentials or caller-controlled resolver. Plugins using
`outbound` cannot resolve media. Retries reuse the same immutable handle only
while its scope and expiry remain valid. Queue acceptance does not extend media
lifetime or promise durable pinning. Expiry, revocation or disposal blocks
dispatch and resolution with `CHANNEL_MEDIA_UNAVAILABLE`; media is not silently
recreated or replaced and these failures do not trigger text fallback.
Dispose/replacement invalidates live source/handle/adapter capabilities. Queued
work without a valid media handle fails closed; cross-generation resume and
independent durable media retention are not promised by this version.

For agent/CLI callers, the exact bytes payload is
`{ contract: "cordisx.channel-media-prepare/v1", schemaVersion: 1, target, type,
input: { kind: "bytes", bytesBase64, sha256, size, mediaType, format, filename?, durationMs? } }`.
Use the returned `handle` in content and retain the original send descriptor
for idempotent retries. Task/source identity is transport-authenticated, not JSON.

## Routing, receipts and idempotency

Target conversation/thread semantics, reply policy and exact Channel permission
checks remain those of the existing [runtime](README.md) and
[reply routing](reply-routing-v2.md). No field selects a different conversation,
thread, caller, task or authorization route. Fallback uses the exact same target.

Idempotency is scoped by Host profile, caller source and generation, tenant/account
and exact target, not a global key. The Host stores
the validated original descriptor (including handle and fallback) and chosen
effective content atomically with queue acceptance. Within the documented Host
retention window and valid caller/media lifetime an identical authorized retry
returns the same delivery handle;
reuse with a changed descriptor rejects `CHANNEL_IDEMPOTENCY_CONFLICT`. A caller
must retain its original descriptor rather than prepare a new handle for that
retry. Authorization is rechecked before dedup readback; a stale capability cannot
retrieve another generation's records. Effective content is not renegotiated on
retry; changed support fails the delivery instead of sending a different message.

`receipt()` is caller-scoped and reports requested/effective type, downgrade and
queued/sending/retrying/sent/failed/cancelled/unknown status. `sent` requires a
positive platform acknowledgment and nonempty external message ID. Unknown
captures an ambiguous platform outcome, never a fabricated success; failed and
unknown have redacted stable codes, not exception text. Only successful receipts
may expose an opaque recall handle under existing recall authorization. Cancel
uses inherited cancelled/irreversible/not-found meanings and cannot erase a
positive acknowledgment. Host retention and reconciliation are bounded and
documented by the implementation. Delivery is at-least-once, not exactly-once:
adapters deduplicate by deliveryId where supported, and ambiguous irreversible
outcomes require reconciliation rather than blind retries.

## Representations and security analysis

Prepared and resolved metadata align with the internal descriptor: `type`,
`handle` (prepared only, `media:` family), `format`, `size`, `sha256`,
`filename?`, `durationMs?`, plus validated MIME and public expiry. Allowed format
mapping is image png/jpeg, audio opus, video mp4, file pdf/binary. File/video
require a nonempty display filename of at most 255 Unicode code points, with no
slash, backslash, U+0000–U+001F or U+007F, no leading/trailing ECMAScript whitespace,
not `.` or `..`, and no trailing dot. PDF requires a case-insensitive `.pdf`
suffix and MP4 a case-insensitive `.mp4` suffix. Schema string lengths count
Unicode code points, not UTF-16 code units; Host public validation must use the
same counting rule. Platform-specific stricter filename restrictions may reject
with a redacted validation error but must be documented by that adapter, not
silently truncate or alter the filename. Duration is
optional only for audio/video, integer milliseconds from 0 through 2,147,483,647.
Host validates format/MIME/bytes consistency rather than trusting declarations.
Source input obtains metadata from the Host-owned source. Raw bytes input declares
metadata, which the Host validates. Richtext blocks and card metadata are bounded
direct descriptors; image/audio/file/video always resolve immutable bytes.

[Types](../../../types/channel-outbound.v1.d.ts) define branded sources, prepared
handles, live send/receipt/resolve capabilities and adapter deliveries;
[runtime v2](../../../types/channel-runtime.v2.d.ts) defines explicit registration.
Six `channel-*.v1.schema.json` outbound documents constrain prepare, prepared
media, message send, delivery, capabilities and receipt. Live services, bytes
and callable handles are not serialized. Closed bounded schemas reject raw URLs,
paths and vendor payload fields; authorization must still reject forged tokens.
Threats covered are confused-deputy resolution, cross-tenant/caller replay, stale
generation access, unsafe fallback, ambient file/network authority and duplicate
send. The Host must enforce the above scopes atomically; adapter declarations,
token syntax and schema validation alone are insufficient. Conformance fixtures
check shapes and a portable reference model, not real Host security/adoption.
