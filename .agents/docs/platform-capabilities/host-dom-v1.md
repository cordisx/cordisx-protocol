# Host DOM access contract v1

This contract provides real but bounded read and modification access to
Host-owned interface roots. It does not expose the browser DOM API. A Host
adapter maps stable semantic roots and opaque node references to the current
renderer implementation. Plugin code receives only `BoundHostDomClient` and
serializable documents from `@cordisx/protocol/host-dom/v1`.

## Root catalog and scope

`host-dom-root-catalog.v1` is Host-authored and versioned by `catalogVersion`
and `hostGeneration`. A root descriptor provides a canonical `rootId`, Host
localized presentation, sensitivity, independent availability, and the exact
read/modify operations implemented for that root. A plugin may request only ids
present in the current catalog. An id is semantic; it is never a selector,
DOM path, element id/class, component name, Codex version detail, or private
renderer symbol.

The Host intersects four bounds before minting a handle: current root catalog,
manifest maximum scope, current Broker grant/lease, and adapter availability.
Every acquire explicitly selects exactly one capability family. A read handle
contains only read operations and binds the exact `ui.host-dom.read` lease; a
modify handle contains only modify operations and binds the exact
`ui.host-dom.modify` lease. Mixed-family acquisition is invalid. The handle is
opaque and bound internally to exact source/plugin/profile, root, operations,
security fingerprint, single permission lease, Host/runtime/module generations,
and owning bound client. It cannot cross a root, owner, profile, generation,
client, capability family, or lease. Revoking that family lease destroys the
handle even if the other Host DOM capability remains granted.

## Closed operation table

| Capability | Operation | Data exposure or effect | Reversibility and cleanup | Sensitivity |
| --- | --- | --- | --- | --- |
| read | `inspect-structure` | bounded semantic topology, opaque node refs, kind, depth, child count, same-owner bit | no mutation; refs expire with handle | sensitive |
| read | `read-text` | bounded user-visible text; Host redacts secrets/private regions and reports truncation/redaction | no mutation | sensitive |
| read | `read-attributes` | requested values from the closed safe attribute allowlist only | no mutation | sensitive |
| read | `read-state` | bounded visibility, enabled, focus, expanded, selected, and pressed state | no mutation | sensitive |
| modify | `set-text` | replaces bounded visible text at an allowed opaque node | Host snapshots/restores or removes the plugin-owned mutation on lease cleanup | high-risk |
| modify | `set-attribute` | sets one closed safe semantic/value/accessibility attribute | Host restores the prior value on cleanup; `class`, `style`, `role`, and event attributes are forbidden | high-risk |
| modify | `insert-owned-structured-child` | inserts only Host-rendered structured text/action data owned by the same plugin | child is removed automatically on lease loss | high-risk |
| modify | `remove-owned-child` | removes one child created by the same plugin and handle | idempotent; cannot remove native or another owner's child | high-risk |
| modify | `focus` | requests transient focus for an allowed opaque node | transient; no synthetic event or callback is returned | high-risk |

All arrays, strings, depths, attribute sets, projections, and child documents
are schema bounded. Read results state whether content was truncated or
redacted. Node references never encode a selector or renderer identity.
Structured actions use an owner-local command id. The bound Host resolves it
under the current plugin principal and its public command registry; qualified
cross-owner ids and private Host commands are invalid. Arguments are bounded
scalars. No function, `Event`, or native node crosses the boundary.

## Forbidden authority

The public schema and type surface contain no selector, DOM path, raw node,
HTML/SVG, arbitrary attribute, class, CSS/style, script, event handler,
function/callback, `document`, `window`, React/framework component, renderer
module, Electron object, native bridge, or private Host RPC. Unknown fields and
operations fail closed. A request cannot supply principal/profile/identity or
generation stamps and cannot name an unlisted root.

The Host must execute plugin code in an isolation boundary where ambient
`document`, `window`, renderer globals, and private bridges are unavailable.
API validation inside a shared renderer realm is not sufficient enforcement.
If a Host cannot provide that isolation, it reports Host DOM support as
`unavailable`; certification does not relax this rule. Every adapter call
revalidates owner, root, operation, lease, and generations immediately before
reading or mutating, and again before committing an asynchronous result.

## Lifecycle and failure behavior

`acquire` returns an opaque handle only after current authorization and
availability both succeed. `read` and `modify` use that handle and optional
opaque node ref. `release` is idempotent cleanup. Unknown roots, scope or
operation widening, owner mismatch, persistent denial, stale handles,
generation replacement, disable, uninstall, source/certification loss, and
expiry fail before adapter access. Late results are discarded and mutations or
owned children are rolled back.

Conformance validates valid acquisition/read/modify documents, the four trust
states, exact Certified binding, catalog completeness, scope families, and
lease invalidation. Negative vectors cover selectors, raw nodes/HTML, scripts,
styles/event handlers, private bridges, Official/Certified self-claims,
unknown/cross roots, scope widening, stale handles, generations, persistent
denial, disable, and uninstall.
