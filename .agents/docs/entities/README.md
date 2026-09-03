# Local Agent entities v1

Entities v1 defines the public data and Host-scoped registry contract for local,
user-editable Agent identities. It is additive to Agents v1, Sessions v1,
AgentLoop v1-v4, and inline `AgentSetup`.

## Authoritative directory

For one Host-selected profile, the logical authoritative location is:

```text
<CordisX data root>/profiles/<profileId>/entities/<agentId>/entity.json
<CordisX data root>/profiles/<profileId>/entities/<agentId>/prompts/*.md
```

The Host owns and never exposes the concrete data root. Callers cannot provide
a root, profile, installation, owner, or arbitrary filesystem path. The public
`EntityRegistry` is already bound to one exact
`(profileId, installationId, pluginId, pluginGeneration)` principal.
The Host injects it as `ctx.entities`; a Host adopting entity-backed acquisition
types its existing `ctx.agents` as `EntityBackedAgentRegistry` without removing
the Agents-v1 methods.

`entity.json` is the only editable definition source. It declares `agentId` and
fields that compile one-for-one into the existing `AgentDefinition`. It never
contains a computed identity, revision, digest, or expected digest. A prompt
section contains either inline text or a path matching
`./prompts/<segments>.md`. Absolute paths, URLs, parent segments, alternate
extensions, and paths outside that entity directory fail closed.

The Host opens the entity directory and every referenced file without following
an escaping symlink. It validates the opened target remains beneath the same
resolved entity root and rejects a symlink escape or replacement race before
publication. The same rule applies while reading package templates.

## Digest, revision, and compilation

The entity-tree digest covers exactly `entity.json` and every Markdown file
actually referenced by the parsed entity document. Logical digest paths are
`entity.json` and the Markdown paths without their leading `./`. Duplicate
references are one file; an unreferenced file does not enter the definition or
digest. All logical paths are sorted by their UTF-8 byte sequence.

The SHA-256 input is:

1. UTF-8 bytes `cordisx.entity-tree/v1` followed by one zero byte;
2. for each sorted file, an unsigned 32-bit big-endian path-byte length;
3. the UTF-8 logical-path bytes;
4. an unsigned 64-bit big-endian content-byte length; and
5. the exact raw file bytes.

No newline, Unicode, or JSON normalization is performed. The result is the
lowercase `sha256:<hex>` digest. The Host compiles
`identity = { agentId, revision: digest }`; `EntityRecord.digest`, record
identity revision, and compiled `AgentDefinition.identity.revision` are exactly
equal. Returning to identical source bytes returns to the same revision.
`expectedRevision` in a save request is the last Host-computed digest and never
participates in digest input. The normative digest vector lives at
`test-vectors/entities/v1/digest.json`.
Both the JSON document and referenced Markdown must be valid UTF-8 before a
record can be published; invalid bytes fail closed and never become prompt text.

## Package templates

`plugin-package.v5` is the additive package-manifest successor. Its optional
`entityTemplates` entries contain only `agentId`, a package-relative
`./entities/<agentId>/entity.json` path, and the entity-tree digest. The path's
directory id, the entity document's `agentId`, and the declaration `agentId`
must match. The entity-file schema id must appear in the package compatibility
schema list.

The Host validates the package artifact and template digest, then materializes
the exact entity tree only when that profile has no local directory for the
agent id. Any existing directory wins, including an invalid or user-modified
one. Package install, update, enable, reload, or rollback never overwrites or
repairs it. Invalid templates, digest mismatch, path escape, ownership conflict,
and quota expansion return closed materialization results.

## Scope, access, and writes

The snapshot and `get(identity)` expose only entities owned by the current
installation or covered by a separate explicit share grant. Missing and
unauthorized exact identities are indistinguishable as `not-found`. Records
contain logical owner identity, access mode, exact digest, and compiled
definition; they never contain local paths, roots, file handles, callbacks, or
permission tokens.

Read and expected-revision CAS save for the current installation's declared
entity ids are normal scoped operations and do not prompt for interactive
permission. A caller cannot mint ownership by placing owner fields in a request.
Cross-installation sharing and quota above the Host's ordinary bound require a
separate authorization and return `sharing-authorization-required` or
`quota-authorization-required` when absent. Those decisions are Host-private;
entities v1 does not define a broad filesystem capability.

A save carries the complete `EntityFile` and the complete set of referenced
prompt-file texts. The Host validates source/path correspondence, computes the
new revision, writes a staged directory, and publishes it atomically only if
`expectedRevision` still matches. Same-mutation replay returns the original
result; divergent reuse is `mutation-conflict`. `null` creates only when absent.

## Changes and lifecycle

Snapshots carry one monotonic registry revision. Subscription installs its live
fence before capturing `replayThrough`, emits ordered replay, then ordered live
pages. External filesystem changes are validated and published as added,
updated, removed, or invalidated facts. Invalid content never becomes a valid
record.

`closed` is non-rejecting and resolves once. `unsubscribe()` is idempotent and
returns the same terminal projection. First terminal closure wins, no observer
begins afterward, and an already-running observer remains consumer-fenced by
the exact binding and plugin generation.

## Agent acquisition

`EntityBackedAgentRegistry` preserves the exact existing `AgentRegistry`
overloads for inline `AgentSetup`. Its additional create overload accepts one
`AgentDefinitionIdentity` and no inline setup. Create performs an exact scoped
lookup of the current local record; requested revision, record digest, record
identity, and compiled definition identity must all match.

On accepted create, the Host appends the ignorable extension SessionEvent
`entity/definition-bound` containing the exact owner and complete compiled
definition resolution. This Session-persisted snapshot, not the mutable entity
directory, is authoritative for every later resume. The entity-backed resume
overload requires `sessionId` plus the explicit
`definitionSource: 'session-persisted'` selector; its optional definition
identity is only an equality fence against the persisted snapshot. Editing local revision A to B or
deleting the local entity never prevents Session A from resuming as A. A new
create may use only the currently visible revision B. Resume never re-resolves
or silently upgrades to the latest local revision.

An accepted result echoes the exact definition resolution and identifies it as
`registry-current` for create or `session-persisted` for resume. Create may
return `entity-not-found`, `entity-revision-stale`, or `entity-invalid` for its
current lookup. Resume returns `entity-revision-stale` only when an optional
caller fence differs from the Session snapshot; absence of the current local
file is not `entity-not-found`. This is a definition source choice only:
AgentId remains SessionId, SessionEvent remains the sole persistent runtime
fact, and existing Agent/Session/Approval behavior is unchanged.

## Public entrypoint

- `@cordisx/protocol/entities/v1` -> `types/entities.v1.d.ts`.
