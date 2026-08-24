# Plugin DevTools Console v1

## Product boundary

The plugin detail `Runtime` tab is a development console, not an operations,
compliance, or general telemetry product. Its primary surface is a dense,
time-ordered stream with a compact current-view call summary. Host-owned
instrumentation is the primary source; plugin-authored `console.*` or logger
messages are supplementary.

CordisX automatically projects calls that cross a public Host boundary. A
plugin does not need to write logging code to receive `requested`, permission,
`dispatch`, and terminal entries. The Host assigns the plugin identity,
generation, sequence, correlation id, duration, and terminal status. A plugin
cannot report a Host operation as successful.

The v1 projection covers public Platform, Agent, command/tool, configuration,
and history dispatchers implemented by the Host. Native Codex work, another
plugin's calls, and direct plugin network, DOM, timer, or arbitrary JS behavior
that bypasses those dispatchers are outside the projection. The UI must state
that observability is partial.

## Entry model

`plugin-console-entry/v1` is an immutable line in one owning plugin's stream.
`plugin-console-page/v1` is a bounded in-memory query projection. Entries of
one call share a Host-generated `correlationId`:

1. `invocation/requested` records acceptance at the public API boundary.
2. `permission/ask`, `permission/allow`, or `permission/deny` projects the
   existing broker decision; it does not duplicate the permission ledger.
3. `invocation/dispatch` means the Host is calling the real implementation.
4. `invocation/success`, `failure`, or `cancel` is the only terminal phase.

Success means the observed Host operation returned a successful result. A
queued, forwarded, registered, or permission-allowed operation is not success.
Agent ledger and permission records remain authoritative; Console entries are
correlated developer projections only.

`console.debug`, `log`, `info`, `warn`, and `error` use an owner-scoped facade
created by the launcher for that plugin's bundled execution context. The Host
does not replace the renderer global console. The facade is generation-fenced,
stops accepting entries after owner disposal, and may inherit an unambiguous
active Host call correlation.

## Data and lifetime

The v1 Console is a bounded development buffer. It may retain a small number
of entries across Manager close/open within the current runtime generation.
It is not a durable audit store and defines no export, filesystem, renderer
file access, analytics warehouse, or long-term retention contract. `clear`
only advances the current view boundary; it does not alter permission or Agent
ledgers.

Arguments and results are bounded summaries. Implementations must avoid raw
secrets, credentials, prompts, response bodies, file contents, and URL query
strings in automatic projections. Plugin-authored console messages remain
developer-controlled content and must be visibly identified as such.

## Host API

The Host implementation provides generation-fenced append, query, subscribe,
and clear operations to the Manager. Append is private to Host middleware and
the launcher-created owner console facade; ordinary plugins do not receive a
general append API for invocation, permission, lifecycle, or diagnostic kinds.
Query and clear are owner-bounded and never expose another plugin's lines.

Within a page, `seq` is strictly increasing, every entry identity and
generation matches the page, and one correlation has at most one terminal
invocation entry. A success must follow dispatch. A permission denial may end
without dispatch. Disposal keeps already-captured lines visible in the current
generation but rejects later facade writes.
