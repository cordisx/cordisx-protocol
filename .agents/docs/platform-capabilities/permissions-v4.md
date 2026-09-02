# Permission authorization protocol v4: bounded Host DOM access

Status: normative additive successor to permission v3. Permission v4 preserves
one Host-owned Permission Broker, policy engine, profile ledger, authorization
plan, decision path, grant/lease lifecycle, audit stream, security fingerprint,
and scope-expansion rule. It includes the Agent/Session runtime capability
family and adds two Host DOM capabilities: `ui.host-dom.read` and
`ui.host-dom.modify`.

`ui.extension-points.render` remains the separate structured-contribution
capability from permission v3. It cannot be interpreted as direct Host DOM read
or modification authority. The 27 non-DOM capability entries remain
`resourceClass: non-dom` and are never upgraded by a Host DOM scope.

## Trust and authorization

Official and Certified remain independent, composable Marketplace facts.
Official affects Marketplace identity, filtering, and bounded ranking only and
is absent from all permission documents and keys. Ordinary and Official-only
artifacts at policy `ask` require explicit Host confirmation for both Host DOM
capabilities. Non-DOM capabilities require their normal confirmation in all
four trust states.

Only these three catalog entries are eligible for Certified implicit approval:

- `ui.extension-points.render`;
- `ui.host-dom.read`; and
- `ui.host-dom.modify`.

Eligibility requires an exact, active Host-generated Certified projection for
the installed `source + pluginId + version + sha256 integrity`, including the
current review policy, evidence, feed root/authority, fingerprint, revision,
and unexpired local deadline. `certified-implicit` suppresses the dialog, not
authorization: the same Broker produces an exact profile/scope/fingerprint/
generation lease and audit record. Certification never writes a persistent
allow. An exact `deny-persistent` policy wins before Certified evaluation.
Read and modify grants remain distinct: a bridge handle binds one exact
capability lease and never combines the two families.

Artifact/source/certification absence, revocation, expiry, digest or revision
replacement, root or operation expansion, catalog/security fingerprint change,
runtime/module/Host generation replacement, plugin disable/uninstall, process
restart, transaction abort, or bound-client disposal invalidates the lease and
every handle minted from it. Availability is orthogonal: certification cannot
make an unsupported, unknown, unmounted, or unavailable Host root usable.

## Manifest, package, catalog, plan, and policy versions

`plugin-manifest.v5` includes the Agent/Session runtime names and the two Host
DOM capability names. Each Host DOM declaration requires structured rationale,
a security declaration, non-empty canonical `rootIds[]`, and non-empty closed
`operations[]`. `plugin-package.v4` may reference manifest v1 through v5.

Permission common/policy/plan/decision v4 and capability catalog v3 add the
root/operation dimensions without changing prior keys. Catalog v3 contains 30
complete entries: 27 non-DOM entries, structured rendering, Host DOM read, and
Host DOM modify. Host DOM read is `sensitive`. Host DOM modify is
`high-risk`, defaults to `ask`, permits persistent denial, and does not expose
`allow-persistent`; an ordinary allow is therefore exact allow-once.

The Host canonicalizes and validates root ids and operation sets before
fingerprinting. A new root, operation, or capability is a strict scope
expansion and returns to authorization. A read declaration cannot contain a
modify operation, and a modify declaration cannot contain a read operation.
No other capability may carry either Host DOM scope dimension.

For optional Agent/Session capabilities whose Session id comes from a Host
route, manifest v5 accepts the closed declaration template
`sessionIds: { kind: "host-route-param", routeId, param }`. It is not a policy,
plan, decision, or grant scope. Permission v4 documents always contain the
Host-resolved exact `sessionIds: [id]`; empty and wildcard Session scopes are
invalid. See `../agent-runtime/README.md` for route ownership and replacement
fences.

## Authority and anti-forgery boundary

Plugins declare desired capability and maximum scope only. They cannot submit
Official/Certified fields, certification projections, authorization mode,
identity, profile, principal, grant, lease, generation, or audit origin. A
Host-bound client carries those facts outside plugin input. Authorization
decision v4 accepts only `origin: explicit-user`; Certified implicit authority
is computed and recorded internally by the Broker.
The Host accepts exactly one decision per planned capability and only when the
decision count plus canonical capability/scope/security-fingerprint tuple set
matches the current plan. Missing, extra, or conflicting duplicate decisions
fail before any ledger write or handle acquisition.

Manager readback must label automatic records as “Approved automatically due
to exact Certified review” (localized by the Host) and expose the exact
artifact, capability, roots, operations, review policy/version, evidence,
expiry, trust root, fingerprint/revision, and lease generations. It must never
attribute permission authority to Official.

See `host-dom-v1.md` for the root catalog, operation semantics, opaque bridge,
data bounds, and isolation requirements.
