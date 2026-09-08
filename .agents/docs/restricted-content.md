# Restricted content v1

Public types: [restricted-content.v1.d.ts](../../types/restricted-content.v1.d.ts).

`ctx.restrictedContent` renders validated declarative scene data in a caller-owned
element. It never evaluates author HTML, JavaScript, CSS, or URL resources. Author
render programs run outside the Host, under their execution service's independent
sandbox and budget. The Host receives only `{version: 1, root: Node}`.

Nodes are text, stack, grid and button; every object uses exact keys. Grids have
1–19 integer columns. A scene is at most 64 KiB UTF-8 JSON, 1024 nodes, depth 16,
and 400 children per container. Text and button labels have at most 2048 UTF-16
code units. Actions are finite JSON, at most 4 KiB UTF-8 and depth 16. Reserved
object keys `__proto__`, `prototype`, and `constructor` are invalid. Cycles,
nonfinite numbers, accessors and non-plain objects are invalid.

A mounted seat receives `{sequence, payload: scene | null}`. Sequence is a
nonnegative safe integer and strictly increases. Null clears the view. Invalid
updates preserve the last valid view. Buttons report `{sequence, payload: action}`
for the current view only. Detached or replaced controls cannot dispatch; owner
retirement and disposal remove content and listeners. The caller associates the
action with its authoritative player and room version. Author JSON is data, never
a credential, command or Host API capability.

Unavailable results are explicit and never trigger an executable-HTML fallback.
This contract does not turn other trusted plugins into a sandbox.
