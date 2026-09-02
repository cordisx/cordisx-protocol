# Agent and Session runtime v1

This specification freezes the CordisX public Agent/Session Runtime around one
Agent Registry, live Agent handles, and one append-only SessionEvent truth.
CordisX adds only the asynchronous and permission projections required by an
out-of-process Host; it does not define a parallel runtime model.

## Public services and ownership

The Host injects three public services:

- `ctx.agents: AgentRegistry` with `create`, `resume`, and `get`;
- `ctx.sessions: SessionRegistry` with `get`;
- `ctx.approvals: ApprovalService`, scoped to an exact live Agent.

`ctx.agentLoop`, append authority, transport request ids, connection bindings,
and transport payloads are not public contracts. The Host owns one internal
Agent/Session Runtime authority; there is no public Agent Loop or Agent
Events/history aggregation service and no environment-selectable runtime type.

`create` without a `sessionId` delegates minting to the Host. A caller-supplied
id requires create authority and never silently resumes an existing Session.
`resume` requires a Session id. For two concurrent first resumes, exactly one
mutation publishes the live Agent. The same plugin owner generation retrying
the same `mutationId` receives `disposition: 'replayed'`; any distinct mutation
receives `conflict/agent-already-live`. Create similarly returns typed
`session-already-exists`, `agent-already-live`, `setup-conflict`, or
`mutation-conflict` outcomes.

Accepted create/resume returns an unforgeable `AgentHandle`. It is bound to the
creating `PluginOwnerIdentity` and exact Agent generation, cannot be serialized
or rebuilt from `AgentId`/`SessionId`, and fails closed after plugin reload,
Agent replacement, connection replacement, or permission revocation. `get`
returns only a permission-filtered bare `Agent` and never upgrades the caller to
dispose authority. `Agent.session` is the same exact Session identity and
generation returned by `ctx.sessions.get` for that binding.

## Setup and live Agent semantics

`AgentSetup` is business-neutral. It names a root `AgentDefinitionIdentity` and
supplies its complete definition catalog. The Host runtime authority validates
the acyclic inheritance graph and combines prompt sections, rules, skills,
tool filters, MCP server filters, avatar inheritance, and runtime defaults
according to each definition's explicit inheritance modes. Domain intents such
as Chatroom self-introduction are ordinary identified `UserMessage` values,
not generic Agent commands.

`send`, `followup`, `steer`, and `inject` accept a complete `UserMessage`.
`message.id` is the sole public admission and retry identity. Their asynchronous
`AgentAdmission` has only `accepted`, `denied`, or `unavailable`, echoes that
MessageId, and proves admission only. It never returns a turn, assistant output,
terminal, owned-run claim, or output causation. Any transport correlation id is
Host-private. `mutationId` exists only for message-less create, resume, dispose,
or whole-Agent cancel retries.

`discard(messageId)` cancels one still-pending inbox message. It returns
`already-claimed` once runtime ownership has begun and never cancels unrelated
Agent work. Whole-Agent `cancel` is separately permissioned and must be used
only by an owner of the exact activity or an authority explicitly allowed to
cancel the Agent. A Chatroom self-introduction cancellation therefore uses the
request MessageId and `discard`, not whole-Agent cancel.

`status`, `whenIdle`, inbox state, and `agent/*` notifications are live handle
semantics. Agent live notifications are merge-extensible and never receive a
cursor, replay promise, or durable event id. If the runtime authority cannot
observe whole-Agent idle, status/whenIdle return
`whole-agent-idle-unobservable`; turn completion must never be substituted.

Navigation is an optional `AgentDetailReference { kind: 'host', ref }` resolved
by Host routing. URLs, paths, and renderer handles are forbidden.

## Dynamic route-bound Session authorization

A plugin whose Session id comes from a future Host route instance declares an
optional v5 capability with a closed binding template, not an empty scope or a
wildcard:

```json
{
  "name": "sessions.read",
  "required": false,
  "scope": {
    "sessionIds": {
      "kind": "host-route-param",
      "routeId": "timeline",
      "param": "sessionId"
    }
  }
}
```

The Host validates that `timeline` is a route contributed by the same plugin
and that its path declares `:sessionId`. The template is a deferred maximum-
scope constraint, not a grant. It is restricted to Session-scoped Agent runtime
capabilities and must be optional because no concrete resource exists during
install/enable authorization. `{}` is unscoped and invalid for
`sessions.get/read/subscribe`; `["*"]` is invalid because Session ids have no
wildcard semantics.

Only the Host may read the active route instance and resolve the parameter. It
then constructs a runtime authorization plan/decision/lease with the exact
scope `{ "sessionIds": ["<resolved SessionId>"] }`; permission v4 policy,
plan, and decision schemas never accept the template. Caller-supplied route ids,
params, Session ids, or a value from an inactive/different-owner route cannot
resolve authority. The bound registry/Session/subscription is fenced by the
route instance, exact Session id, plugin generation, connection generation, and
permission lease. Navigation or route replacement closes it with
`route-replaced`; a new route instance requires a new exact resolution.

## Session truth and delivery

`SessionEvent` is the only persistent Agent runtime fact source. The single Host
runtime authority has append authority; ordinary plugins receive read-only
Session handles.
Every event is structured-clone-safe JSON, belongs to one exact Session, and
has a strictly increasing contiguous `seq`. The core merge-extensible facts are:

- `turn/start`, `turn/end`, `step/start`, `step/end`;
- `user/message`, `assistant/chunk`, `assistant/message`;
- `tool/call`, `tool/result`;
- `request/header`, `request/context`;
- `agent/inbox/spliced`;
- `approval/asked`, `approval/decided`;
- `session/end-seed`.

Surface events may carry `sourceEventSeqs` and `surfaceOp`; non-surface events
may not. A producer emits only facts the runtime authority actually supplies. It
must not fabricate a turn terminal, assistant association, idle state, approval,
or tool fact from timing or admission. Unknown events may be skipped only when
the producer explicitly marks them `ignorable: true`; unknown required variants
make the read unavailable.

`Session.snapshot()` returns a permission-filtered header and fixed committed
`snapshotSeq`. `read({afterSeq, limit, snapshotSeq})` pages only through that
watermark, so a multi-page consumer sees an immutable read transaction while
new appends continue. `subscribe` registers its live fence first, atomically
captures `replayThrough`, emits contiguous replay through the watermark, then
emits post-commit live events. No event may be duplicated or omitted at the
phase boundary. Session, subscription, plugin, connection, and permission
replacement are terminal and fail closed; unsubscribe is idempotent.

`SessionSubscription.closed` is a non-rejecting Promise that resolves exactly
once to `SessionSubscriptionClosed`. The first terminal reason wins. Host-side
session, route, plugin generation, connection, permission, protocol, or
availability fencing therefore cannot stop delivery silently. After it resolves
no new observer call may begin; a consumer must still compare Session and
subscription generations before committing an already-running callback.
`unsubscribe()` is idempotent and resolves to the same terminal value.

Permission filtering applies before snapshot, read, and delivery, and returned
values are structured clones. Missing and unauthorized ids are intentionally
indistinguishable at `get`. The closed capability vocabulary is:
`agents.create`, `agents.resume`, `agents.get`, `agents.message.submit`,
`agents.message.cancel`, `agents.cancel`, `agents.live.subscribe`,
`sessions.get`, `sessions.read`, `sessions.subscribe`, `approvals.request`, and
`approvals.answer`. Caller principal and generation are Host-bound and never
accepted from request payloads.

Plugin-owned domain correlation may be persisted only inside the identified
plugin-source `UserMessage.source.correlation` pair. It records that a domain
intent was admitted; it does not copy runtime output truth or claim a resulting
assistant message/turn. Chatroom RoomRun therefore needs only `SessionId` plus
domain presence/correlation, not a task binding, loop cursor, public projection,
or second delivery ledger.

## Consumer migration table

| Retired consumer concept | Runtime v1 replacement |
| --- | --- |
| task binding / bind-or-create | authoritative `SessionId`; explicit `ctx.agents.create` or `resume` |
| rebind | deterministic `resume` with typed live-Agent collision |
| loop/event/history cursor | `SessionSeqCursor` on `Session.read` or `Session.subscribe` |
| public projections or history adapter | permission-filtered `SessionSnapshot` plus `SessionEvent` |
| second delivery ledger | admitted `MessageId`, plugin-source correlation, and committed inbox/message Session facts |
| generic self-introduction command | Chatroom-owned identified `UserMessage` submitted through the Agent |
| self-introduction cancel | `Agent.discard(requestMessageId)` while pending |
| task details URL | Host-owned `AgentDetailReference` |
| approval decision command | Agent-scoped `ApprovalService` plus same-Session approval facts |
| bound client disposal | owner-only, generation-bound `AgentHandle.dispose` |

A Trace consumer calls `ctx.sessions.get(sessionId)`, captures
`session.snapshot()`, reads pages pinned to its `snapshotSeq`, then subscribes
from the last committed seq. It may additionally subscribe to `agent/*` for
live status/inbox hints when it has a bare Agent, but must render durable state
from SessionEvent only. It never imports Host runtime internals or defines a
local Sessions facade.

## Approval seam

Approval is separate from permission authorization, user-input requests, and
elicitation. An approval question and decision carry the same exact approval
id, Agent id, Session id, and Agent generation. The service appends one
`approval/asked` and exactly one terminal `approval/decided` in that same
Session. Missing, stale, throwing, invalid, or non-owning answerers resolve
fail-closed to `unavailable`; first terminal decision wins.

## Public entrypoints

- `@cordisx/protocol/agents/v1` -> `types/agents.v1.d.ts`;
- `@cordisx/protocol/sessions/v1` -> `types/sessions.v1.d.ts`;
- `@cordisx/protocol/approval/v1` -> `types/approval.v1.d.ts`.

Schemas are named `agents-common`, `agent-acquire-request`,
`agent-acquire-result`, `agent-admission`, `agent-message-cancellation-result`,
`agent-mutation-result`, `agent-status-observation`, `agent-live-event`, `session-common`,
`session-snapshot`, `session-read-request`, `session-event`,
`session-event-page`, `session-subscribe-request`, `session-subscription-page`,
`session-subscription-close`,
`approval-question`, and `approval-decision`, all version 1.
