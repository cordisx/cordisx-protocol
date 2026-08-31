# Permission authorization protocol v5: Marketplace Certified automatic authorization

Status: normative additive successor to permission v4. Permission v5 changes
only the authorization-plan rule for an exact Marketplace Certified artifact.
Manifest v5, the 25 capability names and scopes, catalog v3 risk metadata,
policy v4 records, security fingerprints, and explicit decision v4 remain
unchanged.

## Certified source metadata

Certified is metadata on one configured Marketplace source record for one exact
`source + pluginId + version + sha256 integrity` artifact. It is not a plugin
manifest field. Official is an independent Marketplace ranking and identity
fact and is absent from permission plans.

When an exact active Certified projection is present, every declared capability
whose exact policy is `ask` uses `authorizationMode: certified-implicit` and
requires no explicit decision. The plan carries the existing Certified
projection for audit. The legacy `certifiedImplicitApproval` item field remains
the capability-catalog classification from v4; permission v5 does not use it as
a gate for Marketplace-wide automatic authorization.

The same Permission Broker, profile ledger, policy engine, scope and security
fingerprint validation, runtime/module generation fencing, grant or lease path,
and audit stream remain authoritative. Automatic authorization does not write a
persistent allow. An exact persistent deny continues to win. Absence, expiry,
replacement, or mismatch of the Marketplace projection restores the normal
explicit flow on the next install or enable and invalidates generation-bound
automatic grants.

Installations that do not resolve to a current configured Marketplace
Certified projection use the ordinary explicit flow. No Official or Certified
property is added to any manifest, and no plugin-supplied assertion participates
in this rule.

## Compatibility

Permission plan v4 is frozen and retains its DOM-only Certified rule. Hosts use
plan v5 for the Marketplace-wide rule. Explicit inputs continue to use
authorization decision v4 because automatically authorized declarations are
omitted from its `decisions[]`; no new plugin-authored input is introduced.
