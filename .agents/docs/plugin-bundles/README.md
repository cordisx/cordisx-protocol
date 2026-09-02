# Plugin bundles v1

Plugin bundles are Host-managed installation and policy objects. A bundle is
never executable, is never a plugin dependency target, and is never a runtime
permission principal. Every runtime capability remains authorized against the
concrete plugin identity that executes it.

## Explicit-local artifact

Version 1 accepts the existing explicit-local source descriptor. Its immutable
snapshot contains one `cordisx-bundle.json`, one README, an optional icon, and
one relative directory for every member plugin package. Member ids and exact
versions must match the package found at the declared path. Relative paths are
contained below the snapshot root and may not be symlinks. Bundle nesting is
not supported in version 1.

The Host stages all selected members before exposing an install plan. It then
compares each exact `(plugin id, version, digest)` with the active profile. The
same tuple is shared. A same-version/different-digest tuple is an integrity
conflict. A different active version is a version conflict. CordisX has one
active version for each plugin id.

The plan projects every exact current member permission id with plugin,
capability, scope label, required state, and an `ask` default. Installation
cannot proceed until each required entry receives an explicit choice.

## Claims and lifecycle

The durable bundle registry is revision fenced independently from the plugin
activation registry and each operation is also fenced by the current plugin
revision and runtime generation. A plugin can have any combination of:

- a bundle claim from each installed bundle that contains it;
- a direct claim created by direct installation or explicit adoption; and
- runtime-dependency claims from installed dependents.

Disabling a bundle removes only that bundle's enable intent. It does not remove
the bundle or its member claims. A member stays enabled when another active
bundle, a direct claim, or an enabled dependent still requires it. Uninstalling
a bundle removes only that bundle's claims. Shared, directly claimed, and
runtime-required plugins are retained. Only orphaned auto-managed members are
removal candidates, and the impact plan must be explicitly accepted.

Bundle application is a coordinated sequence over the existing single-plugin
package lifecycle. Members are installed dependency-first and removed in
reverse dependency order. The bundle journal records every member result. On a
failure the Host compensates already-applied changes in reverse order; an
incomplete compensation is `rollback-failed` and remains repairable in Manager.

## Permissions

Bundle permissions are a management policy over the exact permission ids
declared by the bundle's current member package digests. They are not wildcard
grants and do not apply automatically to permissions added by a future update.
New or expanded declarations start as `ask`.

For a shared plugin, active bundle policies combine using the fixed order
`deny > ask > allow`. A per-plugin override, edited from any affected bundle,
replaces that merge for the exact permission id and visibly affects every
bundle that shares the plugin. The Permission Broker persists and enforces the
result against the plugin identity; the bundle id is provenance only.

Removing or disabling a restrictive bundle must never silently widen a shared
plugin. The Host retains the prior restrictive value as a safety floor until a
separate, explicit permission review accepts the wider result. Bundle policy
updates affect inherited entries only. Clearing plugin overrides is a separate
confirmed action.

## Manager projection

The Host owns the complete Manager UI. The bundle detail header, above all
tabs, contains icon, name, status, authors, source, version, digest, update
time, and the available update/enable/disable/repair/uninstall actions.

The exact detail tabs are:

1. `README` — renders only the bundle README.
2. `Members` — required/optional state, requested and installed identity,
   sharing/provenance/conflicts, and member actions.
3. `Permissions` — the unified bundle policy, exact member declarations,
   per-plugin overrides, effective policy/source, and cross-bundle impact.
4. `Relations` — bundle claims, direct claims, runtime dependency edges, and
   the current enable/removal impact.
5. `Records` — bounded lifecycle, provenance, permission, compensation, and
   repair audit events.

There are no bundle configuration, runtime, logs, extension-point, or route
tabs. An executable coordinator is modeled as an ordinary member plugin.
