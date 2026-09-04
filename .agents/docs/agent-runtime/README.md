# Agent and Session runtime v1

This specification defines an additive, implementation-neutral Agent/Session
surface. It introduces `ctx.agents`, `ctx.sessions`, and `ctx.approvals` without
removing or changing AgentLoop v1-v4, Agent Events, Agent History, Manager,
Simulator, Plugin Bundle, or any existing consumer path.

For this new surface, `SessionEvent` is the only persistent runtime fact.
`Agent` is a live handle over the same identity, and `AgentId` is exactly the
corresponding `SessionId`. Implementations must not add a second persistent
ledger behind these entrypoints. Existing AgentLoop v4 consumers may continue
to use their frozen contract while Host adoption proceeds incrementally.

## Public services

The Host injects three independent services:

- `ctx.agents: AgentRegistry` exposes `create`, `resume`, and permission-filtered
  `get`;
- `ctx.sessions: SessionRegistry` exposes permission-filtered `get` for
  read-only Session handles;
- `ctx.approvals: ApprovalService` exposes Agent-scoped approval requests and
  answerer registration independently of permission authorization or user-input
  elicitation.

These services are additive peers of the existing `ctx.agentLoop` surface.
Adopting them does not authorize a plugin to remove, reinterpret, or bypass the
current AgentLoop v4 path.

## Agent identity, acquisition, and ownership

`AgentId` is an alias of `SessionId`. An accepted create or resume result binds
one live Agent generation to one exact Session generation. `Agent.session` is
the same Session identity that `ctx.sessions.get(agent.id)` returns for that
binding.

`create` without a `sessionId` asks the Host to mint one. A caller-supplied id is
validated as input and never silently resumes an existing Session. `resume`
requires a Session id. Concurrent first resume is deterministic: one mutation
publishes the live Agent, a same-owner same-`mutationId` retry is returned as
`disposition: 'replayed'`, and a distinct mutation receives
`conflict/agent-already-live`.

Accepted acquisition returns an unforgeable `AgentHandle`. The handle is bound
to the creating plugin generation and exact Agent generation. Only that owner
handle exposes `dispose`. `AgentRegistry.get()` returns a bare `Agent` and never
upgrades read access into disposal authority.

`AgentSetup` is data-only and business-neutral. It identifies a root Agent
definition and a complete definition catalog. It contains no Room, page,
renderer, task-binding, or product-specific command vocabulary.

## Live Agent operations

An Agent supports:

- `send(message, target, wakeup)` for explicit inbox placement;
- `followup(message)`, `steer(message)`, and `inject(message)` convenience
  operations;
- `discard(messageId)` for one still-pending inbox message;
- `cancel(cause, options)` for authorized whole-Agent cancellation;
- `whenIdle()` for observable whole-Agent idle state;
- `subscribe(observer)` for non-durable live coordination events.

`message.id` is the sole public admission and retry identity for message
submission. Admission proves only accepted, denied, or unavailable status; it
does not claim a turn, assistant output, terminal state, or output causation.
`discard` returns `already-claimed` after runtime ownership begins and must not
cancel unrelated work. `whenIdle` returns
`whole-agent-idle-unobservable` when the runtime cannot establish whole-Agent
idle; a completed turn is not a substitute.

Agent live events have no cursor, replay contract, or persistent event id. They
are coordination hints only. Durable consumers use SessionEvent.

## SessionEvent truth

Every SessionEvent is structured-clone-safe JSON, belongs to one Session, and
has a strictly increasing contiguous `seq`. The core merge-extensible facts
cover turn and step boundaries, user and assistant messages, streaming chunks,
tool calls and results, request context, inbox splices, approvals, and the
session seed.

Producers append only facts supplied by the runtime authority. They must not
infer a turn terminal, assistant association, idle state, approval, or tool fact
from timing or admission. Unknown events may be skipped only when the producer
marks them `ignorable: true`; an unknown required event makes the read
unavailable.

`Session.snapshot()` captures a permission-filtered header and fixed committed
`snapshotSeq`. `read({ afterSeq, limit, snapshotSeq })` pages only through that
watermark, so a multi-page read is immutable while later appends continue.

`Session.subscribe()` installs the live fence before replay, atomically captures
`replayThrough`, emits contiguous replay through that watermark, and then emits
strictly increasing live pages. No event may be duplicated or omitted at the
phase boundary.

`SessionSubscription.closed` is a non-rejecting Promise that resolves exactly
once with the first terminal reason. After it resolves, no new observer call may
begin. `unsubscribe()` is idempotent and resolves to the same terminal value.
Consumers must still generation-fence an observer that was already running when
closure won.

## Approval seam

Approval is separate from permission authorization, user-input requests, and
elicitation. A question and decision carry the same approval id, Agent id,
Session id, and Agent generation; therefore their Agent id also equals their
Session id. The service appends one `approval/asked` and exactly one terminal
`approval/decided` to that Session. Missing, stale, throwing, invalid, or
non-owning answerers resolve fail-closed as `unavailable`, and the first
terminal decision wins.

### V2 exact approval authority

Approval v2 separates durable approval context from live authority. A request
names one exact live requester Agent plus its definition identity and one exact
live authority Agent plus its definition identity. The Host verifies both
handles, definitions, owners, generations, connection state, and policy before
admission. `registerAuthorityAnswerer()` is keyed by the authority Agent's exact
binding. A replacement generation, foreign Session, missing permission, or
stale connection cannot inherit or invoke the answerer.

Before `approval/asked`, the Host appends the ignorable extension event
`approval/authority-bound` to the requester's Session. Its data contains only
the approval id, requester `AgentDefinitionIdentity`, authority
`AgentDefinitionIdentity`, and `{ kind: 'plain-text', text }` reason. It never
persists process-local Agent generation. The immediately following
`approval/asked.reason` is exactly the same `text`; the later
`approval/decided` remains the sole terminal outcome. These three facts use the
existing SessionEvent ledger and must be unique, same-Session, same-approval,
and ordered. No second approval ledger is introduced.

The live v2 question and decision echo exact requester and authority Agent id,
Session id, generation, and definition bindings. Those live fences must not be
reconstructed from terminal facts. Cold replay retains the durable requester,
authority, and reason while omitting expired live authority. Display names,
Room user identity, current-Agent lookup, array order, and wildcard identities
are never authority. Approval v1 remains byte-frozen and separately available.

### V3 pre-persistence request routing

Approval v3 lets one plugin owner register a resolver for one exact live
requester Agent before a runtime-originated approval is persisted. Registration
is keyed by requester Agent id/Session id, Agent generation, and definition;
the Host stamps plugin owner/generation and privately binds the current
connection. Admission requires ownership plus `approvals.request` permission
for that exact requester Session. One registration is current per exact
requester binding, and replacement atomically closes its predecessor.
The handle's first terminal close aborts in-flight resolution, resolves
`closed`, and prevents every later callback. Disposing a replaced handle cannot
close its successor.

The Host invokes the resolver with a versioned clone-safe question containing a
Host-minted routing id, the registration, exact requester binding, tool/call
identity, and a required structured plain-text reason. The resolver returns
either unavailable or exact requester and authority live bindings. Host
validates the result schema and exact registration/routing echoes, resolves both
current handles, and verifies their owner, Session, generation, definition,
connection, and permissions before constructing the existing approval/v2
request. The resolver never appends a SessionEvent. Neither side may infer a
route from display names, Room membership, current-Agent lookup, or wildcard
identity.

Once registration succeeds for a live requester binding, that binding is
route-required until its Agent generation, plugin generation, or connection
ends. A missing, disposed, stale, throwing, malformed, foreign, or unavailable
resolver result fails closed and never downgrades to approval/v1. An owner that
never registers the successor for a requester binding retains the frozen v1
runtime behavior. A successful route still appends only the v2
`approval/authority-bound`, `approval/asked`, and `approval/decided` sequence to
the requester's single SessionEvent ledger.

## Minimum consumption

Host adds three typed Cordis services to its public context and binds them to
one Host-owned runtime authority. It may keep the existing AgentLoop v4
registration active in parallel.

Chatroom may adopt `ctx.agents.create/resume/get` and an acquired Agent's
`followup`, `steer`, `inject`, `discard`, `cancel`, and `whenIdle` incrementally.
It should keep the accepted current AgentLoop path until the Host-provided new
services are available and verified.

Trace calls `ctx.sessions.get(sessionId)`, captures `snapshot()`, reads pages
pinned to `snapshotSeq`, and then subscribes after the last committed sequence.
It renders durable state only from SessionEvent and observes
`subscription.closed` as a terminal fence.

## Public entrypoints

- `@cordisx/protocol/agents/v1` -> `types/agents.v1.d.ts`;
- `@cordisx/protocol/sessions/v1` -> `types/sessions.v1.d.ts`;
- `@cordisx/protocol/approval/v1` -> `types/approval.v1.d.ts`;
- `@cordisx/protocol/approval/v2` -> `types/approval.v2.d.ts`;
- `@cordisx/protocol/approval/v3` -> `types/approval.v3.d.ts`.
- `@cordisx/protocol/agent-admission/v3` -> `types/agent-admission.v3.d.ts`.
- `@cordisx/protocol/agent-admission/v4` -> `types/agent-admission.v4.d.ts`.
- `@cordisx/protocol/agent-admission/v5` -> `types/agent-admission.v5.d.ts`.
- `@cordisx/protocol/agent-conversation-shell/v9` -> `types/agent-conversation-shell.v9.d.ts`.

### Target-scoped pre-submit admission

For one composer command that dispatches to multiple Room deliveries, Host issues
one opaque v3 target origin for each exact `{ participantId, memberId, runId }`.
The plugin obtains it with `AgentAdmissionTargetOriginService.issue`, then calls
`AgentAdmissionTargetReservationService.reserve` with the exact acquired handle
and calls that reservation's one-shot `submit`. Host validates the originating
binding, owner/plugin generation, connection, command execution, Room target,
and admitted Agent/Session before it invokes the driver. A capability cannot be
cross-used, reused, or retained after command completion, revocation, or
replacement. A failed target has no fallback; ordinary no-origin Agent sends and
the v1/v2 contracts retain their existing behavior.

### Bootstrap target admission

When a composer command starts before a Room has any run, Host supplies Shell
v9 with `AgentBootstrapCommandOrigin`. It fences the command, binding, owner
generation, connection, and execution but intentionally claims no target. In
that same command the plugin may materialize a Room delivery, declare its exact
`{ participantId, memberId, runId }` to the v4 bootstrap target service, then
acquire the Agent, reserve the issued opaque target capability, and make the
one-shot submit. Host rejects cross-target or duplicate use and every call after
completion, revocation, or replacement. Bootstrap never grants a fallback send
or creates another durable ledger.

### Bootstrap Room source capture

V5 additionally binds `roomId` with the exact bootstrap delivery before its
first reservation. Host returns an opaque Room-target origin plus a clone-safe
Room-target receipt, and retains that receipt for scenario/source capture. One
bootstrap command may bind many targets only for the same Room; cross-Room,
duplicate, reused, stale, completed, or revoked bindings fail closed. The later
reservation must match the retained Room-target receipt before its driver
submit. V4 and Shell v9 remain unchanged.

The matching version-1 JSON Schemas cover acquisition, admission, mutation,
live Agent observations, Session snapshots/pages/subscriptions/events, and
approval questions/decisions. Existing AgentLoop schemas and entrypoints remain
byte-preserved and exported.
