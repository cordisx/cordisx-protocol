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

## Bounded form presentation metadata

`schema.kind=schemastery` may carry the optional closed `schema.form`
projection defined by
`plugin-config-common.v1.schema.json#/$defs/formPresentation`. It is limited to
field paths, a small Host-owned icon vocabulary, semantic groups, and optional
save/reset icon hints. It never carries SVG, image URLs, CSS, component names,
DOM, selectors, callbacks, or popup targets.

The Host resolves icons and localized group copy itself; unknown or
out-of-scope metadata is ignored with a bounded diagnostic. `form.fields` is
unique by exact path. A Schemastery implementation can derive the same data
from its serializable `meta.extra.cordisxForm` annotations, but that annotation
is not a renderer grant and must normalize to this projection before
cross-process transport.

Array affordances are derived from the serialized schema, not presentation
metadata: a finite scalar union maps to a multi-select, and only a finite
primitive array maps to a tag input. Object arrays, unbounded arrays, and
unknown element schemas remain unavailable with a compact Host diagnostic.

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

## Configuration planes and application modes

Application startup configuration and runtime plugin configuration are
different planes. Startup configuration is resolved and frozen before the
current process starts. Examples include the Codex executable, debug port,
profile selection, launch environment, and other launcher arguments. These
values are not Manager global settings and cannot mutate the running process.
A future editor may stage a candidate only with an explicit “applies after app
restart” result. Removing a Manager page never removes the owning CLI parser,
launcher validation, redacted diagnostics, or process-start snapshot.

Runtime configuration belongs to the owning plugin detail. The descriptor,
not the editor, declares one application mode:

- `live`: validate, persist, atomically publish, and notify the active owner;
- `plugin-restart`: persist under the revision fence, recreate only the owning
  renderer plugin fiber, then publish the new last-good state;
- `service-restart`: persist, restart the owning launcher/service component,
  and publish only after that service reports the candidate active; or
- `app-restart`: persist a staged candidate without changing the active
  process snapshot; activation occurs only after a complete application
  restart.

`plugin-config-descriptor.v1` and `plugin-config-result.v1` remain closed with
`live|restart`; a v1 `restart` record normalizes to v2 `plugin-restart`.
Version-2 descriptor/result schemas carry the four explicit modes. Older
validators reject v2, and a v2 `service-restart` or `app-restart` record must
never be downgraded to v1 `restart`.

A plugin/service restart failure restores the previous config on the owning
component and keeps `lastGoodRevision` active. An app-restart write returns a
staged result rather than claiming runtime application. A persistence failure
never applies the candidate. If rollback itself fails, the owning component
becomes `failed`; the previous last-good value remains durable and the Host
reports a bounded diagnostic.
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
Block, plugin/service restart, failure, restore, generation replacement, or disposal removes
the registration and aborts/disposes active mounts. Reserved sensitive roles
cannot be selected or overridden by an ordinary plugin. A missing, invalid, or
throwing custom renderer falls back to the Host default control with an
attributed diagnostic.

## Compatibility

All documents use exact `version: 1` and reject unknown fields. Older hosts
reject these documents rather than interpreting them as Manager tabs or free
DOM contributions. A future breaking schema or lifecycle change requires a
new version and explicit migration behavior.

## Launcher service configuration is a separate plane

The `Config`/Schemastery contract applies to renderer plugin fibers. A
manifest-declared Node service that owns credentials, webhook or long-connection
transport, durable queues, or process-lifetime state must not tunnel its config
through a renderer plugin value. It declares an exact Host schema in the
versioned runtime manifest and exposes only a separate redacted Manager
descriptor. A service with no user configuration declares `kind=none` rather
than manufacturing placeholder fields.

Channel manifest v3 and `cordisx.channel-service-config/v1` are the first such
Host-owned contract. They reuse this protocol's revision fencing, candidate,
last-good, generation, and secret-redaction principles, but do not reuse its
ordinary default form or renderer mutation transport. A package may have both a
renderer `Config` and a Channel service config only as separately identified,
separately persisted, separately projected documents.

The generic `cordisx.service-config-*/v1` contracts extend that separate plane
to plugin-owned launcher services projected inside the owning plugin detail.
They do not turn service data into renderer `Config` and do not create a global
settings category. See `../service-configuration/README.md`.
