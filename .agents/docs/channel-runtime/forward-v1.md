# Channel forwarding v1

`channel-forward/v1` is an optional independent capability. It does not extend
frozen outbound content or grant `channel.messages.send` callers forwarding
authority. Hosts without it reject the operation; clients must not emulate it
with send, history replay, or an Agent-owned SDK.

The request identifies one source conversation, one destination conversation,
an ordered unique list of 1..100 message IDs and a stable 1..128-character
operation ID. `forward` requires exactly one ID; `merge-forward` requires 2..100.
Authorization independently covers source read and the selected destination
operation. Channel-origin callers cannot select another source conversation.
The Host policy profile uses separate explicit command keys `forward-read`,
`forward`, and `merge-forward`, denied by default. A send grant does not grant
any of them; a single-forward grant does not grant merge-forward. These keys
are policy operations, not promises of supported chat slash commands.
Caller identity comes from authenticated Host context, not request fields.
Each message must be proven to belong to the declared source before mutation.

The initial platform profile is Feishu/Lark, same adapter/account/tenant only,
direct or group conversation destinations only. No cross-account, broadcast,
reply or thread targets, implicit text fallback, or capability escalation is
allowed. Platform permission, visibility, deleted/protected-message and message
type restrictions remain authoritative. No claim of platform support follows
from accepting this portable request shape.
`thread-forward` (forwarding an entire topic) and forwarding into a topic are
both unsupported here. They are distinct operations, and ordinary reply/thread
sending does not establish either. Non-forwardable message types and messages
inside a merged-forward bundle must fail with the platform's actual rejection;
never emulate these by copying text or walking and resending child messages.

Persist caller-scoped operation identity and request fingerprint before the
platform effect. Reuse returns the existing receipt, never another mutation;
changed parameters for the same identity conflict. Reauthorize before receipt
disclosure. Concurrent duplicates must coalesce. Persist `sending` before the
call. A crash during sending, transport failure, malformed/missing receipt or
unproved effect yields `unknown`, never an automatic retry. A server UUID is
additional deduplication, not permission to replay an uncertain effect.

Only `sent` proves full delivery and requires a real external message ID.
`partial` also requires the actual ID and records the platform's rejected IDs;
it is not full success. `failed` requires a definite rejection before effect;
`unknown` never means failure or success. A receipt read must not cause a send.
An operator may investigate unknown effects externally, but this version has
no retry/reset operation. Retain the ledger across service and launcher restarts.

Security analysis: both reading and disclosing source content are bounded by
source authorization; destination forwarding is a separate explicit mutation.
Platform IDs are identifiers, never grants. Receipts and operation conflicts
must not leak another caller's operations. Raw credentials, media bytes and
private reasoning are not accepted by this capability.

See [types](../../../types/channel-forward.v1.d.ts) and
[schema](../../../schemas/channel-forward.v1.schema.json).
The [receipt schema](../../../schemas/channel-forward-receipt.v1.schema.json)
constrains real-ID success, partial rejection lists, and explicit uncertainty.
