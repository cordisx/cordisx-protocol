# Agent context v1

`cordisx.agent-context/v1` is an optional, read-only, adapter-neutral projection
of the same HostRuntime and current connection as Agent Events. It creates no
additional app-server or connection and exposes no native bridge. It is exposed as
optional `ctx.agentContext`; exact-turn control is optional `ctx.agentTurnControl`. The
[public types](../../../types/agent-context.v1.d.ts) are additive; Agent Events
v1 and v2 remain unchanged. An absent service or unavailable adapter is not a
claim that a threshold is active.

## Scope, facts, and budget

`read(sessionId)` and `watch({ sessionId, thresholdRatio }, observer)` require
`agent.events.read` and the exact Session grant, including all existing broker,
owner, scope and plugin-generation fences. No global watch is provided. A sample
contains the exact Session and generation, a context occupancy measurement (not
cumulative billing or `usage.read`), observation and expiration times in Unix milliseconds, a measurement kind,
source and bounded sanitized description of the actual accounting scope, and
opaque reset and configuration epochs. `reported-snapshot` is a native-reported
context measurement from a particular request, such as last-request total tokens;
it may lag and omit items not yet reported. `estimated-current` is an adapter
estimate of current occupancy and must identify its actual scope and derivation.
Neither claims a complete instantaneous internal counter. `asOf`, when known, is
the source observation time; `observedAt` is Host receipt time and must not be
misrepresented as source time. Do not fabricate `asOf` when unknown. A report
must belong to the same Session and, when supplied, exact turn, and use token
units and an accounting scope compatible with the effective budget. If a
budget uses a different counting basis and no verified conversion is available,
that budget is unsupported; never compare unlike counts. Without a suitable
measurement, read is unavailable and no event is emitted. Tokens are finite,
nonnegative integers. The optional turn is an exact observed native turn, never
a guessed association. Raw and usable model windows are optional independently
identified facts, and neither is substituted for the automatic compaction budget.

A resolved budget is a positive finite integer representing the *effective native
automatic compaction threshold* for that Session and configuration, with its
source classified as effective configuration, provider metadata, or an
adapter-derived result based on verified native rules and applicable inputs.
Adapter-derived does not mean a guessed percentage. If effective behavior or an
input cannot be established, the budget is unavailable, ratio is absent, and no
threshold notification is emitted. A disabled native automatic compaction budget
is unavailable with reason `disabled`. A resolved sample's ratio is exactly
`usedTokens / budget.tokens`, even above 1. A 100,000 raw window, 80,000 budget
and 0.5 threshold triggers at 40,000 tokens. No rounding of the configured ratio
is allowed. A threshold is a finite number strictly greater than zero and at most
0.95; reject invalid requests including 0.99, NaN and infinities.

## Observation and threshold state

Register the observer and capture the initial eligible sample atomically relative
to later observations; no sample may be lost in that transition. Each watch is
independent. Within a pair of epochs, an initial fresh resolved sample at or
above threshold emits once with `epoch-initial`. If initially below, or after a
later fresh sample falls below, a subsequent fresh sample at or above emits once
with `crossed`. Repeated samples at or above do not emit. The first fresh sample
of a new reset or config epoch starts a new evaluation and can emit
`epoch-initial`. Config/model or effective budget changes advance config epoch;
compaction, context replacement, and any reset of the occupancy counter advance
reset epoch. Invalidate the old sample immediately on such a change. Do not
combine old occupancy with a new budget. Until an eligible fresh sample exists,
retain no assumed crossing or resolved ratio. Epoch identities are opaque and
must not be reused for the same Session generation after a change.

The Host orders samples and rejects duplicates or out-of-order observations before
updating state; a late sample from an old epoch cannot restore it. Samples past
`expiresAt` cannot be returned as available or cause an event; `read` returns
`stale` until a fresh observation. Invalidation or a stale interval discards the crossing baseline but retains
the last evaluated epoch identity. The next fresh eligible sample in that same
epoch establishes a baseline without an event; a fresh below-threshold sample
arms the next actual crossing. Only a first eligible sample for a different
epoch may emit `epoch-initial`. This avoids a duplicate notification merely
because a source became stale or a budget temporarily became unavailable. Notifications are best-effort
observations, not a promise to precede native compaction or report every
intermediate occupancy, and do not themselves interrupt anything.
Observer errors close that subscription. Unsubscribe, permission revocation,
plugin block, fiber disposal, Session or connection replacement and generation
replacement close it, fence future observer starts, and discard state. In-flight
observers must also be generation-fenced by consumers.

## Exact-turn control

The separate [exact-turn control](../../../types/agent-turn-control.v1.d.ts) is
optional and confers no authority from observation. The Host issues a target only
when its existing business authority independently establishes that the calling
principal owns the exact Session and active native turn and has permission to
interrupt it. An arbitrary Session id, turn id, context event, or read grant is
never sufficient. The opaque handle is bound to owner, plugin generation,
connection, Session generation, exact turn and the authorization decision;
these cannot be supplied or changed by the caller. Cancellation is idempotent,
never redirects to the current or a later turn, and returns `already-terminal`
if the exact turn finished first. A failed or uncertain provider interruption is
unavailable, never reported as cancelled. Revocation and replacement fence the
handle. No raw provider control is exposed. A Host unable to prove ownership or
provide a real exact interrupt reports unavailable. The existing AgentLoop
controlled-turn service continues unchanged.

## Conformance boundary

Protocol vectors cover ratios, unavailable budgets, crossing, duplicate samples,
reset/config epochs, stale samples and validation. Host tests must additionally
cover actual broker decisions, per-session isolation, race-free registration,
ownership and cancellation races, generation cleanup, current-connection adapter
behavior, and real observations. Protocol conformance alone does not establish
Host adoption or native availability.
