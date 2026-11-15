# Channel conversation policy v1

The explicit [reply-policy v2 successor](reply-routing-v2.md) adds scoped
reply modes and Agent choice. Its Manager v6 methods preserve this v1 shape.

The explicit [`channel-manager/v4`](../../../types/channel-manager.v4.d.ts)
successor adds `conversationPolicy(signal)` and
`configureConversationPolicy(signal)`. All inherited Manager snapshots,
operations, opaque targets and subscriptions retain their frozen shapes.
Older Hosts lack these methods; consumers must show an unavailable state.
`connectionConfiguration(connectionToken, signal)` reads only the display label and
reception selectors for the opaque connection in the current profile. It requires
`channel.accounts.read` and includes the current Manager revision. Selectors may be
saved with the inherited revision-fenced `connection.update` request; secret fields
and account identifiers are not projected.

The Host owns policy storage, forms, revisions and native task delivery.
Channel owns connection transport. This policy is separate from the
transport-only [service configuration](config-v2.md). It contains no account
credential, filesystem path or native runtime authority.

`conversationPolicy` and opening its Host-owned configuration surface require
`channel.bindings.read`. Saving is an explicit Host form action for that profile,
not a delegated `channel.bindings.write` operation. The caller's profile,
module generation, explicit denial and abort lifetime remain authoritative.
Cancel closes the surface without a write. Save compares the policy revision;
incoming messages and task receipts do not advance that revision. An actual
commit is reported as applied even if its originating page has closed; a stale
page cannot publish the result into its replacement. Cancellation never
rolls back a committed policy.

The [policy schema](../../../schemas/channel-conversation-policy.v1.schema.json)
defines the configuration shape. Scope fields are exact adapter, account,
tenant and conversation identifiers. Absent fields mean all at that dimension.
Within a rule, kind, user, user group and command predicates intersect. Matching
denials win. For each applicable scope, allow rules form a union; the global and
narrower scope buckets intersect. A command-specific bucket affects only those
commands. Unlisted write commands default to denied; status commands are
read-only. Group membership is source-qualified, never a cross-tenant identity.

`groupReception: all` retains unaddressed group messages for listening and
retrieval; it does not automatically reply. `mentions` accepts group messages containing an actual @ mention of the configured bot.
Prefix-only group wakeups require `all` reception. Direct messages, actual mentions and matching
wake prefixes can trigger task delivery subject to policy. The most specific
platform/account/conversation prefix set wins. A prefix cannot bypass platform
permissions or a receive selector that excludes the event.

Bindings may be one-to-one, one-to-many or many-to-many without a count cap.
An execution concurrency budget must not silently reject further bindings.
Listening retains input from the binding's creation cursor. Delivery queues a
native turn while the target is busy and does not interrupt a healthy turn.
Unbinding preserves chat/history and cancels pending delivery; it does not
terminate an already running native turn. Final replies require an active
auto-reply binding and send policy. Reconciliation must never blindly repeat an
uncertain native effect or outbound send.

The inherited v3/v4 snapshots retain their 10,000-item wire budget. This is
a readback budget, never a cap on persistent bindings; CLI binding-status
reads the Host consumer directly. Older snapshot consumers do not establish
complete cardinality beyond that budget.
V4 `bindingPage({ connectionToken, afterCursor?, limit? }, signal)` requires
`channel.bindings.read` and returns at most 100 bindings (default 50), their total
count, current snapshot revision and an optional opaque next cursor. The cursor is
bound to this Host generation, connection and snapshot revision. A changed snapshot
rejects an old cursor; consumers refresh the first page. A missing next cursor marks
the end of that revision's readback. Reading does not mutate bindings or revisions.

Credential-entry authority is separate from policy configuration. Host checks
declared account-read authority before opening a new credential form and the
[exact connect decision](../platform-capabilities/channel-exact-request-v16.md)
for its private account before any credential or connection effect;
local-development defaults remain generation-bound and cannot override a
user denial. Incoming channel text cannot authorize a Host policy mutation.
