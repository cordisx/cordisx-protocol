# Marketplace Official Publisher and Certification v1

## Trust boundary

Official publisher identity and certification are two independent trust
dimensions issued through the protected CordisX Marketplace review and merge
chain. Neither is a plugin manifest field, a capability, a package signature,
or a statement that plugin code is absolutely safe. Until a cryptographic
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

Official status does not mean that a particular package artifact was reviewed.
A CordisX plugin can be official and uncertified; a third-party plugin can be
certified and unofficial. Revoking the official designation removes only the
official projection and its ranking boost.

The plugin's version-3 artifact projection must exactly match the official
record's publisher identity, namespace, and package name. A publisher/source
mismatch rejects the record rather than silently degrading it to Official.

## Exact artifact certification

Certification is an exact-version provenance record issued through the
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
active projection and ranking boost immediately when the matching record is
revoked, expired, missing, or no longer matches the exact package identity.
Cached certification data is not an independent trust root.

Official revocation follows the same replacement rule without an expiry: an
`active` record has no `revokedAt`; a `revoked` record retains the exact
identity and a deterministic `verifiedAt <= revokedAt <= evaluatedAt` history.

## Consumer behavior

Consumers first reject incompatible, invisible, and policy-blocked records,
then compute text relevance. Official identity and certification provide
separate bounded boosts or tie-breaks only within an equivalent relevance
tier. Even their combined boost must never make a weak match outrank an exact
or otherwise stronger text match. A deterministic canonical identity order
resolves remaining ties, and the UI may expose a certified-only filter plus a
concise explanation naming each independently applied boost.

The Host owns two separate icons, tooltips, localization resolution,
accessibility, explanations, and cleanup. Neither designation creates an
independent information card. Certification is provenance information during
install review, while official identity describes publisher/maintainer
provenance. Neither grants permissions, bypasses sensitivity or the Permission
Broker, relaxes isolation, or skips package and generation lifecycle gates.
