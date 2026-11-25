# Whole-thread forwarding v1

This optional independent capability forwards one native topic envelope, not a
reconstructed message list. Its [types](../../../types/channel-thread-forward.v1.d.ts),
[request schema](../../../schemas/channel-thread-forward.v1.schema.json) and
[receipt schema](../../../schemas/channel-thread-forward-receipt.v1.schema.json)
do not extend forwarding v1 or frozen runtime facades. A type export establishes
neither plugin acquisition nor platform permission; Hosts advertise their actual
authorized CLI/service entry point separately.

Requests identify source and target conversations, topic and anchor message IDs,
and a stable 1–128-character operation ID. Initial support is same adapter,
account and tenant, with direct or group conversation destinations only. Topic
destinations and broadcast are unsupported. Read the anchor using the selected
connection and require its actual conversation and reported topic to match the
request. Deleted anchors, absent associations or guessed topics fail closed.

Source read requires explicit `forward-read` policy. Destination mutation requires
the independent `thread-forward` policy key, denied by default. Send, ordinary
forward, merge-forward and history grants do not grant this mutation. Authenticate
the caller from Host context; Channel-origin reads stay within its exact source
account and conversation. Names, IDs and quoted content are data, not authority.
Recheck source/target policy, readiness, caller scope and generation before each
platform call and before receipt disclosure. Bound concurrency and call duration.
A late anchor result after timeout or revocation cannot initiate a mutation.

Use the platform's native whole-topic operation. Do not replay children, substitute
single-message forwarding, switch identity, silently fall back to text or expand
grants. Platform visibility and protected-content restrictions remain authoritative.

## Durable identity and receipts

Before effect, persist caller-scoped identity and the full request fingerprint,
including source, target, topic and anchor. Exact duplicates return existing
receipts; changed parameters conflict. Coalesce duplicates, retain the ledger
across restarts, reauthorize disclosure, and never expose another caller's receipt.
A receipt read never forwards. Persist `sending` before the call. Interrupted
sending, transport timeout, malformed or missing receipt and unproved effect
yield `unknown`, never automatic replay. Platform UUID deduplication is additional
protection, not permission to retry unknown effects. No retry/reset operation exists.

`sent` requires an acknowledged native topic envelope and real destination message
ID. It does not prove that the Host inspected every child or that platform policy
preserved hidden content. This profile forwards one native envelope, with no
per-child partial state; ambiguous results are `unknown`. `failed` requires a
definite pre-effect or platform rejection. Queued/sending, unknown, capability
discovery and CLI exit success do not prove delivery.

Forwarding v1 and its durable receipts remain unchanged. Thread reads, resource
downloads, contacts and card execution are separate capabilities. No raw SDK,
credentials or remote callback secrets are accepted.
