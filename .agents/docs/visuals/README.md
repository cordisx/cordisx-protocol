# Visuals v1

Visuals v1 is a small, framework-neutral contract for optional plugin-rendered
decoration in a bounded Host-owned seat. The contract consists of an
owner-local provider id and a projection containing opaque data plus the
effective `light` or `dark` theme.

## Public values

A provider id matches `^[a-z0-9][a-z0-9._-]{0,95}$`. It is local to the calling
plugin owner. Two owners may use the same id. One owner may register an id only
once in a generation, and a consumer cannot qualify an id to select a provider
belonging to another owner.

`VisualData` is recursively JSON-compatible: null, boolean, finite number,
string, dense arrays, and plain string-keyed objects. `cloneVisualData`
validates the input, constructs a detached copy, and deeply freezes every
container. Functions, symbols, big integers, non-finite numbers, cycles,
accessors, sparse arrays, symbol keys, and non-plain objects are rejected.

The Host projects only `{ data, theme }` to a provider. No source object,
context, command authority, mount handle, callback, exception channel, or
provider ownership record is part of the projection. The JSON Schema describes
this projection for tools that need a serializable fixture; an in-process
framework binding may expose a structurally equivalent readonly object.

## Ownership and lifecycle

Registration is scoped by the injected visuals service to the calling plugin's
Cordis fiber and current module generation. Ownership is derived from that
service binding, never from caller-supplied data. Resolution combines the seat
source owner with the local provider id, so a matching id from another owner is
not a fallback.

Visual registrations participate in the existing CordisX plugin generation
transaction. This contract does not define another lifecycle store, operation,
receipt, generation identifier, or wire authority. Candidate registrations are
not visible before the surrounding generation publishes. A failed candidate
leaves the last-good generation visible. Replacement, rollback, disable,
uninstall, and Cordis fiber disposal remove only registrations owned by the
exact affected generation. Every registration and mounted effect must be
disposed with that fiber.

## Rendering boundary

The Host owns the seat container, dimensions, layout, accessibility, theme
selection, error boundary, and unmount. A provider owns only the content inside
the supplied seat through the public framework binding. Raw document access,
selectors, arbitrary markup injection, global style mutation, and private Host
state are outside this contract.

A provider exception is contained to its seat. The Host clears or replaces the
failed content according to seat policy, keeps surrounding controls usable, and
does not expose serialized framework output or exception details as Protocol
data. A failure cannot cause another owner's provider to render.

Status indicators, badges, and small charts are representative uses. They are
examples only and do not reserve provider ids or define product behavior.

## Trust and compatibility

This is a trusted in-process extension point, not a sandbox. Registration adds
no permissions and cannot widen the authority already granted to the owning
plugin. Version 1 has no downgrade representation: a runtime without the
visuals capability reports the capability as unavailable and leaves the
optional seat empty.
