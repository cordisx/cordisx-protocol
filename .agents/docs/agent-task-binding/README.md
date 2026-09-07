# Agent task approval binding and ownership v1

Status: experimental contract. This additive
[TypeScript entrypoint](../../../types/agent-task-binding.v1.d.ts) provides
`ctx.agentTaskApprovals` and `ctx.agentTaskOwnership`. It reuses the frozen
[task v1 request, result and query identity](../agent-task/README.md),
[Agent and Session ownership](../agent-runtime/README.md), and existing approval
v1/v2/v3 registration and decision semantics. It changes none of those wire
shapes. Host adoption, real approval decisions and consumer verification are
separate evidence.

## Register existing approval handlers

`agentTaskApprovals.register({commandId}, handlers)` registers one handler set
for an existing same-owner declared Agent Tools command. Owner identity, active
plugin generation and command identity come from Host authority. An unknown or
foreign command, inactive generation or duplicate live registration is rejected
without replacing an existing registration. The returned disposer is idempotent.
There is no registration-order selection, wildcard command or cross-owner
fallback. This capability does not add approval permissions or policy.

The required `resolveRequest` handler consumes the existing approval/v3
`ApprovalRequestRoutingQuestion` and returns `ApprovalRequestRoutingResult`.
The required `answerAuthority` consumes the existing approval/v2
`ApprovalQuestion` and returns the existing `ApprovalOutcome`. Optional
`answerLegacy` consumes the frozen approval/v1 question and returns that same
outcome vocabulary. Supplying the legacy handler preserves that path; it does
not replace requester-to-authority routing with a legacy shortcut.

All three callbacks have `(question, binding, signal)` arguments. The Host
supplies a detached, frozen `binding` containing the task's `operationId` and
its original `toolScope`. Its [JSON shape](../../../schemas/agent-task-approval-binding.v1.schema.json)
contains no credential, native handle, plugin principal or Agent capability.
The question is the existing Host-issued question, not a reconstructed question
from CLI input. The signal is live and aborted when that exact registration,
Agent, plugin generation, connection or approval invocation is closed.

These callbacks run only when a real approval needs routing or an answer.
Registration and task installation never execute a plugin preparation callback.
They do not expose a pre-submit Agent or AgentHandle. Plugin business policy
may validate and join a pre-persisted assignment using the frozen tool scope and
Host-issued question identity, including when a question precedes the create
response. It must revalidate current membership, definition and authority; an
Agent-authored report or caller-supplied Session cannot select the requester.

The Host binds each handler to the exact newly acquired Agent and its persisted
definition through the existing `registerAnswerer`,
`registerAuthorityAnswerer` and `registerRequestResolver` mechanisms. Their
current permissions, live brands, definition checks, requester/authority
routing and single asked/decided Session ledger continue to apply. Both
self-authority (for example a root Leader) and a distinct authority (a child
routed to its Leader) must use valid live bindings and the established policy.
The service neither invents a Leader nor bypasses normal denial decisions.

## Required approval binding before first submission

`agentTaskApprovals.createAndSubmit(request)` is a separate entrypoint with the
exact task/v1 JSON request and result shapes. It requires a matching live
registration before creating a native Session. Consumers that require this
capability must call this entrypoint and fail explicitly if the service is
absent; they must not fall back to plain `agentTasks.createAndSubmit`.

After ordinary task preflight, the Host captures the exact owner, generation,
command and registration identity and records the required-binding policy with
the existing durable owner/operation intent. It creates the single Session,
verifies its context, retains its first MessageId, and installs its authenticated
tool binding. It then installs all configured existing approval registrations
before submitting any first input. Installation is a Host operation; no plugin
callback runs in this interval. Failure to install any required registration
prevents submission. A missing preparatory capability is not satisfied by an
empty callback, default approval policy or native approval suppression.

The Host checks the captured registration and all current permissions before
and after asynchronous boundaries. Disposal, replacement or permission loss
cannot select a replacement handler midway through an operation. Partially
installed registrations are closed on failure. An installation completing after
its operation was fenced is immediately closed, cannot publish a live handler,
and cannot trigger submission. Cleanup reuses the existing registration handles
and does not dispose the partial task Session.

The Host retains successful registrations under their existing Agent/owner
lifetimes. Disposing the command registration closes all registrations it
installed and aborts in-flight callbacks. Late answers and resolver results are
rejected through the existing generation and approval fences. Closing approval
handlers never rewrites an already accepted task to a failed creation or
manufactures a completed runtime state.

## Durable policy, partial outcomes and explicit recovery

Required binding is stored with the existing operation, outside the canonical
JSON request. There is no second Session, approval or task event ledger. Equal
required calls share the same in-flight operation and retain task/v1 replay
semantics; different JSON requests return `operation-conflict`.

The required entrypoint rejects an operation originally created through the
plain entrypoint as `operation-conflict`, even for equal JSON. It cannot claim
that an already submitted plain task had pre-submit approvals installed.
The frozen plain entrypoint may return the existing required operation's
accepted/partial replay, but cannot remove its required-binding policy or
restart its preparation. Neither path may weaken a persisted requirement.

Missing registration is `tool-unavailable` before native creation and does not
reserve an operation. Known installation rejection is retained as
`submit-failed` with the known SessionId and an internal approval-install-failed
phase. Installation timeout, replacement or permission loss must remain
explicitly unavailable and prevent submission. Whether such a failure can be
recovered is decided by durable proof of no submission and completed cleanup,
not merely by a public failure code. Lost creation/submission acknowledgement
continues to return `reconciliation-required`. Query uses the existing
`agentTasks.query` and never installs, resumes or submits anything.

`agentTaskApprovals.recover({operationId})` is the only explicit retry of failed
approval installation. It checks current same-owner create/submit, command and
approval authority, requires the original required policy, and requires durable
proof that the first input was never submitted. It can proceed only after all
previous partial registrations have been fenced and cleaned up and the same
Session's existing live Agent and owner handle are verified. It captures a
current handler registration and installs it on that same Session, then submits
the retained first MessageId once. It never creates a Session, resumes an Agent,
changes context, repeats definition setup or substitutes another tool scope.

Concurrent equal recover calls share one operation. Ordinary equal create
replays still return the retained partial instead of invoking recovery.
A recovery of an already accepted operation returns its accepted replay without
installing handlers or submitting again. Unknown operation or unavailable
required live resources return `host-unavailable`; a known incompatible policy
returns `operation-conflict`. A submitting/uncertain native operation remains
`reconciliation-required`, regardless of an Agent report or idle observation.

After restart, a retained partial whose exact live Agent/owner handle cannot be
verified remains unavailable; recovery must not create or resume to hide that
limit. Restoring an Agent through a separately authorized existing explicit
resume path is outside this method. Such restoration does not by itself prove
that task recovery is safe: the same Session, message, no-submit evidence,
owner, tool binding and cleanup fences must all still be established.

## Acquire ownership only after acceptance

`agentTaskOwnership.acquire({operationId})` returns
`{status: 'acquired', handle}` only after durable task acceptance and current
same-owner, same-generation, live Agent verification. The handle is the real
runtime-branded existing AgentHandle and retains its existing permission and
lifetime rules. It can be used by existing Agent admission or page reservation
APIs that require that brand. Plugins must not cast an `AgentRegistry.get`
result into an AgentHandle or construct one from a SessionId.

Acquisition transfers no ownership across principals. It requires the current
owner authority applicable to that existing handle; Session read access alone
cannot grant disposal or input authority. It performs no native action, create,
resume, submit, definition application, approval installation or cwd change.
Repeated acquisition references the same underlying live owner capability,
not a new Agent generation or a new disposal authority.

The result is `unavailable` with `not-accepted` for a known pending/partial
operation, `not-found` for an unknown or foreign operation, `permission-denied`
for missing current owner authority, and `host-unavailable` when an accepted
operation has no verifiable current live handle. `unsupported` indicates an
unsupported implementation. The live handle is not JSON and is not part of a
task receipt, query projection or persisted document. Registration callbacks,
AbortSignals and disposers likewise have no serialized representation.

## Adoption and conformance

An absent service means unsupported, never implicit approval support. Existing
plain task consumers retain their behavior. Conformance must cover required
binding preflight, all registration installation before submission, partial
cleanup and late fences, policy conflicts, same-Session explicit recovery,
restart unavailability and accepted-only genuine ownership. Actual Host tests
must additionally exercise both root self-authority and child-to-Leader routing,
a real approval and denial through the existing UI decision entrypoint, and
continuation using the acquired genuine handle. A schema, an empty handler,
a model test or native default approval suppression is not that evidence.
