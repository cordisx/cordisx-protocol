# Agent history protocol v1

This specification is normative for importing durable, adapter-owned Agent
history without granting renderer plugins filesystem access or rewriting the
current-connection event ledger. It is deliberately orthogonal to
`cordisx.agent-events/v2`: history pages contain valid version-2 Agent events,
but they have their own snapshot, cursor, coverage, payload, and authority
boundary.

## Contract and ownership

- Contract id: `cordisx.agent-history/v1`.
- Page schema: `schemas/agent-history-page.v1.schema.json`.
- Embedded events: `cordisx.agent-events/v2`.
- Capability: `agent.history.read` in the version-1 plugin manifest.
- Public service: a host-owned, read-only history query and tail service. It is
  not a file picker, path API, general database API, replay API, audit log, or
  writable Agent ledger.

The adapter/Host layer owns source discovery, exact session resolution, file
identity, parsing, sparse indexing, pagination, rotation detection, tailing,
redaction, resource limits, and diagnostics. A renderer or plugin supplies a
host-issued Agent `sessionId`, opaque cursor, bounded limit, and requested
payload policy. It never supplies or receives a filesystem path, file offset,
inode, `HOME`, `CODEX_HOME`, provider credential, raw source line, arbitrary
glob, or parser handle.

`ctx.agentEvents` remains the live, contiguous, generation-owned ledger.
History is exposed separately as `ctx.agentHistory`. A consumer may merge the
two projections for display, while preserving source and truth labels, but
must not append imported events to the live ledger or claim that history is a
CordisX audit trail.

## Page, source, and coverage

A page binds one Agent session and one immutable history snapshot. It contains:

- the requested `sessionId`, normalized `limit`, payload policy, and opaque
  snapshot/cursor values;
- `source` with `kind: historical`, a public adapter id/version, an opaque
  host/profile identity, and no native path;
- `coverage` describing `complete`, `partial`, `indexing`, or `unavailable`,
  optional observed time bounds, compaction presence, corrupt/oversized line
  counts, redaction count, and whether bounded tailing is available;
- zero to 500 valid `cordisx.agent-events/v2` events;
- an opaque `nextCursor` only when an earlier page exists in the same snapshot.

The host binds every cursor to plugin identity, generation, granted scope,
session, adapter/profile identity, payload policy, limit, snapshot, and an
expiry. A stale, forged, cross-session, cross-profile, cross-provider, blocked,
or replaced-generation cursor fails closed. Cursor bytes are not a location or
authorization token outside the HostRuntime that issued them.

`complete` means the adapter parsed the complete available source snapshot for
the selected session under the declared payload policy. It does not mean that
the native source captured every model or transport fact. `partial` names
bounded omissions through sanitized diagnostics. `indexing` may return a
useful partial page while a sparse metadata-only index is built. `unavailable`
returns no events and never invites a raw filesystem fallback.

## Provenance and allowed projection

History source and event provenance are separate facts:

- every page is `source.kind: historical`;
- a native JSONL record may produce an `observed` event when it explicitly
  states the fact;
- a lifecycle boundary derived from record order may be `inferred` and must
  identify the history adapter;
- imported events are never `cordisx` provenance.

An importer may project explicit session, turn, item, message, tool-call,
content-reference, timing, status, and compaction facts. It leaves absent any
step, message, tool, or timing identity not present in the source. It may
coalesce duplicate native projections that carry the same stable identity.

Native history alone cannot prove a CordisX permission decision,
`message.delivery`, `input.contribution`, Agent delivery claim/projection/
forwarding, successful prompt forwarding, or model consumption. A conforming
history page contains no imported `message.delivery` or `input.contribution`
event. It does not synthesize those facts from a user message, tool call,
assistant response, completed turn, or compaction record.

## Stable identity, ordering, and live merge

The importer prefers stable native session, turn, item, message, tool-call,
and call identities. A missing native identity uses a host-secret fingerprint
over validated source-file identity, source schema/parser version, record
ordinal or byte offset, and projection sub-index. Raw identity ingredients are
never returned. The resulting event id is stable across repeated imports of an
unchanged source and changes when truncation or replacement invalidates that
source snapshot.

History event `seq` is contiguous only inside the immutable history snapshot.
It is not the live ledger sequence. A display consumer orders by observed time,
native ordinal, origin priority, and stable identity. It deduplicates
historical and live copies by stable native fact keys; the live observation
wins for the same fact while older historical events remain visible. A
consumer must retain the `historical`, `live`, or `fixture` origin separately
from `observed`, `cordisx`, or `inferred` truth.

Source growth may extend a later snapshot. A partial trailing line is retained
only in the Host and is not emitted until complete. Truncation, inode/file
replacement, active-to-archive movement, or incompatible parser changes
invalidate old cursors and create a new snapshot with a sanitized diagnostic.
Repeated imports and process restarts must not duplicate unchanged facts.

## Payload policy and privacy

The request chooses one policy, and the Host may clamp it to a less revealing
policy:

| Policy | Public result |
| --- | --- |
| `referenced` | identities, type, timing, status, sizes, and opaque content references only |
| `summarized` | referenced metadata plus a bounded, host-generated, redacted summary |
| `inline` | bounded redacted content for explicitly supported fields only |

`referenced` is the default. `inline` remains subject to an explicit broker
decision and hard byte limits. No policy exposes encrypted content, secrets,
credentials, environment variables, authentication headers, raw tool
arguments/results, full diffs, system/developer instructions, working paths,
repository remotes, rate/credit metadata, or compaction replacement bodies.
Redaction happens before serialization, diagnostics, logging, caching, or
renderer delivery. Metadata-only sparse indexes contain no content and use
owner-only filesystem permissions.

The capability is scoped by provider-neutral `scope.sessionIds`. The Host also
binds the operation to its current history adapter and opaque profile identity;
the plugin cannot derive or inject a Platform `{providerId, remoteSessionId}`
or select another profile. Platform composite session scope and Agent session
scope remain separate.

## Resource and lifecycle bounds

- one page contains at most 500 events;
- the Host enforces per-call byte, line-size, CPU/time, and cancellation limits;
- source lookup is exact and on demand; it does not scan every history body;
- corrupt, unsupported, or oversized lines are skipped with bounded counts and
  sanitized diagnostics;
- tail polling is bounded and generation-owned, not an unbounded renderer
  watcher;
- plugin block, permission block, fiber disposal, profile replacement, and
  generation replacement close subscriptions and invalidate cursors;
- session switches cancel outstanding work and cannot publish the previous
  session's page into the new view.

## Compatibility and validation matrix

Protocol conformance covers strict fields, max-500 pages, embedded Agent-v2
events, source/provenance rules, disallowed CordisX-only event types, opaque
cursor vocabulary, payload policies, coverage invariants, and rejection of
paths, offsets, credentials, provider-session references, and cross-scope
binding examples.

Host conformance additionally covers:

| Area | Required cases |
| --- | --- |
| Resolver | active and archived exact session, profile/provider isolation, symlink/traversal refusal |
| Parser | supported old/current records, native ids, turns, messages, tools, timing, compaction |
| Robustness | corrupt middle/tail line, multi-megabyte/oversized line, truncation, replacement, movement |
| Paging | sparse large file, stable restart, max 500, opaque cursor, snapshot invalidation |
| Tail | partial-line buffering, append, bounded polling, cleanup |
| Privacy | referenced/summarized/inline clamping, secret fixtures, no path/content diagnostic leakage |
| Permission | undeclared, ask/allow/deny/timeout, session denial, stale generation |
| Merge | repeated import, native-id dedupe, historical/live overlap, stable ordering |
| UI consumer | one store/provider seam, session A/B, 500-row window, source/coverage/status labels |
| Real smoke | metadata-safe projection of an existing session plus isolated app renderer/cleanup evidence |

## Repository and PR order

1. `cordisx-protocol` lands this specification, manifest capability, schema,
   vectors, and conformance.
2. `cordisx` lands the Node/Host history service, permission RPC, parser,
   resolver, redaction, query/tail lifecycle, public types, and tests. It
   contains no Timeline or Showcase policy.
3. A separate `cordisx` consumer PR adds the Agent Trace composite provider,
   Timeline labels/coverage/paging, manager status, README, fixtures, and real
   renderer evidence. It does not add a second ledger or a selector.
4. `cordisxmono` updates exact compatible merged gitlinks last. The private
   roadmap remains `update = none` and is not initialized or modified.

