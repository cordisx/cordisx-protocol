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

Caller identity is bound when the Host issues capabilities, not inferred later
from a JavaScript stack or a mutable global. Each plugin child Context receives
private Host-issued principal and generation tokens. Its Platform, Agent,
history, config, commands, tools, and other capability facades close over those
tokens and pass them explicitly to the common aspect. The aspect validates token
object identity and liveness; renderer arguments cannot override the principal,
effective owner, profile generation, or plugin generation.

Passing a capability facade to another plugin does not transfer authority or
attribution: calls still use the issuing plugin principal. Cross-plugin
delegation would require a separate Host-issued delegation contract. v1 has no
such API. Public command invocation can identify the initiating `plugin`, the
registration's `effectiveOwner`, and a Host-generated `trigger`, but it never
silently rebinds authority.

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

Every entry preserves Console-shaped `method` plus variadic `args`. The Host
also derives a bounded formatted `message` for the Luna Log text row; this
projection never replaces the structured argument snapshots. Formatting follows
the common `%s`, `%d`, `%i`, `%f`, `%o`, `%O`, `%j`, and `%%` Console
placeholders when possible and safely falls back for circular values, errors,
BigInt, DOM elements, functions, symbols, proxies, and throwing getters.

`console.debug`, `log`, `info`, `warn`, and `error` use an owner-scoped facade
created by the launcher for that plugin's bundled execution context. The Host
does not replace the renderer global console. The facade is generation-fenced,
stops accepting entries after owner disposal, and may inherit an unambiguous
active Host call correlation.

Host-owned callback registries retain the principal/effective-owner tokens from
registration. Commands, routes, pages, surfaces, subscriptions, and timers must
invoke plugin callbacks through one generation-fenced `runInPluginContext`
wrapper. Nested callbacks retain their explicit parent correlation. Stale
generation callbacks are rejected before plugin code runs.

There is no portable browser equivalent of Node `AsyncLocalStorage` in the
target renderer baseline. TC39 AsyncContext remains a proposal, and userland
code cannot generally preserve implicit state through every `await`. CordisX
therefore propagates correlation explicitly through its own dispatcher and
Host-owned callback continuations. An owner-scoped console line receives a
correlation only when the active Host context is unambiguous; otherwise it keeps
correct owner attribution and omits correlation rather than guessing.

## Capture coverage

Every entry has a visible coverage class:

- `host-mediated`: strong attribution from a validated issued capability or
  registration token; only these invocation terminals affect success metrics;
- `scoped-console`: strong owner/generation attribution from the lexically
  injected facade during module or wrapped callback execution;
- `best-effort`: an error boundary matched a unique bundle URL/source map/module
  record; it is not counted as a Host call;
- `unknown`: no unique owner exists. Such shared-renderer errors are counted as
  unattributed but are not inserted into a plugin stream or its metrics.

The Host never replaces or monkey-patches the Codex renderer global console.
Saved global-console references, direct DOM/network activity, third-party async
internals, and callbacks not registered through a Host facade are blind spots.
Accurate capture of every log would require one plugin per Worker, iframe, or
other isolated realm with realm-owned console/error/network/tool proxies; that
is future isolation work, not a v1 Console claim.

## Data and lifetime

The v1 Console is a bounded development buffer. It may retain a small number
of entries across Manager close/open within the current runtime generation.
It is not a durable audit store and defines no export, filesystem, renderer
file access, analytics warehouse, or long-term retention contract. `clear`
only advances the current view boundary; it does not alter permission or Agent
ledgers.

Arguments are captured as safe, recursively inspectable snapshots rather than a
single title/data object. Implementations must avoid raw
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

The Manager may locally bundle Luna Log and Luna Text Viewer as the text-stream
renderer. Their string `log`/`append(string)` API does not define or narrow this
capture contract. Expandable argument and stack details remain Host-rendered;
plugins never receive a DOM rendering hook. Runtime CDN dependencies are not
part of this contract.
