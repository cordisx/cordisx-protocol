# Restricted content v1

Public types: [restricted-content.v1.d.ts](../../types/restricted-content.v1.d.ts).

`ctx.restrictedContent` renders validated declarative scene data in a caller-owned
element. It never evaluates author HTML, JavaScript, CSS, or URL resources. Author
render programs run outside the Host, under their execution service's independent
sandbox and budget. The Host receives only `{version: 1, root: Node}`.

Nodes are text, stack, grid, button and number-action; every object uses exact keys. Grids have
1–19 integer columns. A scene is at most 64 KiB UTF-8 JSON, 1024 nodes, depth 16,
and 400 children per container. Text and button labels have at most 2048 UTF-16
code units. Actions are finite JSON, at most 4 KiB UTF-8 and depth 16. Reserved
object keys `__proto__`, `prototype`, and `constructor` are invalid. Cycles,
nonfinite numbers, accessors and non-plain objects are invalid.

A mounted seat receives `{sequence, payload: scene | null}`. Sequence is a
nonnegative safe integer and strictly increases. Null clears the view. Newer invalid or rate-limited updates invalidate previous controls and consume
the sequence. The caller must publish a fresh sequence to recover. At most 30
new snapshots per second are accepted; controls are disabled synchronously during dispatch. A callback resolves
`accepted`, `rejected`, or `uncertain`. Only explicit rejection restores the
original enabled states, and only if owner, revision and sequence are still
current. Accepted actions remain locked until a fresh sequence. Uncertain,
throwing or invalid callback outcomes remain locked; the caller recovers with
the same idempotency key or disposes the seat. Buttons report `{sequence, payload: action}`
for the current view only. Detached or replaced controls cannot dispatch; owner
retirement and disposal remove content and listeners. The caller associates the
action with its authoritative player and room version. Author JSON is data, never
a credential, command or Host API capability.

Unavailable results are explicit and never trigger an executable-HTML fallback.
This contract does not turn other trusted plugins into a sandbox.

Number-action fields `min`, `max`, `step`, and `value` are safe integers;
`min <= value <= max`, `step > 0`, and `(value - min) % step === 0`. The
difference must also be a safe integer. `valueKey` is a nonreserved ASCII
identifier of at most 64 characters. The renderer clones the JSON object action
and inserts the validated integer at that single own key; the result must fit
the action budget. Button `ariaLabel` optionally supplies an accessible label
of at most 2048 code units.
