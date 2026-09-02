# Agent Conversation Shell v2 and v3

This data-only contract feeds a Host-owned conversation shell. The Host owns
route selection, chrome, DOM, style, accessibility, virtualization, scrolling,
composer state, focus, loading/error presentation, avatar resolution, and
navigation. The plugin supplies bounded structured data only.

V1 remains frozen. V2 adds exact Agent participant identity, active-run and
member-presence projections, message provenance, and reactions. V3 adds Room
description/settings, Room collection leading visuals, approval items, and
explicit message semantics. A producer never emits later-version fields under
an earlier schema id.

## Participants, active runs, and navigation

Only explicit multi-participant Rooms may request `host-initials`. A participant
may carry an `AgentAvatarRef`; raw assets, paths, data payloads, and URLs are
forbidden. Message authors repeat the exact participant identity so a timeline
item cannot override the Room-owned avatar or Agent definition identity.

An Agent participant may carry one immutable `AgentDefinitionIdentity`. Human
and system participants cannot. `activeRuns` is an optional complete array
owned by the selected Room. Each item associates an exact participant,
Chatroom member, authoritative Session, active-only lifecycle, and optional
`AgentDetailReference { kind: 'host', ref }`. The Host resolves this reference
through its router. No arbitrary URL, task handle, private runtime binding,
route, trace, body, DOM value, or renderer authority crosses the contract.

Snapshot replacement atomically replaces `activeRuns`; there is no per-run
patch. Inactive runs are removed. Chatroom may retain its own durable domain
history, but a RoomRun needs only the authoritative `SessionId` plus domain
presence/correlation. It must not recreate task binding, rebind state, runtime
cursor, public projections, or a second delivery ledger.

## Timeline and commands

Messages use the closed source pair `session-event` or
`chatroom-acknowledgement`. Session-backed messages come from permission-filtered
`ctx.sessions` facts; acknowledgements are Chatroom domain output and cannot
impersonate the Agent runtime. Reactions and member presence use bounded,
structured, generation-fenced updates. Retry and other actions are normal Host
`CommandReference` values and never callbacks.

The composer exposes availability, placeholder, disabled state, and one Host
command only. Unsent text stays Host-ephemeral. The plugin receives bounded
plain-text submission and creates a formally identified `UserMessage` through
`ctx.agents`; it does not receive per-keystroke data.

Subscriptions publish ordered pages and terminate on unsubscribe, binding or
owner-generation replacement. Snapshot replacement and incremental updates
must converge. All command contexts are Host-authored and fenced by shell
binding, owner generation, shell generation, and exact item identity.

## V3 Room settings and collection visual

The optional description has `empty` or `present` state; omission means the
source offers no description capability. A settings mutation uses exact Room,
snapshot, owner-generation, and shell-generation fences plus a request id.
Name and description changes are atomic, and closed applied/conflict/unavailable
results contain no storage or replacement snapshot.

`AgentConversationRoomCollectionLeadingVisual` is either a semantic Host icon
or an exact Room-associated ordered composite of formal participant avatar
references. The Host validates the structured Room association and owns the
collection row, selection, routing, rendering, accessibility, and composition.

## V3 approvals

An approval item associates the exact participant, member, `SessionId`, turn,
and approval id. Pending items expose one through three
structured approve/deny/cancel Host commands and transition once to an approved,
denied, cancelled, or failed terminal state. The Host owns dispatch and
presentation. Chatroom invokes the public Agent-scoped approval seam; the
authoritative `approval/asked` and `approval/decided` facts remain in that same
SessionEvent log. Rationale, labels, action order, and timing are never used for
identity or correlation.

## V3 message semantics and self-introduction

Every message has one structured semantic value:

- Session-backed conversation: `{ purpose: 'conversation', correlation? }`;
- Session-backed member introduction: `{ purpose: 'member-self-introduction',
  correlation, participantId, memberId, sessionId }`;
- Chatroom delivery acknowledgement:
  `{ purpose: 'chatroom-acknowledgement' }`.

`correlation.requestMessageId` is the formally admitted UserMessage identity.
It records a domain relationship only; it does not assert that one assistant
message or turn terminal was caused by the request. The introduction is a
Chatroom orchestration intent implemented with `Agent.followup`/`steer`/
`inject` as appropriate. Cancellation uses `Agent.discard(requestMessageId)`
while pending, never a generic self-introduction command or whole-Agent cancel.

The Host and Chatroom correlate only exact structured identities and never
infer purpose from display text, body, author order, or timing. No semantic
value contains prompts, hidden content, model choice, canned output, callbacks,
DOM, CSS, HTML, native payload, or raw transport data.
