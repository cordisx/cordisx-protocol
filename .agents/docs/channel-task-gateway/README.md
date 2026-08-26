# Channel task gateway protocol

Status: normative version 1 launcher-private task-consumer launch and Platform
task lifecycle contracts. They are adapter-neutral prerequisites; their
presence does not claim that a Host has wired a real provider or that a Channel
adapter has completed an end-to-end task.

## Ownership and boundary

An optional task consumer owns `channel-task-routing-config/v1`, including its
subscription policy, provider/model/profile/workspace selectors, and
notifications. The Node Channel service and adapters never read that document,
translate an alias to a path, read a workspace registry, choose an unauthorized
default, or call a Provider Fleet directly. The launcher owns one
resolver/authorization authority and one Platform task lifecycle ledger.

The task-consumer contracts are launcher-private:

- `channel-task-launch-request.v1.schema.json` carries the exact Channel
  operation, route, service generation, configuration revision, complete
  sourced event, and route selectors. It contains no path or credential.
- `channel-task-launch-authorization.v1.schema.json` is a short-lived,
  single-use Host grant. It binds the request to one complete model, one
  profile, one workspace alias and authorized absolute `cwd`, the exact
  `tasks.create` and `turns.submit` decisions, and a scope fingerprint.
- `platform-task-dispatch-result.v1.schema.json` reports synchronous create or
  follow-up acceptance without erasing a successfully created session when its
  initial turn fails.
- `platform-task-lifecycle-event.v1.schema.json` and
  `platform-task-lifecycle-range.v1.schema.json` expose sanitized, durable,
  cursor-replayable launcher events for that complete Platform session.

None is a renderer, Manager, Channel-core configuration, plugin Config,
Channel safe-log, public adapter transport, or current-connection Agent event
contract. A Host must not install their values into a CDP binding. In
particular the resolved `cwd`, grant token, scope fingerprint, complete Channel
source, raw provider notification, and provider callback stay in Node. A
renderer-safe task-consumer projection may show a configured workspace alias,
but never its resolution or launch authority.

The existing Platform session contract has its own permission-scoped `cwd`
projection. This gateway does not copy a Channel workspace grant into that
surface or broaden Platform read permission.

## Workspace resolution and authorization

Resolution is one atomic Host operation:

1. Validate the request and exact Channel service generation/configuration
   revision.
2. Resolve every `useDefault` selector against the named launcher profile.
   Unknown, disabled, or ambiguous provider/model/profile selectors fail
   closed.
3. Resolve `workspaceAlias` from the selected profile's Host-owned workspace
   registry. The result must be an existing authorized absolute directory.
   Relative paths, symlink escapes outside the authorized root, and implicit
   process cwd fallbacks fail closed.
4. Ask the existing Permission Broker for `tasks.create` and `turns.submit`
   against the complete Channel source, provider, and resolved cwd scope. A
   remote Channel event may create `ask`; it cannot approve itself.
5. On two `allow` decisions, issue one `chtl1_` grant registered in
   Host-private state. The registry binds the complete serialized request and
   target, authorization metadata, expiry, and consumed state. Token shape is
   never authority.
6. Atomically consume the grant immediately before Platform dispatch. A token
   that is missing, expired, already consumed, from another route/source,
   generation/revision, provider/model/profile, alias/cwd, or permission scope
   is rejected.

The Provider Fleet receives only the grant's resolved complete model and cwd
after consumption. It does not accept an alias, re-resolve a default, or inspect
Channel policy. Secrets and provider process configuration remain in their
existing launcher owners and are not fields of either launch contract.

## Dispatch and binding semantics

The create gateway performs exactly these steps after consuming a grant:

```text
resolve + authorize -> create session -> publish lifecycle cursor
                    -> submit sourced user text as the initial turn
```

`accepted` returns the complete session, accepted turn, and a replay cursor.
`created-initial-turn-failed` returns the complete created session, cursor, and
bounded failure code. The Channel core persists a binding for both outcomes;
it must not orphan or hide a real session merely because initial turn submission
failed. It may enqueue a failure notification for the partial outcome.

`rejected` contains no session or lifecycle cursor and creates no binding.
Follow-up dispatch uses the existing complete binding session, not workspace
resolution. A Channel `followup` starts one new turn and returns `accepted` with
the same session; a missing/stale/archived binding fails before dispatch. Adapter
parsers may select create versus follow-up from generic Channel route policy,
but no platform adapter is permitted to hard-code all inbound messages to
create.

The operation id is the durable correlation key from inbox record through
grant, Provider Fleet dispatch, lifecycle mapping, audit, and notification.
At-least-once Channel replay returns the prior durable operation result instead
of consuming a second grant or starting another turn.

## Launcher lifecycle ledger

The Provider Fleet owns a normalized lifecycle ledger independent of both raw
app-server notifications and the renderer current-connection Agent ledger. It
must subscribe to the already-owned provider connection; it must not create a
second Codex app-server or claim that an external provider is the Desktop
current connection.

Lifecycle sequence is contiguous per complete `(providerId, remoteSessionId)`
session. Event ids are stable, terminal turn events are unique, and committed
ranges are replayed from `afterSequence`. Adapter generation is recorded on
each event and stale callbacks from a retired generation are fenced before
commit. A snapshot reconciliation may recover a missed terminal fact and uses
`provenance=snapshot-reconciled`; it may not invent an approval or assistant
output that the provider cannot prove.

Version 1 lifecycle states are:

```text
turn.started -> approval.required -> approval.resolved -> turn.completed
     |
     +-------------------------------------------------> turn.failed
```

Approvals are optional and may repeat for distinct approval ids. Exactly one
of `turn.completed` or `turn.failed` terminates a turn. A completed event carries
only bounded user-facing text blocks. A failed event carries only a stable code
and retryable flag. Approval events carry opaque approval identity, bounded
kind, state, and result. Raw JSON-RPC messages, reasoning, command output,
filesystem paths, environment, credentials, and arbitrary diagnostics are not
event fields.

## Channel outbox projection

The launcher registers a durable lifecycle consumer for every accepted Channel
dispatch before it acknowledges the inbox operation. It correlates by complete
session, turn id, and operation id, then applies the route's notification list:

- `turn.completed` may enqueue one `completion` delivery using its normalized
  text output;
- `turn.failed` may enqueue one `failure` delivery using Host product copy for
  the stable code;
- `approval.required` may enqueue one `approval` delivery;
- `approval.resolved` may enqueue the configured resolved/expired delivery.

Lifecycle cursor commit and outbox enqueue are one durable Channel transaction,
or use an equivalent idempotent transaction key containing event id and route.
Restart resumes from the last committed sequence. The Channel outbox keeps its
existing retry, lease, generation, and adapter send semantics; a lifecycle
event is not itself an outbound message.

## Host consumption interface

A conforming Host may implement different internal types, but it preserves this
minimum shape:

```ts
interface ChannelTaskLaunchAuthority {
  resolveAndAuthorize(
    request: ChannelTaskLaunchRequestV1,
  ): Promise<ChannelTaskLaunchAuthorizationV1 | AskOrDeny>
  consume(grantToken: string, operationId: string): Promise<ResolvedLaunchTarget>
}

interface PlatformTaskDispatcher {
  create(grant: ResolvedLaunchTarget, input: SourcedChannelUserInput):
    Promise<PlatformTaskDispatchResultV1>
  followup(session: PlatformSessionRef, operationId: string, input: SourcedChannelUserInput):
    Promise<PlatformTaskDispatchResultV1>
}

interface PlatformTaskLifecycle {
  read(session: PlatformSessionRef, afterSequence: number, limit?: number):
    Promise<PlatformTaskLifecycleRangeV1>
  subscribe(session: PlatformSessionRef, afterSequence: number, listener: Listener): Disposable
}
```

`ResolvedLaunchTarget` is a non-serializable Host-owned value produced only by
successful atomic grant consumption. Public plugins, Channel adapters, and
renderer code never construct it.

## Compatibility and delivery order

Older Hosts reject or ignore these version-1 launcher-private contracts and
must keep real Channel task ingress unavailable. A Host may continue to run the
Channel simulator without task dispatch. It must not fall back to process cwd,
an arbitrary model, a renderer Agent ledger, a fabricated current connection,
or a second connection.

Delivery order is strict:

1. merge this protocol revision and pass protocol conformance;
2. implement the resolver/grant registry, Provider Fleet dispatcher/lifecycle
   ledger, generic Channel gateway, and durable outbox consumer in `cordisx`
   against that formal merge;
3. rebase adapter/consumer behavior on the formal Host merge and replace
   fixed-create parsing with create/follow-up policy;
4. update mono gitlinks only after the compatible formal owner commits exist.

Protocol schemas and vectors are only prerequisites. Production completion
requires Host unit/integration tests plus one authorized isolated real-provider
smoke; simulator or mocked app-server evidence cannot verify a real platform
task.
