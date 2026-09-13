# Isolated game UI v1

Experimental independent capability; [types](../../types/isolated-game-ui.v1.d.ts).
It does not extend or relax restricted-content v1. Scene consumers remain compatible.

## Trust and resources

The trusted caller admits an exact resource bundle before mounting it. Admission
is an external policy decision, never an author-provided boolean. This interface
does not authorize automatically running arbitrary uploaded HTML. A missing
capability reports unavailable without an HTML-to-privileged-DOM fallback.

Bundles declare `format: html-v1`, `bridgeVersion: 1`, one HTML `entry`, and at
most 32 path-keyed assets. Each asset declares its media type, UTF-8 content and
SHA-256 hex digest. Paths contain ASCII alphanumeric, underscore or hyphen
segments and a final extension; absolute paths, traversal, query and fragment
are invalid. Supported media types are HTML, CSS, JavaScript and SVG. An asset
is at most 256 KiB and the resource total at most 1 MiB. Verify every hash before
execution. Entry resource references use `game-asset:path`; undeclared paths
fail loading. Authors may bundle React or use DOM, SVG or Canvas.

The execution container has a unique opaque origin and script execution only:
no same-origin, forms, popup, top-navigation, custom-protocol-navigation,
download or storage grants. It receives no Host DOM, credentials, filesystem,
private bridge, other participant projections or privileged callbacks. CSP
blocks connection APIs and non-package resource loading. These controls are
**not a complete egress boundary**: Chromium allows the frame to navigate
itself, which may transmit its own visible observation in a URL. Removing the
frame after navigation does not undo that request. The author can read every
byte delivered to this frame. Native protocol handling and browser-specific
behaviors require adapter verification. Stronger resource/navigation/network
containment is a future adapter seam, not a guarantee of this version.

## Connection and messages

A container-specific random token correlates bootstrap, not authority. The
child emits `game-ui-hello` with token and `versions: [1]`. The parent verifies
its exact child window and opaque origin and transfers one MessagePort to that
window in `game-ui-connect`. The child accepts it only from its parent with the
matching token, once. All later messages use this channel with `version: 1`.
No global window message is an action request.

The child sends `ready` with `capabilities: [snapshot, action, room-request]`.
The parent answers with the latest full `snapshot`. The child may send
`snapshot-request` after reconnect or visibility changes; it receives the same
latest snapshot, not a second authoritative state. Initial handshake times out
in 10 seconds. A replaced or navigated container must handshake anew.

A snapshot contains matchId, sequence, observation, status, canAct, readOnly,
optional roomActions and participants lists and theme. Snapshot and participant
objects have exact fields; undeclared fields are rejected. Status is game-neutral and does not
require a turn-based game. The trusted caller supplies the server-authoritative
projection and actionable state. `roomActions` contains only currently
authorized ready, cancel-ready, start, funding or next-round operations;
omission means none are available to the child. Funding requests only enter the
outer quote/reserve confirmation flow and never move funds directly. Sequences
are nonnegative safe integers, increase within one match, and cannot regress. A
new match requires a new seat. Equal sequence permits only theme change; it
cannot change game data, room actions, participants or unlock pending actions.

`participants` is optional public presentation metadata, not account identity
or authorization. Omission preserves existing snapshots; an empty list means
no participants are projected. Each entry has exactly `seatIndex`, `name`,
`kind`, optional `avatar`, and required boolean `isOwner`. At most 32 entries
have distinct safe-integer seat indices from 0 through 31. Names contain 1–128
Unicode code points, and kind is human, agent or bot. There is no accountId,
credential, private game state or native identity reference in this metadata.
The trusted caller derives `isOwner` from actual room ownership, not turn order
or the first seat. It grants no permission. An owner need not occupy a seat,
so exactly one owner entry is not required. Ownership transfers and all other
participant changes require a newer sequence and a full snapshot.

An avatar is at most 65536 ASCII characters and is a nonempty, padded base64
data URL with media type image/png, image/jpeg or image/webp. Remote URLs, SVG,
filesystem paths and native identity references are rejected. Existing frame
data-image restrictions apply; this adds no fetcher or permissions. The trusted
caller may omit an avatar when no actual public source exists. The game UI
must render a normal fallback for missing or undecodable images. Shape checking
does not guarantee successful raster decoding. Every delivered participant is
visible to the author; callers must project only public display information.
The [snapshot schema](../../schemas/isolated-game-ui-snapshot.v1.schema.json)
checks shape; Host checks also enforce unique seat indices, bytes and sequences.

Requests have exact fields `version, type: request, requestId, matchId,
sequence, kind, payload`. requestId is 1–100 ASCII alphanumeric/hyphen
characters. Kind is action, room-action, exit or next-round. Payload is finite JSON, at most
4 KiB and depth 16; reserved prototype keys are rejected. Bridge messages are
at most 8 KiB with 60 incoming messages per second; snapshots at most 256 KiB.
At most 256 distinct requests are retained per mounted seat. Repeating an
identical requestId returns its original in-flight/completed reply, never
re-executes; changed content with the same ID is rejected. Match and sequence
must match the current projection. readOnly or non-actionable snapshots reject
gameplay actions even when malicious author code emits a request directly. A
room-action payload contains exactly one ready, cancel-ready, start or funding
operation. It ignores gameplay `canAct`, but the Host rejects it when readOnly
or absent from the current `roomActions` list. When the list is present,
next-round is likewise accepted only when listed and the snapshot is writable.
This keeps room lifecycle authority separate from game-rule action authority.

Replies contain accepted, rejected or uncertain and an optional bounded error
code. One request dispatches at a time. Only explicit rejection unlocks
gameplay and room-action controls at the same sequence. Accepted/uncertain
gameplay and room actions require a fresh projection or explicit trusted
reconciliation. The client SDK times out at
15 seconds with uncertain, never accepted. Server idempotency is independent:
the trusted client retains and retries the original server request key.

Exit, room-action and next-round are requests to the outer room workflow; author code
cannot close native navigation, change participants, create a match or declare
victory. The outer workflow decides admission/confirmation and returns a reply.
Winning and settlement are never bridge commands. Dispose closes both ports,
invalidates requests, clears timers, removes the frame and fences late replies
by owner generation. External recovery/exit controls remain outside the frame.

## Shared human and Agent UI

The SDK exposes subscribe, action, requestRoomAction, requestExit,
requestNextRound and reconnect inside the child. Humans and interface-operation
tools use the same game DOM.
Game authors supply accessible names, readable phase/result/actionable state,
and ordinary focusable controls. Canvas must have equivalent semantic actions
and state; pixels alone are insufficient. This capability does not install an
Agent executor or a second direct-action client.
