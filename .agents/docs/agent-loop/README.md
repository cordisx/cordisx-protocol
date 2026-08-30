# Agent Loop v1

Status: local additive Protocol candidate for a Host-bound, room-neutral Agent
Loop. It defines data contracts only. It does not define Chatroom, UI, DOM,
workspace resolution, external channels, provider transport, credentials, or a
new permission system.

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

`agent-loop-task-binding/v1` binds one exact definition identity to one opaque
Host task handle under a generation-fenced binding id. `create-or-bind` either
creates a new task or binds the definition to an explicitly supplied opaque
task handle. `send` requires the exact active binding. A closed or replaced
binding is not reusable. Serialized binding contents are correlation data, not
authority: the Host validates every call against its private current binding
registry and rejects unknown, replaced, closed, or cross-task tuples.

The Host injects one fiber-owned `BoundAgentLoopClient` with only
`createOrBind`, `send`, `subscribe`, and `dispose`. Calls and results reuse the
existing `tasks.create`, `tasks.content.read`, and `turns.submit` permission
outcomes. The contract defines no grant, token, policy, approval authority, or
security escalation. A denied or unavailable existing permission remains a
typed denied or unavailable result.

The Host resolves `cwd` and any workspace/config root privately before task
creation. No workspace alias, path, cwd, or configuration root is an Agent Loop
field.

### Multiplexing and command idempotency

One `BoundAgentLoopClient` may own multiple active bindings for different
definitions or tasks. A consumer fans one input out by issuing one `send` per
exact binding, with a distinct `commandId` for each binding. Operations on one
binding do not serialize or advance another binding.

Within one bound-client lifetime, `commandId` is an idempotency key as well as
a correlation key. The Host records the first complete command and its result
before exposing the result. Concurrent or later structurally identical submissions
with the same `commandId` coalesce to that one execution and return the same
result, including the same accepted binding or `messageId`. This applies to
accepted, denied, and unavailable results. A consumer that intentionally retries
after a denied or unavailable result uses a new `commandId`.

Reusing a `commandId` for any non-identical command is invalid. The Host rejects
it before task creation, binding, or message submission; it does not reinterpret
the existing authorization result as authority for the different command. The
idempotency ledger is scoped to the exact injected client and is retained until
`dispose`; identifiers from different bound clients do not share a ledger.

One client may hold multiple subscriptions concurrently. Each subscription is
scoped to its exact `(bindingId, generation)`, and its `afterSequence`,
`snapshotSequence`, replay/live phase, and unsubscribe lifetime are independent.
The same `bindingId` at a different generation is a different event stream.
Unsubscribing one handle does not affect sibling handles; client `dispose`
terminates all of them.

## Content and proactive events

Commands and message events carry ordered `text` or opaque `image-ref` content
parts. An image reference contains only `ref`, an `image/*` media type, and
optional alt text; it never contains a URL, path, base64 data, blob, callback,
or raw bridge value.

The current `agent-conversation-shell/v1` remains text-only. For this first
checkpoint, Host/Chatroom may project text parts end to end. An `image-ref`
that cannot be rendered must produce an explicit unsupported result or a clear
attachment placeholder. It must not be discarded, converted to a local path or
base64 payload, or reported as rendered.

`agent-loop-event/v1` proactively reports ordered message, approval, and
lifecycle facts for one exact binding generation. Approval events are
observations of the existing Host/runtime approval state; they do not grant authority. Pages replay
through a fixed snapshot sequence before live events. `binding.closed` is
terminal, subscription unsubscribe is explicit, and owner disposal terminates
the stream.

## Consumer entry points

- TypeScript: `@cordisx/protocol/agent-loop/v1`
- Schemas: `agent-definition.v1`, `agent-loop-task-binding.v1`,
  `agent-loop-command.v1`, `agent-loop-result.v1`, `agent-loop-event.v1`,
  `agent-loop-event-subscription.v1`, `agent-loop-event-page.v1`, and
  `agent-loop-bound-client.v1`
- Conformance: `node conformance/agent-loop.mjs`

Schemas, vectors, and local conformance do not prove Host wiring, Chatroom
consumption, production renderer behavior, publication, or API readiness.
