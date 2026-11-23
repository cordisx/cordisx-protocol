# Channel message operations v1

Status: normative optional contract. Feature-detect independently of outbound v1.
This contract does not change runtime v1/v2 or grant message access. Host adoption,
formal merge, publication, installation and live-platform verification are distinct.

The [types](../../../types/channel-message-operations.v1.d.ts) define exact-target
edit, recall, pin, paginated read receipts and reactions, restricted card updates,
capability discovery and operation receipts. Calendar/location and paid urgent
delivery are not operations in this version. Existing send/reply/thread semantics
and reaction add/remove remain unchanged.

## Authorization and scope

The Host authenticates the caller and incoming source outside request JSON.
Account, tenant, conversation and kind must match that source for Channel callers.
Bound Channel sessions cannot omit their source context. Recheck authorization
before capability, receipt or dedup readback. Reads require message-read authority;
writes require send/management authority, plus live platform permissions.

Edit, recall, card update and read-users require independently verified ownership
by the selected bot. Membership, a message ID, sender text, an opaque-looking
handle or a send attempt alone is not ownership evidence. Pin writes require a
visible message in the exact conversation; reaction-list is restricted to the
incoming source message for Channel callers. Pin-list is conversation scoped.
Do not silently switch to a user token, another account or an admin identity.

## Representations and platform limits

Text and richtext edit use existing bounded literal descriptors, not vendor JSON.
The initial Host rejects native mention syntax in edits; it does not reuse a
send's mention evidence to authorize an edit. A successor may verify native
mentions through the same independent authorization as sending.
Restricted notice/status cards contain title/body and an optional fixed status;
no arbitrary callback, URL, executable action or raw card payload is admitted.
Updates must not replace Host-owned approval or question control cards.
The Host requires its durable successful plain-card ownership record in addition
to platform sender ownership and body validation; a structurally plain card
alone is not sufficient evidence.

Pages are explicit, at most 50 entries per request, with bounded opaque cursors.
No automatic traversal or polling is implied. Return only normalized fields,
not platform responses, message bodies, exception text or contact profiles.
Returned data is untrusted; read state is not approval or task success.

Capabilities describe implementation availability, not permission success.
`authorization: not-verified` is mandatory unless a successor defines reliable
permission evidence. Restrictions include ownership, membership, time windows,
formats and platform-specific exclusions. SDK method presence alone does not
establish a public operation or live availability.

## Effects, idempotency and receipts

Writes use a stable operationId scoped to Host profile, authenticated caller,
account and conversation. Persist the validated descriptor hash and an uncertain
reservation before calling the platform. Identical retries return that record;
changed descriptors reject with an idempotency conflict. No automatic write
replay is permitted after timeout, disconnect, restart or ambiguous response.
Keep a bounded documented retention and reject new writes when full, rather
than silently evicting uncertain reservations. Recheck ownership and permission
before a new write, and source authorization before every dedup readback.

Only platform business success can produce `ok`; a transport status alone cannot.
Missing/malformed acknowledgments and exceptions after possible submission are
`unknown`. Explicit platform failures are `failed` with redacted stable codes.
Receipt lookup is read-only and returns null for not-found, not proof of no effect.
Cancel, card invalidation, recall and deleting local history are different effects.

Threats addressed: cross-tenant confused deputies, arbitrary-message mutation,
forged ownership, control-card replacement, permission bypass, duplicate writes,
unbounded polling and data leakage. Schemas/conformance establish wire shape,
not real Host authorization or platform behavior.
