# Agent event and message protocol v1

This specification is normative for adapter-neutral Session/Agent observation,
message delivery, pre-step composition, and prompt contributions. It is a core
contract for audit, runtime status, and future Timeline consumers. It does not
define a Timeline route, renderer, or demo plugin.

## Status and version

- Contract id: `cordisx.agent-events/v1`.
- Event schema: `schemas/agent-event.v1.schema.json`.
- Paged query schema: `schemas/agent-event-page.v1.schema.json`.
- Plugin capability declarations remain in the version-1 runtime manifest.
- Host-specific wire fields and methods are non-normative and belong only to an
  adapter document or fixture.

Version 1 is stable for the envelope, identity, source, delivery-stage, query,
and capability vocabulary below. Adapter bindings may still report
`experimental` or `unavailable` without changing this contract.

## One runtime and three public faces

The HostRuntime owns one current-connection adapter, one Permission Broker, one
generation, and one event ledger. `ctx.platform`, `ctx.agents`,
`ctx.agentEvents`, and `ctx.systemPrompt` are projections of that runtime. They
must not create independent task, turn, inbox, permission, or connection state.

`ctx.agentEvents` is read-only to plugins:

- `query({ sessionId, afterSeq?, limit? })` returns a snapshot-bounded page;
- `subscribe({ sessionId?, afterSeq? }, listener)` reports committed ranges;
- `status()` reports adapter mode, experimental facts, diagnostics, and the
  guarantees that no second connection or raw bridge was exposed.

`ctx.agents.get(sessionId)` returns an adapter-neutral Agent handle with the
DeepSeek Harness delivery shape:

- `send(message, target, wakeup)` is the single primitive;
- `followup(message)` is `send(message, 'next-turn', true)`;
- `steer(message)` is `send(message, 'next-step', true)`;
- `inject(message)` is `send(message, 'next-step', false)`.

`inject` is therefore a non-waking next-step queue, `steer` is a waking
next-step delivery, and `followup` is a waking next-turn delivery. Enqueue does
not promise a model request or a resulting turn. The ledger is the source of
truth for later claim, projection, forwarding, cancellation, expiry, or
failure.

Prompt composition uses `ctx.systemPrompt.section()` and
`ctx.systemPrompt.context()`. There is no `ctx.modelInput`. Sections and dynamic
contexts share the same scoped registry, generation, source identity, and
adapter projection boundary as Agent delivery.

## Event model

Every event carries:

- a stable `eventId`, contiguous zero-based `seq` within one `sessionId`, and
  host-observed or CordisX commit time in Unix milliseconds;
- opaque Session identity plus optional turn, step, item, message, tool-call,
  and context identity;
- exactly one `provenance`: `observed`, `cordisx`, or `inferred`;
- one source record naming an adapter, CordisX component, or plugin;
- an optional earlier `causalParentId` in the same session;
- type-specific lossless JSON data.

`observed` means the current host connection supplied the fact. `cordisx`
means CordisX committed the fact itself, including a plugin request stamped by
the runtime. `inferred` means an adapter derived a relationship or boundary
that the host did not state. An inferred event must name its adapter source and
must never be relabeled as observed merely because the inference is likely.

A plugin source is the host-bound tuple `(source, id, version, generation)`.
`version` is nullable when the local entry did not declare one; `generation` is
always a host-issued runtime generation. Call arguments never contain or
override this tuple. Plugins cannot claim the `user`, `application`, `trusted`,
adapter, or CordisX source classes.

Version 1 event types are:

| Type | Meaning |
| --- | --- |
| `session.lifecycle` | opened, resumed, forked, compacted, or closed session boundary |
| `turn.lifecycle` | started, completed, failed, or cancelled turn boundary |
| `step.lifecycle` | started, completed, failed, or cancelled model-step boundary |
| `item.lifecycle` | started, updated, completed, failed, or cancelled item boundary |
| `message.observed` | one host-observed user-role message with its native identity |
| `message.delivery` | one stage in a CordisX message-delivery chain |
| `content.chunk` | a high-frequency item delta or reference |
| `diagnostic` | a bounded adapter, ledger, permission, or projection diagnostic |

Turn, step, item, message, tool-call, and context identifiers are independent.
An adapter that observes a turn and item but no step id leaves `stepId` absent.
It may emit a separate `inferred` step only when it records the inference as
such. These identifiers are data projection keys only; they define no session
header, Timeline, DOM surface, outlet, or rendering ownership.

## Message identity and source

The public input to `send`, `followup`, `steer`, `inject`, pre-step append, and
prompt registration contains content only. The HostRuntime creates the stable
message id, freezes the content, and stamps the calling plugin identity. A
message entering from the host current connection instead retains its observed
native item/message identity and an adapter source.

Ordinary plugins may append only new messages bearing their own plugin source.
They cannot delete, replace, or reorder the original host/user batch. They also
cannot re-submit a batch value as though it were an observed user message.

`agent/pre-step` is a cooperative waterfall over the complete frozen sourced
`UserMessage[]` proposed for one step. A plain continuation preserves the
batch. An append decision adds newly stamped plugin messages. Rejecting the
step or transforming the original batch is an explicit higher-authority
decision and is brokered separately. A transform is expressed as operations
over message ids; replacement content becomes a new plugin-sourced message
rather than impersonating the replaced source.

## Delivery state machine

Every CordisX submission records the following stages where they occur:

```text
requested -> permission -> queued -> claimed -> projected -> forwarded
     |             |          |          |           |
     +-------------+----------+----------+-----------+
                  failed | expired | cancelled
```

- `requested` records immutable, host-stamped intent.
- `permission` records capability, `ask`/`allow`/`deny`, decision, declaration
  fingerprint, requested scope, and timeout result.
- `queued` records target and wakeup after authorization.
- `claimed` records the turn/step boundary that exclusively took the message.
- `projected` records successful adapter-neutral projection. It does not by
  itself prove native transport delivery.
- `forwarded` is emitted only after the current-connection adapter accepts the
  native request.
- `failed`, `expired`, and `cancelled` are terminal and name a bounded
  diagnostic. A denial is a failed delivery after the permission stage.

Missing current-connection authority produces `failed` with an unavailable
diagnostic. CordisX must not emit `forwarded` optimistically.

## Capabilities and permission policy

The version-1 manifest adds six Agent capabilities:

| Capability | Authority |
| --- | --- |
| `agent.events.read` | query and subscribe to normalized ledger events within scope |
| `agent.messages.append` | append host-stamped plugin messages through Agent delivery and pre-step |
| `agent.steps.reject` | reject a proposed model step |
| `agent.messages.transform` | remove, replace, or reorder original pre-step messages |
| `agent.prompt.section` | register an ordered system-prompt section |
| `agent.prompt.context` | register ordered dynamic prompt context |

All use the existing `required`, reason, scope, declaration-fingerprint, and
`ask`/`allow`/`deny` rules. `scope.sessionIds` constrains Agent/event access.
Permission evaluation has a bounded timeout and records the requested,
decision, outcome, and diagnostic facts in the ledger. A required denial may
block plugin activation; an optional denial leaves the plugin active and the
operation fails explicitly.

Trusted renderer code is still not a sandbox. Broker enforcement defines the
cooperative CordisX API boundary and must not be described as isolation from a
malicious bundled plugin.

## Adapter contract and honest degradation

An adapter may observe only a host-owned feed from the current Desktop
connection. It must preserve the native scheduler, request ids, timeouts,
approvals, and stream ownership. Starting another app-server, constructing a
second AppHost, or exposing a raw Electron/app-server bridge is
non-conforming.

The adapter status modes are `unavailable`, `read-only`, and `read-write`.
Experimental protocol fields are named in diagnostics. When a safe
current-connection seat is absent, event observation and message forwarding
are `unavailable`; simulated fixtures may still validate normalization without
claiming a live binding.

An adapter may project CordisX messages through a native experimental context
field only internally. It must preserve every native entry, add a
collision-resistant CordisX-owned key, use the least-trusted native kind, and
never expose the field or native trust vocabulary in the public Agent API.

## Chunking, references, and pagination

High-frequency chunks remain individual committed events so `seq`, replay, and
causality stay exact. A chunk carries a channel, monotonically increasing index
within its item/channel group, and either inline delta text or an opaque
content reference. The core may batch subscriber notifications as committed
`fromSeq..toSeq` ranges; subscribers query the ledger for the events and must
not treat notification batching as event coalescing.

Queries are snapshot bounded. `snapshotSeq` fixes the tail observed by the
first page; `afterSeq` is exclusive; `limit` is bounded to 1..500; and
`nextAfterSeq` is present only when another event exists within that snapshot.
A page never splits one event or resolves an opaque chunk reference. A future
Timeline may coalesce adjacent chunks for display without rewriting the
ledger.

## Resume, fork, compaction, and history

Resume preserves observed native identities and starts a new adapter lifecycle
without rewriting old events. Fork emits an observed or inferred fork event
with the parent session id and an explicit seed boundary when the host exposes
it. Compaction is a lifecycle event, not silent deletion; a history projection
that replaces content cites its causal sources when known.

Whether an adapter-native context fragment is durable, visible in history,
copied by fork, retained by resume, retained by compaction, or counted in a
specific token bucket is an adapter fact. Version 1 provides fields and
fixtures to record verified behavior but defines no cross-adapter assumption.
Unverified behavior is `experimental` or `unavailable`.

## Conformance and validation matrix

Protocol conformance covers schema strictness, contiguous per-session
sequence, stable ids, source/provenance consistency, earlier causal parents,
delivery transitions, capability uniqueness/fingerprints, and public rejection
of host-specific fields.

Host conformance must additionally cover:

| Area | Required cases |
| --- | --- |
| Ledger | gap, duplicate, out-of-order, pagination snapshot, subscriber range, generation disposal |
| Permission | undeclared, ask/allow/deny, required denial, timeout, scope denial, identity non-spoofing |
| Pre-step | full sourced batch, waterfall append, original preservation, reject capability, transform capability |
| Delivery | all stages, non-waking inject, waking steer/followup, expiry/cancel/failure |
| Adapter | lifecycle normalization, chunk indices/references, native context preservation, collision-free internal projection |
| Degradation | current connection unavailable, no second connection, no raw bridge, no optimistic forwarded event |
| Real probe | isolated renderer/app-server evidence for ordering, persistence, resume/fork/compaction, history, and token behavior; unknown facts stay experimental |

## Ownership and PR dependency

1. `cordisx-protocol` lands this specification, schemas, manifest capability
   vocabulary, vectors, and conformance.
2. `cordisx` lands the matching public types, shared HostRuntime, ledger,
   services, Permission Broker integration, Codex adapter/fixtures, tests, and
   honest real-probe report.
3. A Timeline/showcase consumer stacks only on the merged public protocol and
   host exports; no plugin or Timeline UI belongs in either core PR.
4. `cordisxmono` updates exact merged gitlinks last in a separate PR.

Codex-specific methods, notification payloads, and context keys remain in the
CordisX adapter document and fixtures. Claude Code, Zcode, and future adapters
implement the same event, source, delivery, permission, and degradation
contract without inheriting those fields.
