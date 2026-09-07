# Agent task permission v1

This independent contract adds Host-verified task sources for approval maximum
scopes in runtime manifest and package v12. It complements
[task binding v1](../agent-task-binding/README.md); it changes no frozen task,
approval, route, permission-plan, or outcome document. Public declarations are
[`agent-task-permission/v1`](../../../types/agent-task-permission.v1.d.ts),
[`plugin-manifest/v12`](../../../types/plugin-manifest.v12.d.ts), and
[`plugin-package/v12`](../../../types/plugin-package.v12.d.ts).

## Declarations and coexistence

A plugin declares one capability per name. Both new declarations require
`required: false`. A selector is exactly
`{ kind: 'agent-task-command', commandId: '<declared command id>' }`; Host
validates the command against the authenticated owner's current declarations.
Unknown commands, wildcards, Room ids, arbitrary Session selectors, and
unscoped approvals do not qualify. Optional rationale and security metadata
retain their existing meanings.

```json
[
  {
    "name": "approvals.request",
    "required": false,
    "scope": {
      "task": { "kind": "agent-task-command", "commandId": "chatroom" },
      "sessionIds": { "kind": "host-route-param", "routeId": "room-session-detail", "param": "sessionId" }
    }
  },
  {
    "name": "approvals.answer",
    "required": false,
    "scope": {
      "taskRequester": { "kind": "agent-task-command", "commandId": "chatroom" },
      "authorityRequester": {
        "kind": "approval-authority-requester-route",
        "requester": { "kind": "host-route-param", "routeId": "room-session-detail", "param": "sessionId" }
      }
    }
  }
]
```

The route fields are optional. Task-only declarations and the existing pure
route declarations are valid; duplicating the same capability is not a way to
combine them. In a combined declaration the Host selects one source branch
from authenticated operation provenance, before checking permission. It never
combines a task requester with an unrelated route authority or unions Session
sets. Ordinary non-task Session approvals retain the existing exact route and
v8 correlation checks. These additions do not alter those checks.

A required task's durable provenance is sticky even when its live registration
or source disappears. Failure, revocation, restart, stale generation, or missing
task evidence MUST deny or return unavailable for that task branch; it MUST NOT
fall back to a route branch, even on a matching active route. Missing provenance
must not be treated as evidence that a known required task is an ordinary
Session. A Host unable to determine that distinction fails closed. Arbitrary
pages, Shell origins and Room ids grant neither branch.

## Host task source

[`agent-task-permission-source.v1.schema.json`](../../../schemas/agent-task-permission-source.v1.schema.json)
projects Host evidence; it is not accepted as caller authentication. The Host
constructs it only by reading its existing owner/profile task store and current
required-handler registry. It contains exact `owner`, `operationId`,
`commandId`, reserved `sessionId`, persisted `definition`, `taskRegistrationId`
and `connectionGeneration`, with the fixed v1 envelope and `host-agent-task`
kind. `taskRegistrationId` identifies the current task binding handler set,
not an approval/v3 resolver. Generation numbers use existing positive
integer generation semantics.

The durable operation MUST have `bindingPolicy: required`; command, definition,
owner and reserved Session MUST match its canonical intent. The actual live
Agent must belong to that exact reserved Session and definition. Its native
identifier cannot substitute for a Protocol SessionId. Source installation
happens only after the durable approval-installing checkpoint and successful
Agent creation, with a current matching handler registration, before the first
submission. Partial installation cleans up its live sources and handlers.
Source installation does not require the final task acceptance receipt: real
approval can occur during the first submission. A plain task, arbitrary existing
Agent, copied source object, or caller-supplied operation metadata cannot acquire
this authority.

Before each use the broker MUST read back and exactly match Host-owned source
registration, durable intent, current owner generation, connection generation,
command registration and live Agent. A schema-valid object is insufficient.
Handlers registering or retaining bindings check declarations and registration
availability only; they do not mint permission, run an approval callback, or
require a future authority to have been selected. Actual `approvals.request`
authorization occurs for the native approval request and materializes only
`{ sessionIds: [source.sessionId] }` in the existing permission broker.
Creation, submission, Agent access and Session reads retain their separate
existing permission checks. This contract does not authorize those operations.

## Accepted routing and answer lease

Only an actual accepted approval/v3 routing result may lead to an
[`agent-task-approval-authority-lease.v1.schema.json`](../../../schemas/agent-task-approval-authority-lease.v1.schema.json)
lease. Its `taskSource`, `routingId`, resolver `registrationId`, `requester` and
`authority` must exactly match the Host's pending routing invocation and live
registrations. Both Agent bindings retain the existing exact Agent id, Session
id, Agent generation and definition checks; requester Session and definition
must match the task source. Authority must be a real live same-owner Agent,
validated through existing approval/v3 routing and answerer registration. It
need not itself be a task of the declared command. No arbitrary Agent search,
Room membership, claimed Leader label, or business `toolScope` establishes it.

The broker materializes only `{ sessionIds: [authority.sessionId] }` for
`approvals.answer`, verifies the Host-held pending correlation and current
policy, then issues the bounded lease. A provisional correlation is not a
usable lease. The two capability grants remain independent: request permission
never implies answer permission. Host lease identity and registry readback,
not structural equality alone, establish provenance. No plugin mint method or
new ledger is added. Legacy routing or a fabricated v3 result cannot mint this
lease; unsupported task authority must return unavailable. Existing policy prompts, owner identity, store, audit and
permission lease machinery remain authoritative.

Root self routing (`requester` equals `authority`) is explicitly supported in
this task branch when both are the same real binding. It still requires actual
request and answer permissions and a real human decision through the existing
answer handler; self routing is not model self-approval. Child-to-Leader routing
uses the exact accepted authority and the same grant gates. No new approval
outcome is introduced and no default allow is inferred from task creation,
registration, a permission grant, or lease issuance.

The lease is bounded to its one routing/approval invocation. Approval completion,
requester or authority disposal/replacement, resolver or answerer removal,
required-handler removal, owner replacement/uninstall, connection replacement,
or policy revocation invalidates it and aborts pending callbacks. Late answers
cannot apply effects. Asynchronous policy checks must recheck these fences on
return, before publishing a grant or consuming an answer. Closing one invocation
must not abort unrelated siblings. Durable operation identity survives restart;
live sources, registrations, handles and leases do not. Replay or recovery never
silently revives grants or removes the durable required policy.

## Compatibility and security

Runtime manifest v12 retains every v11 capability/service family and adds the
closed task capability alternatives. Package v12 retains the v11 source,
integrity, distribution, dependency, runtime ABI and byte-digested runtime
manifest semantics, adding only manifest v12 to its accepted schema set. All
v1-v11 documents stay frozen. Unsupported Hosts reject v12 or honestly expose
the feature as unavailable; consumers must not strip task scopes, downgrade to
unscoped approvals or fabricate routes to obtain access.

Maximum-scope declarations and all source branches participate in immutable
manifest fingerprints and existing authorization policy matching. An old route
allow record cannot implicitly authorize the new task source. Changing command
or source kind invalidates incompatible reuse. Policies must describe the
command-bounded maximum scope and the exact runtime requester/authority; they
must not present it as all Sessions or all Rooms. Source projections contain no
cwd, native handles, credentials, prompt text or arbitrary business payload.

The trust boundary is Host provenance plus existing broker policy, not plugin
claims. Conformance tests schema closure, branch isolation, exact correlations,
root and child routing, revocation and post-await fencing. Passing Protocol
conformance proves neither Host adoption nor installed native/UI acceptance;
consumers must test both ordinary route and task paths with their real broker.
