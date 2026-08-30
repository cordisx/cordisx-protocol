# Agent Conversation Shell v2

This data-only source contract serves a Host-owned Agent Desktop conversation
shell. The production Host renderer is independently implemented in the real
Host renderer/runtime. Playground visuals may later consume that production
renderer, never the reverse. No current Playground component, demo DOM,
geometry, copy, selector, or hardcoded visual is normative here.

The formal v1 wire contract remains frozen and consumable. V2 is the additive
successor for Agent identity, active runs, member presence, message provenance,
and reactions; a v2 producer never emits those fields under a v1 schema id.

The v2 contract supports iterative chat-scene UX without prescribing layout. The
Host owns route selection, chrome, no-room title, DOM, style, accessibility,
virtualization, the only timeline scroll owner, fixed composer, focus, loading
and error states, avatar resolution, caching, theme, and fallback.
The plugin supplies only bounded data.

Only explicit multi-participant rooms may request `host-initials`. A participant
identity may carry one optional `AgentAvatarRef`; it never carries a raw asset,
path, data payload, or URL. The room participant list owns that reference. A
timeline message author with the same `participantId` MUST repeat the exact
participant identity, including its avatar reference, so a run, item, or update
cannot override the member-owned avatar. Host consumers resolve author identity
against the participant list before rendering.

An `agent` participant may additionally carry its exact immutable
`AgentDefinitionIdentity`. Human and system participants cannot assert one. An
Agent participant without that identity remains a valid message author, but the
Host must not display an Agent-specific entry or navigation action for it.

The room selection owns the optional complete `activeRuns` array. Each entry
links one exact `participantId` to consumer-local `memberId` and `runId`, an
active-only lifecycle projection, and its canonical structured `detailsUrl`.
Chatroom persists the full private AgentLoop binding separately for its own
send/subscribe operations and atomically stores the URL returned for the run
rather than recomputing it from UI state.
Chatroom owns those relations and lifecycle facts. The Host renders identity
from the referenced participant's exact Agent identity, navigates only through
the persisted structured URL; it never receives the private binding and never
guesses from display name, avatar, array position, or order. Entries may target
only selected `agent` participants with an `agentIdentity`. One `memberId` is
fixed to one `participantId` throughout a snapshot, and active runs plus
joined/ready presence items associate through the exact
`(participantId, memberId, runId)` triple.

`snapshot-replaced` atomically replaces the entire `activeRuns` array inside one
generation-fenced snapshot. There is no run-level merge or patch operation, and
a stale shell generation cannot update it. Inactive, closed, or failed runs are
removed rather than projected as active; Chatroom may retain their canonical
URL in its own durable history. The descriptor never carries a raw task handle,
arbitrary URL, route, body, trace, DOM value, or renderer authority. Its
structured URL uses the same v2 AgentLoop semantic validator and rejects
non-canonical percent escapes, default ports, and dot-segment normalization.

No image payload, arbitrary URL, HTML, CSS, component, callback, selector, rich
media, Connector conversation/run handle, or renderer projection exists. The
only URL is the bounded structured task `detailsUrl`. Composer unsent text is
Host-ephemeral. The Host generates bounded plain-text submit payload, and v2 has
no per-keystroke stream or draft persistence.

Bindings and command contexts are Host-generated and generation-fenced. Pages
are ordered and terminal disposal rejects late/cross-shell updates. The JSON
subscription descriptor is separate from its Host runtime stream handle.
Fixtures are package-excluded Host test data validating this same snapshot;
they are neither public protocol nor a product default.

Messages carry one required closed `source`: `agent-loop` for projected Agent
Loop output or `chatroom-acknowledgement` for a Chatroom-authored delivery
acknowledgement. Each message also owns a bounded complete `reactions` array.
A reaction has a stable `reactionId`, an exact `actorParticipantId`, a
structured emoji or semantic value, and `pending`, `completed`, or `failed`
state. Reaction actors must exist in the selected participant set, reaction ids
are unique within the message, and terminal reaction states do not regress.

Emoji values are NFC, 1 through 32 Unicode code points, contain emoji semantics,
have no leading or trailing whitespace, and contain no controls. Semantic
reaction tokens use `^[a-z][a-z0-9.-]{0,31}$`. Plugins do not provide markup,
style, event handlers, or arbitrary reaction payloads.

`member-presence` is a separate ordered timeline item for one exact
`participantId`, `memberId`, and `runId`. Its state is `inviting`, `creating`,
`joined`, `ready`, or `failed`; its diagnostic is an optional bounded
`LocalizedText`. A retry command may appear only when state is `failed` and
`retryable` is true. It is a normal Host command reference with bounded JSON
arguments and cannot carry a callback. Presence updates keep the same item and
identity tuple; terminal `ready` does not regress, while retry starts a new
attempt through the Host command path.

## v2 closure

| Requirement | Contract and check |
| --- | --- |
| Host shell ownership | binding + documentation; no route/page/surface mutation |
| Room, participants, Agent/avatar identity and initials opt-in | snapshot closed union; agent-only optional `AgentDefinitionIdentity`; optional `AgentAvatarRef`; author/member identity conformance; single-participant initials negative case |
| Active Agent runs | room-owned bounded atomic array; fixed member-to-participant mapping; exact participant/member/run association; AgentLoop-v2-canonical details URL; active-only lifecycle, generation and uniqueness conformance |
| Ordered messages, reactions, presence and status | closed message source; bounded structured reaction and member-presence item unions plus AJV/state conformance |
| Composer submit | availability/placeholder/disabled/command only; no draft field |
| Commands and lifecycle | Host command context, exact binding/generation, typed result/page schemas |
| Unsafe data | conformance rejects arbitrary URL/route, task body/trace, HTML, callback, DOM and raw handle fields |
