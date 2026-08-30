# Permission authorization protocol v3: certified controlled rendering

Status: normative additive successor to permission v2. Version 2 remains the
contract for the original 22 non-DOM capabilities. Version 3 keeps the same
Host-owned Permission Broker, decision engine, profile ledger, fingerprint,
scope, and generation rules and adds one runtime-declared controlled-rendering
capability.

## Two independent trust dimensions

Marketplace Official and Certified are independent booleans. A plugin may be
ordinary, Certified only, Official only, or both Official and Certified.
Official is publisher/maintainer identity for Marketplace presentation,
filtering, and bounded ranking only. It is never an authorization input.

Certified is an exact-artifact review assertion. It is not a general permission
grant. Every non-DOM capability, including all 22 permission-v2 capabilities,
continues through the ordinary explicit-user or persistent-policy path for all
four trust states.

## Controlled DOM capability

`ui.extension-points.render` is the only v3 capability initially classified as
`dom-rendering` and marked `certifiedImplicitApproval: true`. Its scope is a
non-empty exact set of Protocol extension-point ids. The runtime declaration is
the plugin's structured surface or outlet registration through the CordisX
extension-point API. It is not a plugin-manifest field, raw selector, DOM node,
callback, script, style, or renderer bridge.

All original capabilities are `resourceClass: non-dom` with
`certifiedImplicitApproval: false`. Catalog validation fails closed if a
non-DOM entry opts in, if any capability other than
`ui.extension-points.render` opts in, or if the v3 catalog is incomplete.
Availability remains a separate axis: certification cannot turn an unsupported,
unverified, inactive, unresolved, or not-mounted point into an available one.

An ordinary or Official-only runtime registration with policy `ask` requires an
explicit Host-owned permission decision before rendering. A Certified artifact
may use `authorizationMode: certified-implicit` only when all of these are true:

- the exact `source + pluginId + version + sha256 integrity` matches the active
  installed artifact;
- the Host verified the source against a locally configured Marketplace trust
  root and produced the certification projection itself;
- review policy/version, review and expiry time, evidence, feed root/authority,
  feed generation, fingerprint, and revision are present and current;
- the catalog entry is both `dom-rendering` and explicitly eligible;
- persistent policy is still `ask`; an explicit persistent denial wins;
- requested extension points are within the declared scope and remain available.

Schema validity never establishes certification. Plugins cannot submit a
certification projection or select `certified-implicit`. The Broker accepts the
projection only from its Host trust input and computes the authorization mode.

## Same Broker, grant, and ledger

Skipping the dialog is not skipping authorization. The single Permission
Broker creates a Host-owned generation lease with the same profile, canonical
source, plugin id, scope, catalog/security fingerprint, runtime generation, and
module generation constraints used by other grants. It records authorization
origin `certified-implicit` and the exact certification fingerprint/revision in
its audit readback. Persistent user policy remains in the single profile
ledger; certification never writes `allow-persistent`.

An explicit user decision has origin `explicit-user`. Existing persistent allow
or deny has mode `persistent-policy` and retains explicit-user provenance. An
Official record is deliberately absent from every permission key, plan,
decision, grant, lease, and audit shape.

Artifact update or rebuild, certification disappearance/revocation/expiry,
configured source removal, trust-root replacement, projection fingerprint or
revision change, scope expansion, catalog/security fingerprint change, plugin
disable/uninstall, runtime generation replacement, module generation
replacement, transaction abort, and process restart revoke the lease
immediately. Scope narrowing may be reconciled only by the existing permission
rules and never enlarges a lease.

## Plan and decision authority

Authorization plan v3 exposes one of three Host-computed modes per declaration:

- `explicit-user`: a Host prompt is required;
- `persistent-policy`: an existing exact persistent allow or deny applies; or
- `certified-implicit`: an exact valid certification allows a dialog-free
  generation lease for the eligible DOM capability.

Only the last mode carries the exact certification projection and it requires
policy `ask`. Authorization decision v3 is deliberately restricted to origin
`explicit-user`; no serialized plugin or UI input can forge the implicit mode.
The Manager may offer later explicit policy changes, but those are ordinary
user decisions and are not certification-derived.

Manager readback distinguishes the two grant origins and, for automatic DOM
approval, presents the exact artifact identity, review policy/version, review
evidence, expiry, trust root, and deterministic fingerprint/revision. It must
not call Official an approval or combine Official and Certified into one trust
state.

## Compatibility and migration

Permission v2 policy, plans, decisions, package v3, and plugin manifest v4 are
unchanged. A v2-only Host rejects the v3 runtime capability as unsupported and
therefore cannot render it. A v3 Host reads v2 policy records in the same
profile ledger and writes v3 records only for v3 keys. Historical extension
point authorization records may be imported once only after exact source,
plugin id, point scope, catalog fingerprint, and profile validation; the old
record is retired only after v3 write/readback succeeds. It is never consulted
as a parallel runtime grant.

Conformance covers the four independent trust states, explicit ordinary DOM,
implicit Certified DOM, Official-only non-bypass, all four non-DOM paths,
malicious self-claims, exact artifact mismatch, certification/source
revocation, scope expansion, and generation/disable/uninstall cleanup rules.
