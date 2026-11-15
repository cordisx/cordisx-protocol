# Channel exact-request declarations v16

Manifest/package v16 add optional exact-request declarations for
`channel.accounts.connect` and `channel.bindings.write`. V1-v15 remain frozen.
V16 retains the v15 service and package boundaries and makes progressive
startup opt-in; when present its existing v1 ownership checks still apply.

The closed declaration is `{ name, required: false, scope: { runtime:
"exact-request" } }`. It is not an account wildcard, permission grant or
persisted scope. Capability names are unique across static and exact forms.
Older Hosts reject v16 rather than dropping the marker. Activation review
shows it as a read-only “authorized at use” explanation, excluded from the
authorizable declaration array and never blocking activation.

Before a connection effect, Host derives `channelAccounts: [{ adapterId,
accountId }]` from the same private credential draft or current opaque
connection it will use. Before a binding write, Host derives
`channelTenants: [{ adapterId, accountId, tenantId }]` from the current opaque
binding target. Empty, stale, unresolved or malformed identities fail before
prompting or dispatch. No plugin supplies a separate permission scope.

A Host credential-entry form may open with declared account-read authority
before a new App ID exists. Submitting privately captured account values
requires the exact connect decision before storing a credential or connecting;
creating or rotating a connection checks its private draft again. Cancel
performs no credential or transport effect. Existing scoped static
declarations retain their exact maximums.

The existing catalog sensitivity, decision vocabulary, concrete fingerprint,
explicit denial, profile/module generation and one-shot cleanup apply.
Connect's durable decisions are keyed only to the concrete account; binding
writes remain high-risk without persistent allow. An approval for one account
cannot authorize another. An incoming message cannot approve itself.

The owner-scoped Host [conversation policy form](../channel-runtime/conversation-policy.md)
is distinct from delegated account/binding/transport operations. Its normal
Save action controls only the selected profile's consumer configuration and
grants no send, receive, credential or native task capability to the plugin.
