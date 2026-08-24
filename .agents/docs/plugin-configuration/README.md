# Plugin configuration protocol

This specification is normative for CordisX plugin configuration discovery,
form projection, mutation, application, rollback, and custom renderer
lifecycle. It is host-neutral and exposes no filesystem path, DOM selector,
framework component, renderer callback, or launcher transport.

## Schema boundary

A plugin may export any synchronous Standard Schema validator as `Config`.
CordisX validates and normalizes the configured value before `apply(ctx,
config)` runs. Schemastery is the preferred complete implementation because it
also supplies serializable field types, defaults, constraints, localized
descriptions, roles, and renderer metadata.

A descriptor projects either:

- `schemastery`, with a JSON schema envelope the Host can render; or
- `standard`, which remains validation-only and therefore has no automatic
  field form. A Host may offer a bounded JSON editor or a plugin-owned Manager
  page, but must not infer UI semantics from an arbitrary validator.

The Host owns default controls, labels, descriptions, validation messages,
keyboard behavior, focus, `aria-*`, directionality, disabled/loading/error
states, and cleanup. Schema data never grants DOM ownership.

## Identity and scope

Every descriptor, mutation, result, and renderer snapshot carries a canonical
plugin identity and Host-generated scope:

- `profileId`: launcher-selected profile whose persistent composition is
  authoritative;
- `generation`: active renderer generation fence; and
- `source` plus `pluginId`: launcher-bound plugin identity.

The namespace is local to that plugin identity. An owner may register its
exact plugin id or a dotted child namespace. Plugins cannot submit another
owner, profile, or generation, and stale-generation operations fail closed.

## Layers, revision, and persistence

The descriptor separates a redacted resolved `value` from the optional raw
`user` layer. Field presence in `user` means overridden; an unset mutation
returns to the schema default. All public values are JSON-shaped.

`revision` is monotonic for one profile/plugin/namespace raw section. Every
mutation carries `expectedRevision`; a mismatch returns `conflict` without
validation, persistence, runtime application, or implicit retry. Persistence
is a launcher/Host operation under an exclusive read-modify-write lock and
atomic publish. Renderer plugins never receive a home-config path or direct
writer.

## Application modes

The plugin declares one mode; the editor cannot choose it per write:

- `live`: validate the candidate, persist it, atomically publish the new
  snapshot, and notify the owning plugin. `apply` is not called again.
- `restart`: validate and stage the candidate, persist it under the revision
  fence, dispose/recreate only the owning plugin fiber, and publish success
  only after the candidate fiber is active.

A restart failure restores the previous config on a fresh owning fiber and
keeps `lastGoodRevision` active. A persistence failure never applies the
candidate. If rollback itself fails, the plugin becomes `failed`; the previous
last-good value remains durable and the Host reports a bounded diagnostic.
Block/restore is orthogonal: a blocked plugin may accept a persisted candidate
but does not mount until restore, which starts from the latest validated
last-good value. Generation disposal cancels queued operations and rejects
late results.

## Secret and credential boundary

`secret`, `credential`, `credential-ref`, permission, and capability roles are
Host-reserved. Their values never appear in descriptors, schema defaults,
mutation results, diagnostics, or custom renderer inputs. A secret slot reports
only its path and configured state. Secret writes use a separate credential
operation owned by the Host; ordinary config `set`/`unset` does not carry them.

A Host must fail closed when it cannot prove that a serialized Schemastery
envelope's secret positions are completely discoverable. It must not expose a
partially redacted descriptor.

## Custom renderers

Trusted-local plugins may register field renderers by exactly one selector:

- Schemastery `role`;
- exact field `path`; or
- owner-bounded `namespace`.

The Host selects exact path before role before namespace, then numeric order
and stable registration identity. A renderer receives a Host-created field
container and bounded field controller; it never receives the settings header,
form root, another field, raw config document, secret value, or home-config
writer. The Host retains label, help, error, save/reset, dirty state, focus,
and accessibility ownership.

Registration and every mounted renderer are effects on the registering fiber.
Block, restart, failure, restore, generation replacement, or disposal removes
the registration and aborts/disposes active mounts. Reserved sensitive roles
cannot be selected or overridden by an ordinary plugin. A missing, invalid, or
throwing custom renderer falls back to the Host default control with an
attributed diagnostic.

## Compatibility

All documents use exact `version: 1` and reject unknown fields. Older hosts
reject these documents rather than interpreting them as Manager tabs or free
DOM contributions. A future breaking schema or lifecycle change requires a
new version and explicit migration behavior.
