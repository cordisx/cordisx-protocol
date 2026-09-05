# Agent Loop v1, v2, v3, and v4

Protocol maturity: v4 additive candidate. Versions 1, 2, and 3 remain
immutable. Version 1 is the formal legacy Host-bound, room-neutral contract.
Version 2 adds durable delivery, canonical task-details URLs, and operation
causation without changing v1. All versions define data contracts only; none
defines Chatroom, UI, DOM, workspace resolution, external channels, provider
transport, credentials, or a new permission system.

Version 3 preserves the complete v2 create/bind/send/event surface and adds one
durable approval-decision operation. It does not change the frozen v1 or v2
schemas and declarations.

Version 4 preserves the complete v3 surface except for corrected approval
decision tokens, one approval binding-closure outcome, and required structured
causation on accepted approval and request/cancel member-self-introduction
results. It does not change the frozen v1, v2, or v3 schemas and declarations.

Merge, publication, Host adoption, and live verification are recorded separately
from protocol maturity. See the [dated adoption notes](../../maintainers/adoption-notes.md).

## Definition and inheritance

`agent-definition/v1` identifies an immutable definition by
`(agentId, revision)`. A definition may extend ordered parent identities and
provides explicit inheritance modes for prompt sections, rules, skills, tool
filters, MCP-server filters, runtime defaults, and an optional avatar ref.
Prompt sections directly include `introduction`, `personality`, and `memory`
for OneWorks-style consumption, together with bounded general-purpose section
kinds.

A definition may carry an explicit `AgentAvatarRef` and an optional
`inherit.avatar` mode. Avatar resolution follows `agent-avatar/v1`: a child
explicit ref wins; only an explicit non-generated parent ref may cross the
inheritance boundary; otherwise the avatar is generated from the child
`agentId`. A parent's generated seed is never inherited.

`create-or-bind` is self-contained. It carries the leaf `definition` identity
and a bounded `definitions` catalog containing exactly the leaf and every
transitive ancestor. The Host must reject a missing parent, duplicate identity,
cycle, self-extension, or unreachable extra definition. It does not consult an
implicit registry and does not create an Agent Loop merely to obtain a parent
definition.

Resolution is deterministic:

1. Resolve each parent's own ancestry recursively.
2. Fold multiple resolved parents from left to right using `merge` for every
   field.
3. Apply the child using the child's field-specific `inherit` mode.

For ordered prompt/rule/skill fields, `append` is inherited then local,
`prepend` is local then inherited, `merge` replaces an inherited item with the
same identity in place and appends new local identities, `replace` uses the
local field when present and otherwise retains the inherited field, and `none`
uses only the local field. Prompt identity is `sectionId`; rule and skill
identity is their string id. `append` and `prepend` reject duplicate effective
identities.

For tool and MCP filters, `merge` unions `include` and `exclude` in inherited
then local order with duplicates removed; `exclude` wins when applying the
effective filter. For runtime defaults, `merge` is a shallow field merge with
local values winning. `replace` and `none` have the same presence semantics as
the ordered fields. Object fields accept only `merge`, `replace`, or `none`.

## Binding and operations

All four task-binding versions bind one exact definition identity to one opaque
Host task handle under a generation-fenced binding id. `create-or-bind` either
creates a new task or binds the definition to an explicitly supplied opaque
task handle. `send` requires the exact active binding. A closed or replaced
binding is not reusable. Serialized binding contents are correlation data, not
authority: the Host validates every call against its private current binding
registry and rejects unknown, replaced, closed, or cross-task tuples.

The Host injects one fiber-owned `BoundAgentLoopClient`. V1 and v2 expose only
`createOrBind`, `send`, `subscribe`, and `dispose`; v3 and v4 add
`decideApproval`, `requestMemberSelfIntroduction`, and
`cancelMemberSelfIntroduction`. Calls and results reuse the existing
authorization-outcome shape. V1/v2 use `tasks.create`, `tasks.content.read`,
and `turns.submit`; v3 adds the closed `approvals.decide` capability for its
decision operation. The contract defines no grant or policy system, carries no
authorization token, and cannot escalate a denied or unavailable result.

The Host resolves `cwd` and any workspace/config root privately before task
creation. No workspace alias, path, cwd, or configuration root is an Agent Loop
field.

### Multiplexing and version compatibility

One `BoundAgentLoopClient` may own multiple active bindings for different
definitions or tasks. A consumer fans one input out by issuing one `send` per
exact binding, with a distinct `commandId` for each binding. Operations on one
binding do not serialize or advance another binding.

Version 1 scopes `commandId` idempotency to one bound-client lifetime and
retains the ledger only until `dispose`. It has no task-details URL, delivery
disposition, event causation, or durable cross-client replay fields. Existing
v1 consumers and providers continue to use those exact schemas and types.

### Version 2 durable command delivery

In v2, `commandId` is the consumer-persisted `AgentLoopOperationId`, not a
bound-client-lifetime correlation token. The owning provider records the
complete command and result before exposing the result.
Concurrent or later structurally identical submissions with the same operation
id coalesce to one logical operation across client disposal and recreation.
The consumer persists the planned `commandId` and complete exact payload before
its first call. If delivery becomes unknown, it resubmits that same payload
under the same id. A typed failure is surfaced for attention; the consumer must
not silently allocate a new id and risk duplicate execution.

The bound-client descriptor freezes the ledger contract as
`operationId: commandId`, `scope: owner-provider`, generation-fenced provider
affinity, structural-exact payload matching, survival across client disposal,
and retention for the active logical-task lifetime plus a 30-day recovery
window. The Host privately maintains the
`(owner, operationId) -> original provider identity/generation` affinity fence;
no provider identity is added to the public command. Provider replacement must
never cause the new provider to execute an operation owned by the old provider.

For an operation that accepted a binding, active retention lasts for the whole
logical-task lifetime and the 30-day recovery window begins at the
provider-private `closedAt`. If no accepted binding outcome exists, the window
begins at the provider-private `firstObservedAt`. Neither timestamp is supplied
or controlled by the consumer. After the guarantee window, the provider may
discard the full payload and result and may retain a compact expiry marker for
at most 32 days from first observation or closure. While that bounded marker
remains, an exact retry returns `operation-expired`
and is not executed. The contract does not require an unbounded tombstone;
consumers never reuse a `commandId` and stop automatic retry after the recovery
window.

An accepted create-or-bind or send result carries a `delivery.disposition` of
`executed`, `replayed`, or `reconciled`. A replay returns the recorded accepted
identity. A reconciled create-or-bind may return the current binding generation
and canonical details URL for the same logical task. A replayed or reconciled
send preserves the original `messageId` and `turn`; it never submits a second
turn.

Reusing an operation id for a non-identical complete payload returns typed
`operation-conflict` before task creation, binding, or message submission.
Other allowed-authorization resource outcomes are
`reconciliation-required`, `operation-expired`, and `provider-replaced`;
create-or-bind additionally permits `details-unavailable`. These are not
authorization outcomes and do not extend the permission system. A consumer
that intentionally starts a new operation chooses a new `commandId`.

One client may hold multiple subscriptions concurrently. Each subscription is
scoped to its exact `(bindingId, generation)`, and its `afterSequence`,
`snapshotSequence`, replay/live phase, and unsubscribe lifetime are independent.
The same `bindingId` at a different generation is a different event stream.
Unsubscribing one handle does not affect sibling handles; client `dispose`
terminates all of them.

### Accepted task details URL

Every accepted `create-or-bind`, including an explicit bind, returns the exact
binding and a direct `detailsUrl`. The consumer persists that pair together.
When a new binding generation is accepted, its pair atomically replaces the
old generation and URL; `send` continues to carry only the binding.

The Host must obtain the URL before returning accepted. If the provider cannot
supply one, `create-or-bind` returns unavailable with `details-unavailable` and
the allowed authorization outcome for create or bind. This resource failure is
not a new permission outcome, and no partially accepted binding is exposed.

The v2 details URL has a maximum length of 2048 characters and pairs its target
with a closed scheme set: `host` requires `app:`, while `external` permits only
`https:`, `codex:`, or `claude:`. Version 2 rejects `file:`, `data:`,
`javascript:`, `blob:`, and `http:`.

Producers emit one absolute canonical URL: lower-case scheme and host,
normalized default port and dot segments, uppercase hexadecimal percent
escapes, and no percent encoding for unreserved characters. User information,
query, fragment, whitespace, C0/DEL controls, and backslashes are forbidden.
The URL is location metadata and does not grant authority. Agent Loop defines no
navigation operation.

## Content and proactive events

Commands and message events carry ordered `text` or opaque `image-ref` content
parts. An image reference contains only `ref`, an `image/*` media type, and
optional alt text; it never contains a URL, path, base64 data, blob, callback,
or raw bridge value.

The frozen `agent-conversation-shell/v1` contract is text-only. An `image-ref`
that cannot be rendered must produce an explicit unsupported result or a clear
attachment placeholder. It must not be discarded, converted to a local path or
base64 payload, or reported as rendered.

Both event versions proactively report ordered message, approval, and lifecycle
facts for one exact binding generation. A v2 event may carry
`causation.operationId`, whose value is the originating command's `commandId`;
it is correlation data, not authority. Approval events are observations of the
existing Host/runtime approval state; they do not grant authority. Pages replay
through a fixed snapshot sequence before live events. `binding.closed` is
terminal, subscription unsubscribe is explicit, and owner disposal terminates
the stream.

## V3 approval decisions

An `approval-decision` command carries a durable `commandId`, the full v3 task
binding including its exact binding generation, the exact `turn` and
`approvalId`, and one closed `approve`, `deny`, or `cancel` decision. It uses
the existing authorization outcome with capability `approvals.decide`; it does
not create a new permission system. `BoundAgentLoopClient.decideApproval` has
no renderer or navigation side effect.

An accepted result echoes the exact binding, turn, approval identity, and
decision with `executed`, `replayed`, or `reconciled` delivery. The durable
owner-provider ledger uses structural-exact payload matching, survives client
disposal, remains provider-generation-fenced, and retains active logical-task
operations plus the same 30-day recovery period as v2. Replaying the exact
operation returns the original logical result and does not decide twice.

Conflict status is distinct from unavailability. `operation-conflict` means the
same command id was reused with a different payload; `binding-conflict` means
the binding id or generation is stale/wrong; `approval-conflict` means the
turn/approval identity does not match or the approval has already resolved to a
different decision. All fail before a new provider decision. Allowed-
authorization unavailability is one of `reconciliation-required`,
`operation-expired`, `provider-replaced`, `approval-expired`, or
`approval-unavailable`. Authorization-state unavailability remains the
existing Host/task/unsupported result branch, and denial remains user/policy.

For exact correlation, v3 approval events resolved as `approved`, `denied`, or
`cancelled` require `causation.operationId` matching the accepted durable
command. Provider-autonomous `expired` events may omit causation. The provider
owns approval semantics and terminal resolution; consumers must not infer an
outcome from UI state or command text.

## V3 member self-introduction

`request-member-self-introduction` is a durable intent, not a message template.
It carries `commandId`, the full exact v3 task binding, `participantId`,
`memberId`, `runId`, and exactly
`{ kind: 'member-self-introduction', audience: 'room', output:
'assistant-message' }`. It contains no text, content, prompt, body, model,
provider option, deterministic/canned response, fake reply, or consumer time.
In particular, v3 never accepts `issuedAt`; ledger retention is based only on
provider-private observation and task lifecycle.

On first accepted execution, the owning Host/provider resolves the binding's
exact immutable Agent definition and effective identity, introduction,
personality, role, and capabilities, then generates one real free-form
assistant turn. It must not substitute configured/canned text, a preview, or a
consumer-authored fake reply. Triggering the intent creates no visible user
message item; the first visible content for this operation is the generated
assistant message event.

The matching `cancel-member-self-introduction` is a separate durable operation
with its own `commandId`, the same exact binding/member/run association, and the
original `requestOperationId`. It contains no callback, `AbortSignal`, or
client-lifetime cancellation object. Both operations use the existing
authorization shape with closed capability `turns.introduce`.

An accepted request returns the full binding and association plus stable
`turn`, `messageId`, and delivery. An accepted cancel additionally echoes the
original `requestOperationId` and returns that same turn/message identity.
Exact replay/reconciliation returns the original logical result and never
starts or cancels a second introduction. Conflicts distinguish operation-id,
binding, member, run, and introduction state, including already completed or
cancelled work. Allowed-authorization unavailability distinguishes
reconciliation/operation expiry/provider replacement from introduction expiry,
unavailability, or not-found; denial and authorization-state unavailability
remain the existing outcomes.

Every v3 message event declares `message.purpose`. Normal messages use
`conversation`. A `member-self-introduction` message must be assistant-authored
and carries the exact accepted `turn`, `messageId`, and
`causation.operationId`. A `turn.cancelled` lifecycle event requires the same
turn and cancel-operation causation. Content remains provider-authored normal
AgentLoop content; the Protocol does not manufacture or prescribe its wording.

## V4 approval correction and accepted causation

V4 approval decision values are terminal-state facts: `approved`, `denied`, or
`cancelled`. The imperative v3 spellings are invalid in v4. The command still
carries only the full exact binding, turn, approval identity, and decision; it
does not carry an approval kind. The provider resolves that tuple to one exact
currently pending approval and its stored kind cannot drift between decision,
accepted result, and resolved event. If the exact binding has already closed,
an allowed authorization returns unavailable with `binding-closed` before any
decision is applied.

Approval and member-self-introduction operations compare the full supplied
task binding with the authoritative binding before any side effect. If that
authoritative exact binding is closed, the allowed-authorization outcome is
unavailable with `binding-closed`. Otherwise any drift in task, definition,
state, binding id, or generation is `binding-conflict`; no approval decision,
introduction turn, retry, or cancellation is applied.

An accepted `approval-decision` result requires
`causation: { operationId }`, where `operationId` exactly equals that result's
top-level `commandId`. An accepted
`request-member-self-introduction` result additionally requires
`causation: { operationId }`, where `operationId` exactly equals that result's
top-level `commandId`. The same rule applies to an accepted
`cancel-member-self-introduction` result: its causation identifies the cancel
command itself, while `requestOperationId` continues to identify the original
request being cancelled. This keeps request acceptance, cancel acceptance,
assistant-message events, and cancellation lifecycle events explicitly
correlatable without adding consumer time, prompt, body, model, or response.

Result causation is forbidden on every non-accepted outcome and on accepted
create/bind and send results. Exact replay or reconciliation returns the
original stable causation and associated identities and cannot apply a second
approval decision or create a second introduction.

## Consumer entry points

- TypeScript: legacy `@cordisx/protocol/agent-loop/v1`; additive
  `@cordisx/protocol/agent-loop/v2`; approval-capable
  `@cordisx/protocol/agent-loop/v3`; corrected accepted-causation successor
  `@cordisx/protocol/agent-loop/v4`
- V1 schemas: `agent-definition.v1` plus the unchanged `agent-loop-*.v1`
  family
- V2 schemas: `agent-definition.v1`, `agent-loop-task-binding.v2`,
  `agent-loop-command.v2`, `agent-loop-result.v2`, `agent-loop-event.v2`,
  `agent-loop-event-subscription.v2`, `agent-loop-event-page.v2`,
  `agent-loop-task-details-common.v2`, and `agent-loop-bound-client.v2`
- V3 schemas: `agent-definition.v1`, the complete `agent-loop-*.v3` family,
  and the unchanged `agent-loop-task-details-common.v2` URL definition
- V4 schemas: `agent-definition.v1`, the complete `agent-loop-*.v4` family,
  and the unchanged `agent-loop-task-details-common.v2` URL definition
- Conformance: `node conformance/agent-loop.mjs` and
  `node conformance/agent-loop-v2.mjs`; v3 adds
  `node conformance/agent-loop-v3.mjs`; v4 adds
  `node conformance/agent-loop-v4.mjs`

Schemas, vectors, and local conformance do not prove Host wiring, Chatroom
consumption, production renderer behavior, publication, or API readiness.
