# Agent task creation v1

Status: experimental contract draft. Host adoption and real native verification
are separate requirements. Existing Agent, Session, Entity and admission
contracts remain unchanged. The optional `AgentTasks` service is defined by
[agent-task/v1](../../../types/agent-task.v1.d.ts).

## One create-and-submit operation

`createAndSubmit` resolves one exact Entity definition, validates execution
context, creates one real Session, installs its declared tool scope and submits
the first user input. It returns accepted only after that submission is accepted
by the runtime. It does not wait for execution completion. There is no second
acknowledgement Session and no new execution loop.

An Entity definition identifies who performs work. A product task identifies
the assignment. A Session carries the runtime history, and a turn identifies
an execution round within that Session. The returned reference contains the
existing SessionId and first MessageId; neither claims that a turn completed.
Each new operation creates a new task Session. Continuation uses the existing
Agent admission API, not a new create-and-submit operation.

## Execution context

The request selects an existing directory, a Host project, or inheritance from
one same-owner Session. Directory values must be absolute and resolve to
accessible directories. A project ID is a Host selector, never a cwd alias;
the Host verifies the project and its effective directory. If an explicit cwd
accompanies a project, the Host must verify that directory's membership,
including a worktree when supported. Unsupported project resolution fails
explicitly; it must not discard the selector or guess a directory.

Inheritance reads the parent's persisted execution context under current
same-owner read authorization. It does not read the Host process cwd, a current
window, another owner's Session, or a caller-supplied assertion of parent
identity. The resolved context is frozen before creating the new Session and
returned in the task reference. Replays preserve it even when the parent's
later state changes. Every actual native creation must use that directory and
verify the returned metadata. A mismatch fails rather than reporting success.

No context returns `context-required` before native creation. Invalid or
unavailable explicit context is an error, not permission to fall back to
inheritance. This API never modifies an existing Session's directory and never
creates or switches branches/worktrees. Product-specific default precedence
is outside this generic contract.

## Pre-execution association and tools

Before calling, the product persists its assignment association using its
existing task/run authority. It includes that business correlation in the tool
scope. The Host validates a current same-owner declared command and creates a
fresh authenticated [Agent Tools v1](../agent-tools/README.md) binding for the new Session after acquiring it and before
submitting any model input. Definition setup, Skill material and the actual CLI
invocation must be available to that first execution. A missing tool deployment
or binding fails the operation; it cannot submit without the requested tools.

The authenticated handler receives the Host-issued Session identity and frozen
scope. A report can precede `createAndSubmit`'s response. The product must join
it to the already-persisted assignment, revalidate mutable business membership,
and reject conflicting Room/task/member associations. CLI input never chooses
its caller identity. Binding secrets remain outside model text and receipts.

## Idempotency, partial failure and query

The Host scopes `operationId` to its durable installation/profile and plugin
owner. Plugin generations do not erase retry evidence, but current authority
must be revalidated on every call. The complete request is compared using a
canonical JSON representation; property order is immaterial. Reusing an
operation with different definition, context, task text, options or tool scope
returns `operation-conflict` without native execution. Concurrent equal calls
share one in-flight operation.

The existing owner/Session binding store records the operation's creation
intent before a native side effect and retains the single Session association
as it becomes known. This correlation is not another Session or event ledger.
Each irreversible boundary is persisted before progressing. A created Session
is retained if binding or first submission fails, and its reference remains
queryable. A failure response must not report accepted merely because creation
succeeded.

If creation or submission may have reached the native runtime but acknowledgement
is missing, return `reconciliation-required`. A retry must not create another
Session or blindly repeat submission. Only runtime evidence of the same
operation/first MessageId may reconcile acceptance. If the adapter cannot prove
the outcome, the unknown result remains visible. Never infer acceptance from
an Agent-authored report, a timeout, a screenshot or an idle status.

`query({ operationId })` checks current owner/read authority and returns the
retained operation result, including a known partial Session. Query performs no
create, resume or submit. Its separate `execution` field is a current runtime
observation; unavailable state remains unavailable after restart until the
runtime supplies evidence. Agent reports are product messages, not runtime
state. Navigation uses the existing opaque Host detail reference and retains
the same owner checks; no native ID or route is reconstructed by a plugin.

## Security and compatibility

Host-bound owner identity and existing create/submit/read permission checks
apply. Requests cannot supply principals, credentials, raw native handles or
private bridges. Inherited context and operation lookup cannot cross owners.
All input and result values are cloned JSON; only declared tool commands may be
bound. Disposal/replacement revokes live tool authority while preserving durable
operation correlation. A new generation must obtain current permissions and
bindings rather than revive old credentials.

An absent service means unsupported. Consumers must not approximate this
operation with private calls or claim create-only as successful delegation.
Existing create/resume and Agent admission APIs retain their published behavior.

## Representation and lifecycle details

The injected service is `ctx.agentTasks` when supported. The new service uses
[create request](../../../schemas/agent-task-create-request.v1.schema.json),
[create result](../../../schemas/agent-task-create-result.v1.schema.json),
[query request](../../../schemas/agent-task-query-request.v1.schema.json) and
[query result](../../../schemas/agent-task-query-result.v1.schema.json) shapes.
These are method payloads, without an additional document envelope. Shared
[context and execution shapes](../../../schemas/agent-task-common.v1.schema.json)
reuse existing identity, options and detail-reference definitions. Absolute
path validity, accessibility and project membership are semantic Host checks,
not claims established by string schema validation.

The Host clones and validates the request before asynchronous work. Canonical
comparison recursively orders object keys, retains array order and JSON scalar
values, and normalizes JSON negative zero to zero. Omitted properties differ
from explicit null or empty objects. Non-JSON values, cycles, non-finite numbers,
empty/whitespace-only text and unknown closed fields are invalid input; the
Host must not silently strip unknown identity or credential fields. Missing
context is `context-required`; malformed context is `invalid-input`. A valid
but unresolved context returns its specific unavailable code. Unknown project
support may return `project-unavailable` or `unsupported` before creation.

`createAndSubmit` requires current owner create and message-submit authority,
plus permission to bind the declared command. Context inheritance additionally
requires current read authority for that same-owner Session. Query requires
current read authority; unauthorized foreign operations are indistinguishable
from missing operations (`not-found`). A caller denied service read authority
receives `permission-denied` without an operation result. No response reveals a
foreign Session or resolved directory.

Rejected preflight calls do not reserve an operationId or overwrite an existing
operation. Once intent is persisted, the request and resolved context are
immutable. Equal replays return the retained outcome; accepted replays use
`disposition: replayed`. A known failed or uncertain partial is retained rather
than automatically resubmitted. The initial successful result uses `created`;
query returns the retained result without changing its disposition. Query may
observe an in-flight intent as `reconciliation-required`; it does not assert
that a failure has already become terminal. If a Session does not yet exist or
cannot be observed, execution is `unavailable` with `host-unavailable` (or the
applicable existing replacement code), never an invented idle value.

A Host mints and retains the first MessageId before submission, uses it for
existing admission idempotency and returns that same identity on acceptance.
Known native Session metadata mismatch is retained as `context-unavailable`
with the known SessionId, and no first input is submitted. Known creation
failure is `create-failed`; known submission rejection is `submit-failed`.
Tool preparation failure is `tool-unavailable`, including a known SessionId
if creation already occurred. Lost acknowledgement at either irreversible
boundary is `reconciliation-required`, even if an Agent report arrives.

Restart recovery preserves owner/operation/request/context/Session/MessageId
correlation in the existing owner binding authority. It may restore a live
command binding only after revalidating the current plugin generation, declared
command and permissions; it cannot reuse revoked credentials. A stale or
replaced invocation must not begin another native side effect. Returning an
accepted stored result does not imply that an old live binding remains usable.
Durable operation evidence must not be expired while the same identity can be
retried; implementations may retire it only with an explicit namespace/profile
retirement that makes the old identity unusable.

## Adapter adoption requirement

A conforming adapter must demonstrate context validation and native metadata
verification, exact definition/Skill installation, command binding before first
submission, and crash-safe correlation at both native boundaries. An adapter
that cannot establish these properties returns unavailable before the affected
side effect; merely exposing `AgentTasks` is not proof of support. Directory,
project and inherited-context resolution are independently checked. Hosts may
support directory/inherit while explicitly rejecting unimplemented projects.
Conformance reference-model tests cover semantics only; native interoperability
and actual consumer compilation against merged provider revisions remain
separate delivery gates. This contract does not specify automatic Leader
notifications or infer terminal task success from whole-Agent idle.
