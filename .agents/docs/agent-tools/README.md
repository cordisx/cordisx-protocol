# Plugin Agent tools v1

Status: experimental contract. Host adoption, distribution, and native Agent
verification are separate evidence. The [declarations](../../../types/agent-tools.v1.d.ts)
and [resource schema](../../../schemas/agent-tools.v1.schema.json) describe this
additive surface; existing manifest and package versions remain unchanged.

## Resources and discovery

An opted-in installed package ships `cordisx-agent-tools.json` beside its
`cordisx-package.json`. The Host must match that package's declared entry to the
selected runtime entry before using its descriptor. Direct source development
without a matching package entry uses a descriptor adjacent to the source entry.
Paths resolve relative to the selected descriptor. A package descriptor takes
precedence and malformed declarations never fall back to another directory.
Node commands and Skill resources belong outside the immutable browser graph
root (for example `dist/agent-tools` alongside `dist/runtime`); the whole package
integrity snapshot covers them. They are not browser ESM graph assets.
The document has `contract: cordisx.agent-tools/v1`, `skills` and `commands`.
Each Skill declares an id and a relative directory containing `SKILL.md`.
Each command declares an id, a relative JavaScript entry and its Skill id.
Paths start with `./`, contain only normalized nonempty segments, and cannot
contain parent traversal, backslashes, symbolic links, or special files.
Identifiers are unique within their collection; every command refers to an
existing Skill. Hosts may bound the first adoption to one command and Skill.

The descriptor and complete resources must be included in the distributed
package's integrity snapshot. A source-only descriptor is insufficient. Hosts
validate resources when accepting a package and bind the deployment to its exact
owner/source/generation. Unsupported Hosts expose no tool service and plugins
must fail closed; they must not fall back to direct persistence or unrestricted
IPC. A missing descriptor means no declaration, not an implicit command.

Hosts stage an immutable deployment in their own private lifetime directory.
They must preserve user-managed Skills, including modified earlier deployments.
A plugin generation update revokes old bindings and creates a new deployment.
Disabling a plugin revokes its handlers and bindings; Host exit removes its own
resources and credentials. Unreferenced files do not authorize execution.

A deployed path alone does not establish Agent discovery. The Host must use a
supported Agent setup/input surface to provide readable Skill content or a
verified discoverable reference and the actual command invocation. Secrets are
excluded from model context, command arguments, logs, and normal receipts.

## Registration, binding and invocation

`AgentTools.register({id}, handler)` registers a declared command on the calling
plugin's active fiber. Its disposable removes that handler and revokes its
bindings. The Host derives identity from the calling plugin context, never from
request-supplied owner fields. Duplicate live registrations are rejected.

`bind({commandId, sessionId, scope})` requires a live Session owned by that same
plugin and generation, plus an active registered command. The plugin must check
its current business membership and execution/run ownership before binding.
The Host freezes the supplied JSON scope and binds it to the launcher instance,
plugin source/generation, command and Session. Scope does not grant access to
another owner's Session. The handler must revalidate mutable business membership
at execution; a CLI-supplied room or sender cannot replace the trusted binding.

Bindings are short-lived and explicitly revocable. Their handle exposes only an
id, Session, expiry and `revoke()`, not a bearer credential. An implementation may
provide the Agent with a private descriptor path: its directory must restrict
access to the current operating-system user, the file must be mode 0600, and the
credential inside must be accepted only by the issuing Host instance for that
exact binding. A path is a capability reference and must not be shared across
runs. Same-user processes are within the local trusted execution boundary;
file modes are not a sandbox against that user.

Only authenticated invocation reaches the registered handler, with immutable
`{sessionId, scope}` independently supplied by the Host alongside untrusted
`input`. The CLI receives the handler's actual JSON receipt. The Host cannot
manufacture acceptance before the handler completes or write plugin business
storage itself. Authentication, expiry, Session ownership, current generation
and handler availability are checked for each invocation. A request that cannot
be routed to the same live registration is rejected.

Cancellation or transport timeout has an unknown business outcome if a handler
has started. The Host does not automatically retry. The plugin owns operation
ids and persistent idempotency semantics; the transport is not a second fact
ledger. A handler receives an AbortSignal and must check it before committing
when its storage supports cancellation. Scope revocation prevents subsequent
calls; it does not undo a committed business operation.

## Native execution and recovery

The Host revalidates dynamic setup immediately before every native execution,
including delayed turns and steering. Never-bound Sessions may return empty
setup. Previously bound but expired/revoked/unavailable setup fails closed.
Resume or a new business run must acquire a fresh binding after current
membership validation; old descriptor references are never silently revived.
Static Agent definitions and dynamic tool capabilities have distinct lifetimes.
The Host preserves the original user message when adding its setup material.
