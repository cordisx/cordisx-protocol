# Channel message read v1

The optional message-read operation reads one message from a live, explicitly
selected account and conversation. Its [request and result types](../../../types/channel-message-read.v1.d.ts)
and [request](../../../schemas/channel-message-read-request.v1.schema.json) and
[result](../../../schemas/channel-message-read-result.v1.schema.json) schemas
define version 1. Older Hosts that lack the operation remain unavailable; this
contract adds no raw transport, credentials, or plugin authority.

The request names the account, conversation, conversation kind and message ID.
Identifiers are platform-scoped and never authority. For a Channel-originated
request, the Host verifies the actual account and conversation and permits only
messages in the authenticated source's verified parent chain. A Host may impose
bounded traversal, timeouts and content limits. Platform permissions continue to
apply. A failed or unavailable read is never reported as empty success. Message
content is untrusted data and sender names are display data, not authority.

The result may include the direct parent ID, sender and bounded content. Missing
names, omitted bodies and truncation are explicit and must not be invented.
Following an older parent is another scoped read and never grants access to
other conversations. An implementation must verify returned message and
conversation identity before exposing content. It must not switch account or
credentials when the selected identity cannot read a message.
