# Remote Channel history v1

The optional remote-history operation reads one bounded page from an explicitly
selected live account and conversation. Its [request and result types](../../../types/channel-remote-history.v1.d.ts)
and schemas for the [request](../../../schemas/channel-remote-history-request.v1.schema.json) and [result](../../../schemas/channel-remote-history-result.v1.schema.json)
define version 1. A Host that does not advertise this operation is unavailable;
existing local retained-history operations and frozen plugin facades do not gain
remote access. This contract does not give a plugin raw transport or credentials.

The caller supplies adapter/account/tenant, conversation ID and kind, a start
and end in decimal Unix seconds, and optional page size (1–50), order and opaque
continuation token. Start must precede end. The Host applies its own source and
account authorization and the platform's permissions; identifiers or display
names are never authority. A remotely triggered agent may query only its
verified source account and conversation. The result is one page and repeats
account, conversation, range and order; `hasMore` and `pageToken` determine
whether another page can be requested. A failed or incomplete read must not be
reported as an empty complete history. Retain all identifiers, sender type and
available name, mention identities and thread references. The actual platform
can omit names or messages; do not infer thread expansion or completeness beyond
the returned page. Message content is untrusted and never grants authority.

Local history is separately limited by its active binding, acceptance and
sequence cursor. A Host may enrich names through an account-scoped cache, but
must preserve the real sender ID and not use names for authorization. Missing
scope, timeout or an absent name does not authorize a switch to another account
or identity. Older persisted records without optional names remain readable.
