# Agent Conversation Shell v2, v3, v4, and v5

This data-only source contract serves a Host-owned Agent Desktop conversation
shell. The production Host renderer is independently implemented in the real
Host renderer/runtime. Playground visuals may later consume that production
renderer, never the reverse. No current Playground component, demo DOM,
geometry, copy, selector, or hardcoded visual is normative here.

The formal v1 wire contract remains frozen and consumable. V2 is the additive
successor for Agent identity, active runs, member presence, message provenance,
and reactions; a v2 producer never emits those fields under a v1 schema id.
The formal v2 schemas and declarations also remain frozen. V3 is the explicit
successor for Room-description presentation and Room-settings mutation; a v3
producer never emits those fields under a v1 or v2 schema id.
V4 is the additive Session-compatible successor. It preserves the complete v3
Room, settings, collection-leading-visual, and Host-owned presentation surface
while replacing only the runtime correlations that previously required
AgentLoop facts. V3 remains byte-for-byte available and a v4 producer never
emits v4 fields under an earlier schema id.
V5 is the additive composer-shortcut successor. It preserves the complete v4
Room, settings, item, action, Session correlation, command, and subscription
surface while adding one required closed `composer.shortcutPolicy` value. V4
remains byte-for-byte available and a v5 producer never emits v5 fields under
an earlier schema id.

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

## v3 Room description and settings

V3 retains the complete v2 participant, active-run, timeline, command, and
subscription data plane. A selected Room may additionally provide
`description`. Omission means that Room has not declared a description
capability, so the Host does not render an add-introduction entry. Explicit
`{ state: 'empty' }` means the capability is available with no current value;
the Host may render “添加群聊介绍” and open the same Host-owned Settings
inspector used for an existing description. `{ state: 'present', text }`
provides bounded localized presentation text. The title continues to use the
existing `LocalizedText` field and stable participant ordering is unchanged.

`AgentConversationShellSource.updateRoomSettings(request)` is the only v3
mutation seam. The Host owns the inspector, form, drawer, accessibility, and
validation presentation. Chatroom owns persistence and applies the mutation as
one atomic compare-and-swap. The data-only request carries a stable `requestId`,
exact `bindingId` and `ownerGeneration`, shell `generation`, `roomId`,
`expectedSnapshotSequence`, and a non-empty `patch`. `name` is plain user text
with 1 through 256 Unicode code points. A present description is plain user
text with 1 through 4000 Unicode code points; only the explicit `empty` variant
clears it. Both values are NFC and have no leading or trailing whitespace.
Description text may contain LF but not other C0 controls or DEL.
The JSON Schema length checks are structural guards; code-point counts are the
authoritative semantic bounds.

The response echoes the exact request fence. An `applied` result uses code
`applied` and returns `snapshotSequence` exactly equal to
`expectedSnapshotSequence + 1`. A `conflict` result uses one of
`request-conflict`, `owner-conflict`, `generation-conflict`, `room-conflict`, or
`snapshot-conflict`; it may report `currentSnapshotSequence` but never an
applied `snapshotSequence`. An `unavailable` result uses `owner-unavailable`,
`settings-unavailable`, or `disposed` and reports neither sequence.

Within a source owner, the same `requestId` plus the exact same binding,
generation, Room, expected sequence, and patch is an idempotent replay and
returns the original result, including the original applied sequence. Reusing
the id with any divergent field returns `request-conflict` and performs no
mutation. If `description` was omitted from the selected Room, a description
patch returns `settings-unavailable`. A mixed name-and-description patch is
atomic: if either field is unsupported or any fence fails, neither field is
changed. The next snapshot is published through the existing ordered snapshot
stream; the mutation result does not carry plugin storage or a replacement
snapshot.

V3 adds no permission decision, DOM, callback, route, local-storage field, raw
storage handle, or UI implementation. Existing authorization results remain the
only security input. Host code must not infer or directly mutate Chatroom state.

## v3 Room collection leading visual

V3 additionally defines one standalone embedded
`AgentConversationRoomCollectionLeadingVisual` value. It is either a bounded
semantic Host icon or a `room-composite-avatar` carrying the exact `roomId` and
an ordered list of zero through 64 `{ participantId, avatar }` entries. Every
avatar is a formal `AgentAvatarRef`; participant ids are unique within the
composite, and their order is the Chatroom-owned stable participant order. The
Host compares the structured `roomId` with the generic collection row's exact
`route.params.roomId` association and fails closed on mismatch. It never
derives association from title, participant display name, current selection,
array position outside the supplied list, or avatar seed.

The generic collection row, collection snapshot and revision, selection,
routing, rendering, accessibility, and group-avatar composition remain
Host-owned. Protocol defines only the embedded leading-visual payload. A
semantic New Room row uses `{ kind: 'semantic-icon', icon: 'host:action.add' }`.
Chatroom atomically replaces a whole row or whole collection revision; partial
participant-list patching is not defined. The payload contains no callback,
DOM, CSS, raw image, path, URL, title inference, or current-selection fallback.

## v3 approval timeline item

V3 adds one closed `approval` timeline item associated with an exact
`participantId`, `memberId`, `runId`, AgentLoop v3 `(bindingId, generation)`,
`turn`, and `approvalId`. Its `approvalKind` is `command`, `file-change`,
`external-action`, or `other`; `rationale` is optional bounded localized text.
The association and timeline position are immutable across `item-updated`.

Pending items contain one through three structured actions with unique
`approve`, `deny`, or `cancel` decisions. Each action carries only a normal
Host `CommandReference`. Pending transitions once to `approved`, `denied`,
`cancelled`, or `failed`; terminal items have an empty actions array and never
return to pending. Failed items require a bounded diagnostic, while all other
states forbid one. Snapshot replacement and incremental update must converge on
the same item and order.

The Host invokes an action through the v3 `scope: 'approval'` command context,
fenced by the exact shell binding, owner generation, shell generation, and
`itemId`. Chatroom resolves that current pending item and constructs the exact
AgentLoop v3 decision command from its association. The Host owns dispatch,
rendering, labels, accessibility, and disabled/loading presentation;
AgentLoop/provider owns decision execution and authoritative resolution.
Consumers correlate a resolved decision through the AgentLoop v3 causation
operation id and never by rationale, label, action order, or display text. No
approval item or action carries callback, DOM, HTML, CSS, provider trace, raw
command, file contents, or authorization data.

## v3 message semantics

Every v3 message has one required structured `semantic` value. AgentLoop
conversation messages use `{ purpose: 'conversation', causation? }`.
AgentLoop member introductions use `{ purpose: 'member-self-introduction',
causation, participantId, memberId, runId, binding, turn }`. Chatroom delivery
acknowledgements use only `{ purpose: 'chatroom-acknowledgement' }`. Source and
purpose are closed pairs: the first two require `source: 'agent-loop'`, and the
third requires `source: 'chatroom-acknowledgement'`.

A member introduction author is an Agent participant with an exact
`agentIdentity`; semantic `participantId` equals the author's participant id.
Its member/run/binding/turn and causation match the accepted AgentLoop v3
request and resulting message event. Host and Chatroom correlate these
structured identities and never infer an introduction from display text,
message body, title, author order, or timing. The semantic value is data and
accessibility provenance only, not a debug label or UI instruction. It contains
no prompt, hidden body, model, canned response, callback, DOM, or HTML.

## v4 Session-compatible runtime correlations

V4 keeps the Shell-owned `participantId`, `memberId`, and `runId` associations
used by the accepted Chatroom product path, and adds the exact `sessionId` to
active-run and member-presence descriptors. An active run may expose only the
optional structured `AgentDetailReference` returned by the Agent service. The
Host owns navigation and interpretation of that reference. The Shell carries
no raw URL, route, DOM, renderer, task binding, or AgentLoop details URL.

Session-derived messages use the closed structured source
`{ kind: 'session-event', sessionId, eventSeq }`. The sequence is the exact
persisted `SessionEvent.seq`; the Shell item `sequence` remains the ordered
Shell projection sequence. Chatroom-authored delivery acknowledgements use the
separate `{ kind: 'chatroom-acknowledgement' }` source. Producers never infer
Session provenance from display text, order, timing, or legacy source strings.

An approval item correlates directly through `sessionId`, `agentGeneration`,
and `approvalId`, alongside the existing Shell participant/member/run
association. It carries no AgentLoop binding or turn. A member self-introduction
correlates through the exact `{ sessionId, requestMessageId }` of the accepted
Session send/follow-up and resulting message event; it likewise carries no
AgentLoop binding or turn.

The runtime subscription handle exposes a non-rejecting `closed` Promise and an
idempotent async `unsubscribe()` returning the same terminal projection. The
closed code union is exhaustive, and first terminal closure wins. Replay pages,
live pages, Shell generations, binding ownership, settings CAS, and command
contexts retain their existing v3 fences.

V4 is published alongside v3, not as an in-place change. A Host may expose v4
only when its source is backed by the formal Agent/Session/Approval services and
can supply every required correlation. Otherwise it continues to expose v3.
Host or plugin consumers must not fabricate a Session id, event sequence,
detail reference, Agent generation, approval id, or message id from a v3 value.

## v5 composer shortcut policy

The v5 snapshot composer adds exactly one required presentation/input semantic:
`shortcutPolicy: 'enter' | 'mod-enter'`. It does not add another command,
callback, key listener, DOM handle, draft field, or attachment action. The
existing `composer.submit` remains the only command reference for submission.

For `enter`, Enter submits and Shift+Enter inserts a newline. For `mod-enter`,
Enter inserts a newline and either Meta+Enter or Ctrl+Enter submits. A keyboard
event observed while an input method editor is composing never submits under
either policy. Unknown policy values and unknown v5 schema identities fail
closed.

The Host owns keyboard-event handling, IME state, text editing, selection,
focus, accessibility, the message-send control, and dispatch of the existing
submit command. Chatroom supplies only the policy value in its atomic Shell
snapshot; it does not inspect or modify Host DOM. When a v4 source is explicitly
migrated to v5, omission is normalized once to `shortcutPolicy: 'enter'` so the
current Enter-submit behavior is preserved. Native v5 snapshots must include
the field and never rely on an implicit runtime default.

Attachment commands and attachment picker behavior remain outside v5. A Host
may independently reserve disabled visual space, but no plugin-facing action or
capability is created by this contract.
