# Channel terminal delivery intent v1

A caller can attach a [terminal intent](../../../schemas/channel-terminal-intent.v1.schema.json)
to a single explicit Channel send to identify the incoming operation whose
current turn the caller intends to answer. Ordinary progress sends carry no
intent and never suppress an automatic final response. Intent alone does not
prove that the task succeeded or that a message was delivered.

The launcher send request carries this object as `terminal` alongside its
existing target, content, and stable send operation ID. The input operation ID
identifies an accepted Channel input, not the outbound send. V1 is limited to
single-target sends; batch sends cannot carry terminal intent.

The Host derives the caller's session, turn, source, and authority from the
authenticated execution context. It verifies that the input operation belongs to
that active turn, the same authorized sender and conversation, and the unique
automatic-final owner. V1 covers one target within that source conversation. It
does not confer send permission, authorize a different topic, or identify a
target on the caller's behalf; existing target and policy checks still apply.

Before a terminal send can produce an outbound effect, the Host durably reserves
the intent with the exact input and final owner, session, turn, source scope,
target, stable send operation, and caller-scoped delivery identity. The
automatic-final reservation must recheck that intent atomically with its own
reservation. If the final is already reserved, the terminal send is rejected
before any effect occurs. A modified request under the same operation ID
conflicts. Implementations must not infer terminal intent from message text or
from an ordinary send's receipt.

Only a positive receipt for that exact delivery proves it was sent and
suppresses the automatic final. A queued, processing, retrying, missing, or
unknown receipt leaves the terminal delivery unresolved. A failure permits
fallback only when the Host has positive evidence that no external effect
occurred and no send can still be in flight. An ambiguous result is never
retried under a new identity, retargeted, reported as sent, or treated as an
absent send. Other progress sends and subsequent independent work remain
available under their existing rules.

The reservation and the outbound queue may use separate durable stores. Recovery
must preserve the fence across a crash between those writes and reconcile only
the original caller-scoped delivery. A missing outbox record alone is not proof
of non-delivery. A Host that cannot interpret unresolved reservations must not
silently ignore them or dispatch a replacement final on downgrade. Retention,
reconciliation, and any operator resolution remain bounded Host
responsibilities.

## Compatibility and security

This intent is an additive, versioned launcher request; it does not add fields
to the frozen Channel transport message formats. A caller must omit it for an
ordinary send. An older Host or CLI that does not support the field must reject
the terminal request before any outbound effect occurs; callers must not retry
it with the intent removed. The explicit input ID is a correlation value, not an
identity claim or a permission grant. Revalidation, exact-scope isolation,
idempotency, and a fail-closed downgrade prevent it from suppressing another
sender's or conversation's reply.
