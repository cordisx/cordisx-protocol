# Agent Conversation Shell v1

This data-only source contract serves a Host-owned Agent Desktop conversation
shell. The production Host renderer is independently implemented in the real
Host renderer/runtime. Playground visuals may later consume that production
renderer, never the reverse. No current Playground component, demo DOM,
geometry, copy, selector, or hardcoded visual is normative here.

The contract supports iterative chat-scene UX without prescribing layout. The
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

No image payload, URL, HTML, CSS, component, callback, selector, rich media,
Connector conversation/run handle, or renderer projection exists. Composer
unsent text is Host-ephemeral. The Host generates bounded plain-text submit
payload, and v1 has no per-keystroke stream or draft persistence.

Bindings and command contexts are Host-generated and generation-fenced. Pages
are ordered and terminal disposal rejects late/cross-shell updates. The JSON
subscription descriptor is separate from its Host runtime stream handle.
Fixtures are package-excluded Host test data validating this same snapshot;
they are neither public protocol nor a product default.

## v1 closure

| Requirement | Contract and check |
| --- | --- |
| Host shell ownership | binding + documentation; no route/page/surface mutation |
| Room, participants, avatar identity and initials opt-in | snapshot closed union; optional `AgentAvatarRef`; author/member identity conformance; single-participant initials negative case |
| Ordered messages and status | bounded item union plus AJV conformance |
| Composer submit | availability/placeholder/disabled/command only; no draft field |
| Commands and lifecycle | Host command context, exact binding/generation, typed result/page schemas |
| Unsafe data | conformance rejects media URL, HTML, callback and opaque handle fields |
