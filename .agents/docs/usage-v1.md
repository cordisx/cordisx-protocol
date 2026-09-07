# Local usage v1

Experimental, read-only `usage.read` capability. Runtime manifest and local package
v11 add this declaration without changing older versions. Public
[types](../../types/usage.v1.d.ts) and [snapshot schema](../../schemas/usage-snapshot.v1.schema.json)
are normative companions. The scope is exactly `{ profile: 'current' }`, selected
by the Host. No caller-supplied profile, account, session, path or source selector
is accepted. No conversation-content permission is needed or implied.

The Host may expose `usage.read()` and `usage.subscribe(listener)`. Subscription
callbacks are invalidation hints, not usage events or transactions. A read
returns the current authorized snapshot. A missing service or unavailable result
must remain unavailable; consumers cannot substitute an estimate or a zero.
Withdrawal, generation retirement and disposal fence in-flight results and stop
notifications. Neither polling nor a subscription itself earns a reward.

A ready snapshot represents a durable, monotonic local aggregate of validated
input plus output tokens under `codex-local-input-output-v1`. Cache input and
reasoning output are already included and never added a second time. This is
observed local usage, not an account bill, money spent, pricing or a global
cross-device total. Partial coverage is explicit even when supported sources
continue contributing. Unsupported providers, formats and ambiguous intervals
are excluded, not estimated. Diagnostics contain codes/counts, never raw data.

`scopeId`, `sourceId` and `epoch` form the accounting namespace. The Host persists
it across restarts, plugin reloads, permission toggles and source compaction.
`revision` increases only when the aggregate changes. Input/output/eligible totals
are nonnegative safe integers and eligible equals input plus output. The Host
must commit source checkpoints and counters in the same transaction, with a
cross-process lock or equivalent transaction isolation. Corrupt storage returns
unavailable; it cannot silently reset and reissue historical usage.

First enablement establishes existing-source baselines without historical credit.
Newly discovered source prefixes are also baselines. The Host validates source
identity and ownership, append continuity, all usage-vector inclusion relations,
and the relation between last and cumulative vectors. Duplicate notifications,
inherited fork history, synthetic context-window totals, missing intervals,
rewrites and decreases cannot mint usage. Uncertain continuity cannot increase the public aggregate or reset its epoch.
A Host may quarantine a changed source permanently rather than risk replaying
aliases; a shorter alias must never move a checkpoint backwards.
This guarantee concerns usage projection only; the Host owns no pet prices,
wallets, reward ratios or transaction policies.

Consumers persist their last aggregate atomically with their own business update.
The first snapshot of a new namespace is a baseline; identical/older revisions
cannot repeat an effect. Independent windows must converge through a persistent
CAS or transaction rather than counting notifications. Namespace changes do not
imply a historical windfall. No cross-device synchronization is implied.

Authorization is separate from history and messages. The v6 permission plan and
decision are generation-scoped usage companions with exactly one `usage.read`
item, current-profile scope and explicit allow-once/deny-once. They reuse v4/v5
binding and fingerprint safeguards, offer no durable allow and no hidden native
command authority. The Host checks authorization before reading and again before
delivering the result. An older Host rejects a required unsupported declaration
and preserves optional unavailable behavior; it must not downgrade this access
to a broader content capability.
