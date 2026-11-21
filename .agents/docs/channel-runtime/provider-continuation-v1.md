# Channel provider continuation v1

`channel-provider-continuation/v1` is an explicit, Host-owned request to continue
an idle Channel task in a new native conversation with a different Provider and
model while inheriting its history. It does not change the meaning of frozen
[task settings v1](task-settings-v1.md). Older Hosts omit this capability and
must reject the request without changing a binding or starting a native effect.

## Authority and disclosure

The requester must explicitly select `history: "inherit"` for the exact source,
target Provider and model. The UI or command must disclose that the source
history can be sent to the target service. A Channel-originated request uses
the authenticated actor's source account, tenant and conversation; names do
not grant authority. The actor must currently have the exact task-model grants
for every changed field and destination. Local management remains local-user
authority. Existing denies and required approvals remain authoritative.

The Host must not silently expand an older model grant into permission to
transfer history. It must recheck actor, target, policy, current binding,
revision and catalog before the native effect and before moving a binding. If
the source has bindings whose scopes the request cannot authorize, the Host
must reject rather than move or disclose their shared history.

## Native effect and binding migration

Same-Provider model changes use the existing settings flow; they do not fork.
A cross-Provider continuation requires an idle source and no running, replying
or uncertain source job. The Host persists a single-use exact intent before
requesting a persistent native fork. The original native conversation and its
history remain intact. The Host must not send a business message through the
fork before confirming the destination identity, selected Provider and model,
working directory, execution and approval settings, and other required native
configuration without broadening permissions.

After confirmation, the Host atomically moves the authorized bindings and
their undispatched jobs to the new session, rechecking the source, policy,
revision and authority. A stale or revoked request must not move bindings.
The destination ID differs from the source ID and is exposed in the result;
completed source jobs and history remain associated with the source. A native
fork may preserve history that the destination service cannot consume; that
failure must be reported, not silently repaired or retried through another
Provider.

An unknown native effect is `unknown`, not a refusal or success. It is never
automatically repeated, and the source binding remains unchanged until a
supported reconciliation proves the effect. A known destination may be
reported for inspection, but is not silently deleted. An explicit native
preflight refusal with no fork effect is `rejected`. A timeout, disconnect,
unrecognized error or unconfirmed acknowledgement remains `unknown`.

An in-flight or unknown intent must remain fenced across downgrade: an older
Host must not ignore it and dispatch another source turn. A successor store that
an older Host cannot open is one way to enforce this. A capable Host must
reconcile or safely migrate the intent before the fence is removed.

This contract specifies behavior and authorization, not native runtime support,
Host adoption, a particular model service, or a release.
