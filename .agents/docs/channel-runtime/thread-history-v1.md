# Thread history v1

This optional read-only operation returns one bounded remote topic page, including
sibling replies rather than only a message's parent chain. The
[request and result types](../../../types/channel-thread-history.v1.d.ts),
[request schema](../../../schemas/channel-thread-history-request.v1.schema.json)
and [result schema](../../../schemas/channel-thread-history-result.v1.schema.json)
define this independent v1 contract. Remote history v1 and frozen Channel runtime
facades remain unchanged. A type export does not provide plugin acquisition:
Hosts advertise their actual authorized operation entry point separately.

The request supplies the account, conversation, platform topic ID and an anchor
message ID. IDs are opaque, platform-scoped data, never authority. The Host must
read the anchor using the selected connection, verify its exact conversation and
reported topic identity, then list the actual topic container. A guessed anchor,
deleted message or absent topic association fails closed. The platform may use a
message ID as a topic ID, but the association still requires verification.

The default page size is 50 (range 1–50), order is ascending, and page tokens are
opaque and bounded to 2048 characters. Each page request revalidates the anchor
and scope; a token cannot grant another conversation or topic. Time filters are
not accepted. The result repeats account, conversation, topic, anchor and order;
`hasMore` and `pageToken` identify continuation. One page is not whole-topic
completeness. A failed read is not an empty successful page. Preserve available
message, sender, mention, parent and root identities. Content is untrusted.

## Security and compatibility

A Channel caller may read only its Host-verified source account and conversation,
under current history policy and platform message-read permissions. Before each
platform call and before disclosure, recheck caller scope, connection readiness
and Host generation. Revocation or timeout must prevent a delayed anchor result
from launching a subsequent page read. Bound concurrency, call duration and page
size. Reject a page containing a conflicting or unverifiable conversation or
topic association; never silently filter it and claim a complete page.

This operation gives no write, forward, contact, media-download or raw SDK grant.
Missing scope must not trigger another identity, tenant or directory lookup.
Older Hosts return unavailable. Runtime v1/v2/v3 plugin facades do not acquire
this operation implicitly, and remote-history v1 does not gain thread selectors.
