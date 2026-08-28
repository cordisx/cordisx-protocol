# Extension Point Control Plane v1

This document is normative for the version-1 extension-point control plane. It
augments the existing structured surface and outlet protocols. It does not add
a free-form DOM slot.

## Boundary

The Host owns native-node discovery, DOM lifetime, layout, accessibility,
events, cleanup, and the final render tree. A plugin names a semantic extension
point and submits structured data. A plugin never receives a selector, native
node, mutable DOM handle, native callback, event object, or CSS authority.

The control mode names describe Host behavior, not plugin DOM privileges:

- `compose` merges an existing structured contribution using the point's normal
  deterministic order;
- `replace` asks the Host to render one authorized structured presentation in
  place of the point's native presentation;
- `overlay` asks the Host to render an authorized Host-owned layer at the
  semantic point;
- `proxy` exposes only catalog-declared renderer-safe property projections and
  Host-brokered commands. It never proxies a native callback or event object;
- `hide-native` asks the Host to hide the point's native presentation while the
  Host retains ownership, restoration, accessibility, and cleanup.

A Host may implement one mode by hiding its native subtree and mounting a
Host-owned structured renderer. That is an implementation detail and grants no
native-tree access to the plugin.

## Four separate decision layers

The following layers must remain separately inspectable. One layer must not be
treated as evidence for another.

1. **Claim declaration.**
   `extension-point-control-declaration.v1` records the canonical source,
   plugin, point, claim, contribution, requested mode, priority, and requested
   bindings after the Host normalizes them against an out-of-band launcher
   principal. This means only that the plugin wants to modify a point.
2. **Authorization.**
   `extension-point-control-authorization.v1` records an exact user/Host policy
   for `(principalHandle, source, pluginId, pointId, claimId, mode)`. Denying
   one tuple disables only that claim. It is not a whole-plugin block and must
   not silently deny a different point or mode.
3. **Point policy.**
   `host-extension-point-control-catalog.v1` declares the modes, compatibility,
   exclusive groups, selection authority, native fallback, safe bindings, and
   ownership graph supported by the Host. A plugin cannot expand this policy.
4. **Runtime resolution.**
   `extension-point-control-snapshot.v1` is a Host-authored, generation-stamped
   result. It lists every normalized candidate and its authorization and
   selected, eligible, denied, conflicted, suppressed, or pending state. A
   declaration or grant is not proof that a candidate is selected.

`principalHandle` is an opaque Host/launcher-issued reference into a
Host-private principal registry. The registry binds the handle to canonical
source, plugin id, and explicit or legacy origin. It is out-of-band context,
not a plugin claim. The Host stamps it onto normalized declarations,
authorizations, snapshot candidates, command accesses, and events, then rejects
unknown handles or any source/plugin/origin mismatch. The Host control catalog,
snapshot authority, command result, and event authority are likewise
Host-derived; a plugin-provided field cannot override them.

Principal uniqueness is `(source, pluginId, origin)`, not only source and plugin
id. The same installed owner may therefore have one `legacy-structured` handle
for normalized old contributions and a different `explicit` handle for v1
claims at the same time. A handle belongs to exactly one origin and cannot be
reused across origins or owners.

Install and enable planning may persist multiple exact authorization records so
the user can allow a plugin while disabling selected points or modes. The Host
must present these partial effects before applying activation.

## Compatibility normalization

Existing structured `surface-contribution.v1` through v7 inputs remain valid.
When a Host projects them into this control plane, it creates a normalized
`legacy-structured` claim with:

- `claimId` equal to the contribution id;
- mode `compose`;
- `legacyOrder` equal to the existing structured contribution order;
- priority equal to `-legacyOrder`, preserving the
  legacy ascending-order result under the v1 descending-priority resolver;
- empty requested properties and commands.

Every v1 point policy must retain `compose` as `ordered`, outside every
exclusive group, with default authorization `allow`, even before a legacy claim
is loaded.
Every other mode defaults to `deny`. A legacy contribution therefore keeps its
old structured behavior but cannot acquire replacement, overlay, proxy,
hide-native, or binding authority. `free-dom`, selectors, raw HTML, arbitrary
CSS, and callback-bearing descriptors are not compatibility modes and must be
rejected.

Existing `extension-point-policy.v1` records continue to gate the compatible
structured contribution. A Host may map an exact v1 point denial to the
normalized compose claim, but must never map an allow to a non-compose mode.

## Point policy and conflicts

Each point declares a closed mode list. `coexistsWith` is explicit and
reciprocal. Two different selected modes may coexist only when both mode
records name the other. Absence means conflict; the Host must not guess that an
overlay or proxy is stackable.

An `ordered` mode may select multiple authorized candidates in deterministic
priority and owner order. An `exclusive` mode belongs to exactly one exclusive
group whose cardinality is `one`. The group declares either `user` or
`host-priority` selection and whether the native presentation is a valid
fallback. Replace, hide-native, overlay, and proxy are not globally forced into
one fixed relationship: their actual exclusion and stacking are declared by
the point catalog.

Cardinality belongs to an exclusive group, not to an individual mode. Across
all modes named by one group, exactly zero or one claim may be selected. One
Host group decision exists for every group on a non-suppressed point: a
`selected` decision names exactly its sole selected owner-qualified claim,
while `native` and `none` name no claim and require zero selected claims.
Every selected exclusive claim refers back to that exact decision. A point with
multiple exclusive groups is valid only when every pair of modes from different
groups declares reciprocal coexistence, because one winner from each group can
be active simultaneously in v1.

For a `user` group, only a Host-persisted user choice selects a claim. For a
`host-priority` group, the Host sorts by descending priority and then canonical
source, plugin id, point id, claim id, and mode as stable ascending tie
breakers. It stamps that decision as `host-policy`; `host-priority` is the
catalog algorithm, not a runtime authority value. Plugins cannot self-select.
Every selected candidate and group decision is owner-qualified and stamped with
`authority` and the exact Host generation.

Host-priority resolution is unconditional. The Host first computes the complete
authorized, non-pending eligible set for that group. A non-empty set must yield
`selected` for its exact deterministic top claim. An empty set yields `native`
when `nativeFallback` is true and `none` when it is false. A Host-priority group
cannot publish user choice, choose native despite an eligible claim, or choose
none despite an eligible claim.

The runtime resolution order is:

1. normalize explicit and legacy structured claims;
2. apply exact claim authorization, falling back to the catalog mode default;
3. evaluate ancestor ownership suppression as a transitive closure;
4. resolve every exclusive group before an ordered mode, using its declared
   authority;
5. sort authorized ordered candidates by descending priority and the same
   canonical owner-qualified tie breakers; select each candidate only when its
   mode is reciprocally compatible with every already-selected mode, otherwise
   mark it conflicted;
6. project only requested, catalog-declared bindings to selected candidates;
7. publish one revision atomically.

The Host snapshot is complete, not an activity sample. Its point-id set exactly
equals the control catalog point-id set. Every normalized declaration appears
as exactly one candidate, including denied, pending, conflicted, and suppressed
claims, and every candidate has exactly one declaration. Missing points or
claims fail closed. Selected ordered claims carry `authority: host-policy`, no
exclusive group, and a contiguous zero-based `rank` matching the deterministic
priority/owner ordering. Selected exclusive claims carry no rank and use the
authority and group from their exact decision.

Authorization and presentation state are separate axes. A denied descendant
under an owning ancestor keeps `authorization: denied` while its effective
presentation `state` is `suppressed`, so both causes remain visible. Suppression
takes precedence only for the presentation state. When the ancestor releases
the subtree, the Host reevaluates the retained authorization; that candidate
becomes `denied`, never `eligible` or `selected`. Outside a suppressed point,
an authorization denial must always publish candidate state `denied`.

## Safe properties and commands

The catalog's `safeProperties` are immutable renderer-safe scalar schemas. The
Host validates every projected value against its declared type, nullability,
and optional enum. Sensitive values, objects, handles, nodes, functions, event
objects, and values outside the declared enum are invalid.

For example, a reasoning point may declare a read-only
`reasoningIntensity: "low" | "medium" | "high"` property. This is the
structured equivalent of `props.reasoningIntensity`; it is not a reference to
native application state.

The catalog's `safeCommands` are always `host-brokered`. A selected claim may
invoke `extension-point-control-access.v1` only for a command it requested and
that the Host projected as available in the same generation. Arguments are
bounded named scalars validated against the catalog. A command such as
`setReasoningIntensity({ value: "high" })` is the structured equivalent of an
`onChange` request. No callback function is serialized into a descriptor.

The Host reauthorizes every invocation against the current canonical claim,
selection, availability, arguments, and Host generation before dispatch. The
matching `extension-point-control-result.v1` is a Host-stamped no-data
acknowledgement: `accepted` or `rejected`, stable reason, revision, generation,
and invocation id. Phase 1 commands never return an arbitrary business result.
State changes are observed through a later safe property projection or
versioned event. A future command result that carries business data requires a
new catalog-declared result schema and protocol version. The plugin never
receives a native callback, handle, or unknown dispatch object.

The catalog's `safeEvents` are always `host-projected`. A selected claim may
receive `extension-point-control-event.v1` only for an event it requested and
that the current snapshot projects as available. Every event is Host-authored,
generation-fenced, monotonically sequenced, and contains only catalog-validated
named scalars. An event subscription never exposes `addEventListener`, a native
event, or a plugin callback to the Host.

## Nested ownership and restoration

The catalog forms a directed forest through `parentPointId`. Cycles and unknown
parents are invalid. A parent with ownership scope `subtree` declares the exact
modes that suppress descendants. When one such claim is selected:

- every mounted descendant in the parent closure becomes `suppressed`;
- every descendant candidate becomes `suppressed` and publishes no group
  decision or binding;
- the snapshot carries the selected ancestor claim, exact parent path, reason,
  and Host generation;
- suppression is transitive even when an intermediate point is not mounted.

When the ancestor no longer owns the subtree, descendants are not blindly
restored from an old render. The Host reevaluates them from the same current
generation, catalog, declarations, authorization records, and user choices,
then publishes a later revision. A missing mount or dependency may remain
  `pending` or `not-mounted`; restoration is not evidence of selection.
Suppressed points skip the otherwise mandatory group-decision set and must
publish zero decisions. After restoration, the Host recomputes and publishes
the exact decision set for every catalog group before selecting an exclusive
claim.

## Security and downgrade behavior

All control-plane documents are closed schemas. Unknown authority values,
DOM fields, selectors, callback-shaped arguments, unknown bindings, unlisted
modes, and non-scalar property projections fail closed.

Canonical identity and `origin` are never self-asserted authorization evidence.
The Host validates them against the private principal handle before any claim,
grant, candidate, access, or event participates in resolution. Registration
order is never a tie breaker.

A consumer that does not implement this control plane ignores these new
documents and continues to process the separately versioned structured UI
formats. It must not reinterpret a control claim as a legacy slot. A consumer
that implements the control plane but does not recognize a schema version must
reject that document and preserve the native/last-good presentation.
