# Channel reply routing and policy v2

The explicit [`channel-manager/v6`](../../../types/channel-manager.v6.d.ts)
successor adds `conversationReplyPolicy`, `configureConversationReplyPolicy`
and `forOwnReplyService`. It uses [policy v2](../../../schemas/channel-conversation-policy.v2.schema.json)
and [readback v2](../../../schemas/channel-conversation-policy-readback.v2.schema.json).
All inherited methods, v1 policy schemas and transport identities remain frozen.
Older Hosts lack the new methods; a consumer must expose the unavailable state
rather than infer reply configuration from a v1 document.

The Host owns the form, persistent policy, revision and task final-delivery
decision. These settings contain no credentials and confer no send authority.
Read/configure calls use the same caller, profile, generation, account-read and
binding-read boundaries as [policy v1](conversation-policy.md).
`forOwnReplyService` applies the same actual-service ownership and retirement
rules as [`forOwnService`](manager-v5-service-owner.md).

## Reply modes

- `conversation`: a new message in the conversation's main stream, without a
  referenced message or new topic.
- `reply`: a reply referencing the selected source message in the main stream.
- `thread`: a reply in the platform's topic/thread rooted at the source message.
- `none`: suppress automatic final delivery; it is not a transport send mode.
- `agent`: let the current task choose a concrete mode before final delivery.
  Without a choice, use the configured `replyFallbackMode`.

The profile defaults are `replyMode: agent`, `replyFallbackMode: conversation`
and an empty `replyModes` array. Each scoped row supplies `mode`, optional
`fallbackMode`, optional conversation `kinds`, and exact adapter/account/tenant/
conversation identifiers. Missing scope fields match all values at that
dimension. The matching row with the most scope predicates wins; `kinds`
counts as one predicate. Equally specific overlapping rows are rejected instead
of resolving by array order. A row's omitted fallback inherits the profile
fallback. Per-binding explicit defaults override the matching row, and an
explicit choice for the exact incoming task operation overrides those defaults.

Reply and thread modes require a source message or thread anchor. A missing
anchor or unsupported platform mode is an error; it cannot silently create a
main-stream message or another topic. Normal send permissions, addressing and
send policy still apply. Selecting a final-delivery mode alone never sends.
The task must not manually send the same final message as well; it can select
`none` before an explicitly requested manual send.

## Existing transport identity mapping

No field is added to frozen `ChannelThreadRef` or notification v1 shapes.
For Feishu/Lark, main-stream sends use `semantics: conversation` and the chat
as `threadId`. A quoted reply uses `semantics: reply-chain` and its referenced
message as `threadId`, mapping to `message.reply` with `reply_in_thread: false`.
A topic reply uses `semantics: topic` and its message root as `threadId`, mapping
to `message.reply` with `reply_in_thread: true`. Both raw SDK and convenience
SDK send paths must preserve that distinction and their existing deduplication.
Ingress uses the corresponding topic versus ordinary reply-chain distinction.

A final route is captured with its incoming task and then durably reserved
before enqueueing. Reconciliation/retry preserves an existing outbox target
and operation identity when configuration changes. A new policy affects new
work; it cannot retarget a possibly sent message or create a second delivery.

The inherited v1 read method projects only the frozen v1 policy fields.
An older v1 configuration form edits those fields while preserving v2 reply
settings; it cannot erase them on save. These compatibility paths do not claim
that a v1 consumer can inspect or configure reply modes.
