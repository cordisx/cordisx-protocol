# AgentLoop control v1

This additive [control service](../../../types/agent-loop-control.v1.d.ts) consumes
unchanged v4 task bindings. It does not replace or mutate frozen v4 commands.
The Host injects one principal-bound client alongside AgentLoop. Content events
remain available through the matching v4 subscription.

`submit` authorizes the exact task binding for turn submission and interruption,
then submits one ordinary turn with an absolute deadline, capped at ten minutes.
Owner, provider generation, binding and exact structural command identity fence
the operation. Duplicate command IDs replay their result, conflicting payloads
are refused, and uncertain provider submission must be reconciled rather than
repeated. `cancel` interrupts only the returned exact turn and requires control
authority. Cancellation or a deadline must never target a later turn.

The launcher owns deadline enforcement independently of renderer polling and
subscriptions. It must invoke the provider's real interrupt primitive. A Host
without a working interrupt adapter refuses controlled submission. A cancelled
or expired result cannot subsequently be promoted to successful completion by
late provider content. Consumers must check `read` before accepting an action;
the authoritative game server independently rejects late or stale moves.

Provider completion winning the race yields `already-terminal`. A successful
interrupt records `cancelled`; a deadline-triggered interrupt records
`deadline-exceeded`. Provider rejection or uncertain interruption is unavailable,
not a fabricated terminal state. Client disposal requests cancellation and
fences subsequent reads/submissions. Host shutdown cancels owned active work;
restart recovery must interrupt or reconcile a remembered expired turn before
re-enabling it.

The service runs the user's ordinary Agent with the provider's actual permission
and approval policy. Separate tasks separate conversation history; they do not
promise zero tools or an untrusted-code sandbox. A consumer sends only the
seat-visible observation, never server credentials or hidden game state. A Host
may advertise a separate strict data-only mode, but must report unsupported
when its provider cannot enforce that mode. Lack of strict mode does not disable
this ordinary user-owned execution path. Usage is not inferred from profile
aggregate differences or an interrupted turn's elapsed time.

`create` accepts a v4 create command, returning the v4 binding and task details.
It creates a user Agent in a Host-generated game working directory, unique to
owner and command ID. It inherits ordinary provider permission and approval
behavior; independent cwd is not a filesystem or tool sandbox. General v4
create behavior remains unchanged.
