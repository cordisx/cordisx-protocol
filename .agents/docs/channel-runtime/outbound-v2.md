# Channel outbound v2 and runtime v3

Status: normative successor; does not establish Host adoption. All outbound v1
and runtime v1/v2 declarations and schemas remain frozen. Runtime v3 adds
`outboundV2`; it does not replace `outbound` or broaden `adaptersV2`.
Feature-detect the new capability. Never send v2 documents to a v1 service.

## Blocks and inline nodes

V2 preserves every v1 content descriptor and bound. Richtext has 1..128 blocks.
Legacy `{text,style}` blocks each form one separate line, including code blocks.
A new `{type:"paragraph",nodes:[...]}` block forms one line containing 1..128
ordered inline nodes without implicit separators or line breaks between nodes.
Text nodes are `{type:"text",text,style}` with 1..4096 Unicode scalar values and
plain/strong/emphasis style. Code remains a legacy block, not an inline node.
Mention nodes are exactly `{type:"mention",userId}`. An inline mention followed
by a text node must render a native mention immediately followed by that text;
the Host must not substitute a guessed display name. Newlines inside literal
text retain their literal meaning. No additional layout or Markdown parsing.
The complete UTF-8 request remains bounded at 196,608 bytes.

## Identity, permissions and capability negotiation

`userId` is a nonempty platform-native user identifier of at most 256 ASCII
letters, digits, underscores or hyphens. It is not a name, URL, wildcard or
caller assertion of verification. Reserved `all`, `everyone`, `here` are
invalid, case-insensitively. This version never grants a broadcast mention.
Identity encoding must match the installed platform's native mention ID type.

The Host verifies every mention using authenticated, accepted inbound sender
evidence or already-authorized identity/member reads for the exact target
adapter/account/tenant/conversation and current connection generation. A
matching ID prefix is not verification; a direct-chat ID does not prove a user
identity. Cross-target, stale-generation, fabricated or unverified identities
fail closed with `CHANNEL_MENTION_UNVERIFIED`. Verification must not introduce
directory permissions, change send permissions or consult names to guess IDs.
Recheck before queue acceptance and adapter dispatch; validate the whole batch
before its first effect. No authorization is derived from mentioning a user.

Capabilities v2 adds required `richtext:{paragraphs,mentions}` flags. Both require
richtext in `types`; mentions additionally requires paragraphs. Richtext v1
support alone implies neither. A Host may report mentions supported yet reject
an individual unverified user. V1 adapters must not receive v2 content.

Unsupported paragraph/mention structure rejects with
`CHANNEL_OUTBOUND_UNSUPPORTED`, or uses the caller's explicit text fallback if
text is supported. Never strip a mention or silently collapse a paragraph to
legacy blocks. Invalid identity or permission failures never trigger fallback,
even on a target lacking native mention support. Receipt v1 is reused unchanged:
requestedType remains richtext and effectiveType becomes text only for explicit
unsupported-content fallback. Media preparation and its scoped authority remain
v1. Idempotency includes the original node sequence and user IDs; retries never
change identities or broaden authority.

## Compatibility

- V1 callers and adapters retain their exact documents and block line breaks.
- V2 callers without new nodes can use v1 explicitly, not an implicit rewrite.
- V2 paragraphs require the paragraphs flag; mention nodes require both flags
  and verified identity evidence. Missing flags mean unsupported.
- Runtime v3 retains v2 services; its new outboundV2 accepts only v2 sends.
- A Host lacking current verified evidence honestly rejects mention sends.

Schemas: [send v2](../../../schemas/channel-message-send.v2.schema.json) and
[capabilities v2](../../../schemas/channel-outbound-capabilities.v2.schema.json).
Types: [outbound v2](../../../types/channel-outbound.v2.d.ts),
[runtime v3](../../../types/channel-runtime.v3.d.ts).
