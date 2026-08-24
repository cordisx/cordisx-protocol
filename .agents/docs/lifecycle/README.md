# Plugin Lifecycle

## Minimum apply scope

Lifecycle version 1 uses five closed scopes:

| Scope | Meaning |
| --- | --- |
| `config-live` | publish one committed configuration without another `apply()` |
| `plugin-restart` | recreate the owning fiber from the same module generation |
| `plugin-generation` | replace a package module plus its transitive dependents |
| `runtime-generation` | replace the shared Host renderer ABI/runtime |
| `app-restart` | restart only for process, profile, environment, or launch-argument changes |

Install, update, enable, disable, and uninstall use
`plugin-generation`. Explicit reload uses `plugin-restart`. A Host must reject
an operation whose calculated minimum exceeds the accepted plan. It may
escalate to `runtime-generation` or `app-restart` only by returning that level
in a fresh plan; it must not present either as a one-plugin hot reload.

## Graph and order

One profile activation has at most one version per plugin id. Every dependency
must name another activation entry with the exact declared version. Cycles,
missing dependencies, incompatible versions, duplicate ids, and an enabled
plugin depending on a disabled plugin are invalid.

Changing plugin `P` affects `P` plus all direct and transitive dependents.
Disposal runs in reverse dependency order and startup runs in dependency order.
Unrelated plugin generations remain active. Reload does not replace a module
and therefore does not expand to a dependent closure.

## Operation protocol

Every lifecycle request includes profile id, expected activation revision, and
current runtime generation. `inspect-local` is the only request that contains
an absolute local source directory. It produces a candidate id, integrity
digest, dependency impact token, and the existing permission authorization
plan; none of its output repeats the source directory.

Install or update consumes the candidate id plus a matching install/update
authorization decision. Enable may return a plan when it needs a decision and
then consumes a matching enable decision. Disable and uninstall consume an
impact token so confirmation cannot silently apply to a changed dependency
closure. A stale revision, runtime generation, candidate, authorization plan,
or impact token is rejected before mutation.

Operation/result v1 remains frozen around `inspect-local`. Version 2 replaces
that one inspection operation with `inspect-source` and the three-form
`plugin-package-source.v1` descriptor. The later install/update, enable,
reload, disable, and uninstall token flow is otherwise unchanged. A v1 Host
rejects v2 documents; it does not downgrade a local package or downloaded
tarball to a directory operation.

Version 3 preserves the version-2 source and lifecycle operations while
binding install/update/enable review to permission authorization plan and
decision v2. It does not change candidate, impact, revision, generation, or
rollback fencing.

The closed public outcomes are `planned`, `applied`, `conflict`, `rejected`,
`rolled-back`, and `rollback-failed`. A normal result exposes product-safe
package identity, affected plugin ids, operation scope, and a bounded error;
it contains no local/store path, configuration value, secret, renderer
callback, or private bridge.

## Ownership and fencing

All services, pages, routes, commands, surfaces, subscriptions, renderers,
configuration watchers, and other effects belong to the creating plugin fiber
and module generation. Disable, replacement, rollback, and uninstall fence new
calls before disposal. A call or handle from a disposed generation is stale and
must fail rather than reaching a replacement owner.

Module top-level execution is outside Cordis effect ownership. Package authors
must keep it declarative and start effects only in `apply()`. This is a
lifecycle requirement for trusted local code, not an isolation guarantee.

## Candidate and impact token contract

The public result deliberately projects only product-safe package identity and
`affectedPluginIds`. Complete execution fences are not duplicated into that
Manager-facing result. Instead, `candidateId` and `impactToken` resolve inside
the Host to one immutable plan containing:

- the complete affected closure;
- the exact expected active, candidate, and after-publication
  `plugin-activation.v1` tuples for every member;
- each tuple's id, version, SHA-256 digest, module generation, enabled state,
  exact dependency bindings, activation revision, and runtime generation;
- the bound authorization-plan id/decision and readiness policy; and
- reverse dependency drain/dispose order plus dependency-first start order.

Before mutation, the Host resolves the tokens and compares every expected
tuple—not only the requested plugin id—against the current active activation
record. A mismatch in revision, runtime generation, package identity,
module generation, dependency edge, permission decision, or closure membership
fails as stale without invoking plugin code. Result `affectedPluginIds` is an
auditable projection of this fixed closure, not the authority used to compute
or widen it.

## Staged registries, readiness, and publication

Candidate fibers must not write directly into live commands, pages, routes,
surfaces, outlets, services, configuration renderers/watchers, Agent, Channel,
Platform, or any other consumer registry. All candidate-visible registrations
and dependency bindings enter a transaction-owned staged registry. They remain
invisible to live consumers while the previous last-good activation is live.

The observable order is normative:

1. validate source/package/runtime manifests, integrity, compatibility,
   dependencies, and the complete permission authorization plan;
2. resolve candidate/impact tokens and fence the complete expected closure;
3. prepare every candidate fiber and effect into staged registries;
4. complete Host-observed entry, fiber, service, registry, and dependency
   readiness checks under a bounded deadline;
5. drain new work from the retiring closure where required;
6. atomically publish exactly once the complete staged registry/dependency
   closure together with its activation revision, runtime generation, package
   identities, and module generations; and
7. commit that published record as last-good, then dispose retired fibers in
   reverse dependency order and schedule deferred garbage collection.

There are zero candidate-visible live-registry changes before step 6. A live
consumer must never observe a new command with an old page, a new service with
an old dependency binding, or a new generation paired with the previous
package digest.

Failure before publication aborts/disposes the entire staged closure and leaves
the active/last-good record and all live registries unchanged. A candidate
crash after publish but before the last-good commit fences the candidate and
restores the complete prior last-good closure; the result is `rolled-back`.
Failure to restore is `rollback-failed` and cannot expose either closure as
healthy. On process recovery, an uncommitted candidate transaction is discarded
and the last durable active/last-good record wins.

## Permission activation gate

Install, update, and enable bind the existing formal authorization
plan/decision. Required declarations must resolve to usable authority before
candidate preparation can publish; unresolved `ask`, `deny`, a missing broker,
or a scope that cannot be enforced blocks activation. Optional denial or
unresolved optional authority leaves the plugin eligible to activate only with
that feature unavailable.

Persistent `allow`/`deny` continues to use the exact formal authorization key.
`allow-once` remains non-durable and is additionally bound by the Host-private
plan to the candidate package/module generation; abort, disable, replacement,
or generation disposal clears it. A new/widened capability or scope returns to
`ask`. Package inspection cannot translate or drop a runtime-manifest
declaration merely because the current authorization-plan schema cannot express
it; such a package remains incompatible/blocked until an exact plan and broker
exist.

## Disable, uninstall, and deferred collection

Disable fences new work, drains bounded in-flight work, aborts at the Host
deadline, then disposes the affected fibers in reverse dependency order. It
retains immutable package bytes, configuration, permission policy, and
last-good identity for a later enable/recovery.

Uninstall first computes the complete dependency impact. A required dependent
blocks removal unless the confirmed impact token explicitly includes disabling
the entire transitive required-dependent closure. Optional dependents receive
an explicit dependency-unavailable transition and restart only when their
contract requires it. Late calls from every disposed generation fail stale.

Logical uninstall atomically publishes the removed/disabled closure before
physical cleanup. Immutable artifacts remain leased while active, candidate,
last-good, rollback, dependent, operation, or bounded diagnostic references
exist. Collection is deferred until all leases drain; cleanup delay/failure is
diagnostic and retryable and never reactivates the package.

## Compatibility boundary

The activation fence wraps existing protocol registrations without changing
their payload meaning. Agent history/Trace, Channel, Platform composite scope,
plugin configuration, extension-point policy, and Manager settings tabs retain
their existing schemas, authorization, revision, and lifecycle rules.
Launcher-owned service configuration remains separate from renderer `Config`;
credential references, transport, queues, process lifecycle, and data
directories cannot be tunneled through package/runtime values or Manager
configuration results.
