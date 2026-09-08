# Entity execution context v1

Status: experimental contract. Host/consumer adoption and real runtime acceptance
are separate. This additive service preserves entities/v1 and agent-task/v1.

## Defaults and meaning

An active owner may read or CAS-update defaults only for an exact Entity it can
own and edit. Definition bytes and their digest do not gain a project field;
this is separate Host-owned Entity configuration. A missing binding is the
explicit `projectless` default at revision zero. It is not an absent context or
permission to use the Host process cwd. Binding state survives Entity revision
changes, but each call must prove access to the current exact requested identity.

A project binding names an actual Host project ID and optionally one of its
execution directories. The Host verifies project existence and root membership
before applying it. `projects()` exposes only the current Host connection's real
project records; it neither creates projects nor accepts a caller-provided list.
Roots are ordered; the first is the default root when no cwd is specified.
Unsupported/missing/removed projects fail closed without projectless fallback.

## Resolution and task submission

`resolve({identity, operationId})` returns an existing agent-task/v1 directory or
project selector. A projectless resolution uses an explicitly Host-managed,
owner-scoped working location keyed by the retained operation, distinct from
Host source and from any selected project. Provisioning that workspace is not
creating a project, Session, task, model turn, or acknowledgement conversation.
The caller retains the selected result for a retry and passes it to its one
create-and-submit operation. Resolution itself never starts execution.

The native adapter must explicitly request no project association for a
projectless task. For a project task it supplies the verified project identity
and directory, and verifies both returned metadata values. A mismatch is not
acceptance. Existing Session directories and project associations never change
when a binding changes. Task execution authority, CLI setup, first-message
submission, partial failure and idempotency remain in agent-task/v1.

## Writes, scope and security

Writes compare `expectedRevision`; successful mutations increment binding
revision. Repeating the same mutation and payload may replay, while conflicting
payloads cannot replace it. A binding selects future task context, not filesystem
permission. Context resolution and project discovery do not authorize Agent
execution; the existing exact-Session permission/admission checks still run.
Project metadata is available only through the active owner-bound service and
current Host connection. No host IDs, raw native handles, callbacks, credentials,
other-owner scopes or arbitrary filesystem roots are accepted as authority.
The Host validates paths and keeps its workspace storage private and resistant
to symlink redirection. The plugin must not inspect a Host/native DOM or private
state file to infer an unavailable binding. Generation replacement retires the
service and pending work; a stale caller cannot commit a binding.

## Compatibility

Older Hosts may omit this service. Binding-aware products then show the missing
capability without guessing a directory or reviving a manual-directory workflow.
Existing agent-task/v1 explicit directory/project/inherit calls keep their frozen
semantics. The service adds no second AgentLoop or persistent Session ledger.

Types: [entity-execution-context/v1](../../../types/entity-execution-context.v1.d.ts).
Schemas: [binding](../../../schemas/entity-execution-binding.v1.schema.json),
[write](../../../schemas/entity-execution-binding-write.v1.schema.json), and
[resolve](../../../schemas/entity-execution-context-request.v1.schema.json).
