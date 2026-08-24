# Host service configuration protocol

This specification is normative for configuration that belongs to a plugin's
launcher service rather than its renderer fiber. It reuses the Host-owned form,
revision, generation, last-good, and secret-slot principles from plugin
configuration without exposing a home-config writer or service bridge to the
renderer.

## Product and ownership boundary

A service descriptor appears only in the detail view of its owning plugin.
CordisX must not synthesize a global Providers category, copy provider-specific
fields into core settings, or let a plugin own Manager DOM. The plugin owns the
versioned schema, defaults, validation, localized field descriptions, and
application declaration. The Host owns form controls, accessibility, policy,
credential brokerage, persistence, restart orchestration, diagnostics, and
cleanup.

Every descriptor, mutation, and result carries the exact
`(source, pluginId, serviceId)`, `profileId`, and active Host generation. A
mutation outside that owner or generation fails closed. `expectedRevision` is
compared before validation, persistence, secret-reference changes, or restart;
the Host never retries a conflict implicitly.

Read and write authorization is evaluated by the Host for the exact service
identity and profile. A descriptor denied for write reports `writable=false`;
a stale or forged write still fails closed, and an otherwise well-formed write
without authority returns the auditable `permission-denied` error code before
validation, persistence, secret-reference changes, or restart.

## Schema and secret projection

The service contract supplies both a canonical protocol schema id and a
bounded Standard Schema/Schemastery projection. The schema id defines stored
launcher data. The projection supplies only form-safe metadata; it grants no
DOM, filesystem, process, or bridge authority.

Opaque `keychain:` and `host-secret:` references may exist in the stored
service document and in a Host-brokered mutation. Descriptors, form values,
results, errors, and diagnostics omit each reference and expose only an exact
field path plus configured state. A mutation that omits an existing secret
path preserves it. Plaintext credentials and inline secret schemes are invalid.
The Host may refuse all writes when it cannot prove complete secret positions.

## Runtime and startup planes

Each service descriptor declares exactly one `configApplies` mode:

- `service-restart` validates and stages one candidate, asks the owning service
  to restart, and publishes the new revision only after a new service
  generation reports ready. Failure removes the candidate and keeps the
  previous last-good revision active.
- `app-restart` stores a next-start candidate and returns `staged`. It does not
  change the active process snapshot or claim that a restart happened. While
  pending, the descriptor carries the desired `configuration`, redacted
  `activeConfiguration`, `restartRequired=true`, and distinct revision and
  last-good revision. Launcher readiness after a complete application restart
  promotes the desired revision.

One descriptor cannot switch modes based on submitted values. A product with
both planes declares separately identified service sections so the user can see
before saving whether a service restart or full application restart is needed.

## CLIProxy Providers v1

The built-in `cli-proxy-api` plugin declares two sections in its own detail:

- `providers-runtime` uses
  `cordisx.cli-proxy-provider-runtime-config/v1` and `service-restart`. It owns
  provider id/display name, enabled state, safe endpoint, opaque credential
  reference, model-id mapping, and request timeout.
- `providers-startup` uses
  `cordisx.cli-proxy-provider-startup-config/v1` and `app-restart`. It owns the
  executable and provider data directory used on the next application start.

Provider identity remains `providerId`; model and session identity remain the
composite `(providerId, modelId)` and `(providerId, remoteSessionId)`. Neither
schema aliases the external Provider Fleet to the native current connection,
and neither exposes raw transport or process handles.

Beyond JSON Schema, the owner validator rejects duplicate provider ids,
duplicate source/public model ids, multiple enabled default mappings, shared
normalized data directories, credential-bearing/query/fragment endpoint URLs,
remote plain HTTP, and startup overrides without a matching runtime provider.

## Compatibility

All documents are closed version 1 contracts. Unknown fields, status values,
application modes, identity fields, or secret schemes are rejected. Launcher
service configuration remains separate from renderer `Config`; a Host may show
both in one plugin detail only as independently identified sections with
independent revisions and application results.
