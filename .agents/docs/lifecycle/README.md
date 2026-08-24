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
scope escalation instead of presenting a runtime or app restart as one-plugin
reload.

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
