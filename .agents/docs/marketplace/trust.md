# Marketplace Official Publisher and Certification v1

## Trust boundary

Official publisher identity and certification are two independent, composable
boolean dimensions issued through the protected CordisX Marketplace review and
merge chain. A plugin may be ordinary, Official only, Certified only, or both.
Neither is a plugin manifest field, a package signature, or a statement that
plugin code is absolutely safe. Until a cryptographic
attestation protocol is implemented, consumers must describe the protected
Marketplace merge chain as the trust root and must not present either record
as a signature.

A version-3 feed declares its root URL, authority, grant model, and the honest
`cryptographicAttestation: unsupported` boundary. A consumer activates trust
records only when the fetched source URL exactly equals both a locally
configured trust root and the feed's declared root. A custom or duplicate feed
cannot become trusted merely by copying these fields.

## Official publisher identity

`cordisx-official` means that the CordisX team creates and maintains the
plugin. Its v1 identity binds the stable plugin id, a repository in the
CordisX GitHub organization, the trusted `npm:@cordisx` publisher, the
`@cordisx` package namespace, and an exact package name. The designation can
continue across versions while every bound publisher/source value remains
unchanged. A repository, publisher, namespace, or package-name migration is a
new identity and requires a new Marketplace verification record.

Official status is a product identity assertion for this plugin, not blanket
trust in every artifact referenced by the same source. It affects Marketplace
identity, filtering, and the bounded Official search priority only. It never
changes a PermissionBroker decision. Official status does not mean that a
particular package artifact was reviewed.
A CordisX plugin can be official and uncertified; a third-party plugin can be
certified and unofficial. Revoking the official designation removes only the
official projection and its ranking boost.

The plugin's version-3 artifact projection must exactly match the official
record's publisher identity, namespace, and package name. A publisher/source
mismatch rejects the record rather than silently degrading it to Official.

## Exact artifact certification

Certification is an exact-version code-conformance review record issued through the
protected CordisX Marketplace review and merge chain. It is not a plugin
manifest field, a capability, a package signature, or a statement that plugin
code is absolutely safe. Until a cryptographic attestation protocol is
implemented, consumers must describe the protected Marketplace merge chain as
the trust root and must not present the record as a signature.

The only v1 level is `cordisx-certified`. A record binds all four package
identity fields:

- lowercase `pluginId`;
- semantic `version`;
- canonical public source; and
- `sha256` package integrity.

Changing any field creates a different subject. A new version or rebuilt
digest never inherits an earlier certification.

## Authority and review evidence

The only v1 reviewer authority is
`cordisx.marketplace.codeowners/v1`. The evidence reference must identify a
pull request or exact commit in `cordisx/marketplace`. Catalogs grant and change
records only in a CODEOWNERS-protected directory with deterministic CI
conformance. Package authors cannot grant certification through package or
manifest metadata.

An official record names the `cordisx-official-publisher` verification policy,
its verification instant, and its current `active` or `revoked` status. A
certification record names the `cordisx-marketplace-review` policy and its
semantic version, the review and expiry instants, and its current `active`,
`revoked`, or `expired` status. Both retain distinct `LocalizedText`
label/description values with a non-empty fallback.

## Status and revocation

Certification evaluation is deterministic against an explicit evaluation
instant. Marketplace CI evaluates against `generatedAt`; consumers re-evaluate
against their current time, which must not precede `generatedAt`:

- `active` requires `reviewedAt <= evaluatedAt < expiresAt` and no
  `revokedAt`;
- `revoked` requires `reviewedAt <= revokedAt <= evaluatedAt`;
- `expired` requires `expiresAt <= evaluatedAt` and no `revokedAt`.

A refreshed trusted feed replaces earlier status. Consumers must remove the
active projection immediately when the matching record is
revoked, expired, missing, or no longer matches the exact package identity.
Cached certification data is not an independent trust root.

Official revocation follows the same replacement rule without an expiry: an
`active` record has no `revokedAt`; a `revoked` record retains the exact
identity and a deterministic `verifiedAt <= revokedAt <= evaluatedAt` history.

## Consumer behavior

Consumers first reject incompatible, invisible, and policy-blocked records,
then compute text relevance. Official identity alone provides a bounded product
priority or tie-break only within an equivalent relevance tier. Certified does
not change search order. Official priority must never make a weak match outrank
an exact or otherwise stronger text match. A deterministic canonical identity
order resolves remaining ties, and the UI may expose independent Official-only
and Certified-only filters.

The Host owns two separate, stackable icons, tooltips, localization resolution,
accessibility, explanations, and cleanup. Neither designation creates an
independent information card. Official identity describes publisher/maintainer
provenance and never changes permission handling.

An active Certified record may produce a Host-owned
`marketplace-certified-permission-projection.v1` document. That projection is
an eligibility input, not a grant. It carries exact `source`, `pluginId`,
`version`, and `sha256` integrity together with review policy, review and expiry
times, protected evidence, configured feed identity, a deterministic
fingerprint, and a feed replacement revision. It deliberately carries no
permission names and no Official field.

The projection `revision` equals `feed.generatedAt`. Its `fingerprint` is the
lowercase `sha256:` digest of the UTF-8 JSON serialization of this object in
the exact property order shown here: `source`, `pluginId`, `version`,
`integrity`, `reviewPolicy`, `reviewedAt`, `expiresAt`, `evidence`, `feed`.
The nested object order is `reviewPolicy: { id, version }`,
`evidence: { kind, reference }`, and
`feed: { generatedAt, root, authority }`. Consumers validate both derived
fields before treating a projection as eligible.

Only the PermissionBroker's own versioned capability catalog may decide that a
specific DOM/rendering capability can omit an explicit confirmation. The
broker must still create and audit the ordinary scope-, profile-, runtime-
generation-, module-generation-, and security-fingerprint-bound grant or
lease. Every non-catalog capability follows the ordinary decision path.

A missing, revoked, expired, source-mismatched, version-mismatched, or
digest-mismatched certification produces no active projection. Permission
consumers must treat replacement or disappearance of the exact projection as a
revocation signal and withdraw certification-derived grants or leases.
Trusting a Marketplace or plugin source never grants all plugins or all
permissions from that source. Package, sandbox, sensitivity, and generation
lifecycle gates remain unchanged.

Certification is not a general permission grant. Every non-DOM capability
follows the normal Permission Broker path for ordinary, Certified, Official,
and combined Official plus Certified plugins. Permission protocol v3 defines
the catalog opt-in and exact lease semantics for the narrower controlled
DOM/rendering case. It never enables raw or untracked DOM access.
