# Distribution and Activation

## Frozen local-directory boundary

Version 1 accepts one user-selected local package directory through a
Host-owned broker. Marketplace feeds remain discovery-only. Remote retrieval,
publisher signatures, transparency, notarization, and untrusted-code isolation
are not implied by this contract.

That `plugin-package.v1` shape remains frozen for compatibility. The current
source contract is independently versioned so it can safely widen explicit
local inputs without changing the meaning of an already published package-v1
document.

## Explicit package source v1

`plugin-package-source.v1.schema.json` accepts exactly three user-explicit,
already local source forms:

- `local-directory`: a canonical local `file:` URL that is snapshotted before
  inspection;
- `local-package`: a canonical local `file:` URL to an explicit package or
  archive; and
- `downloaded-tarball`: a canonical local `file:` URL plus an attribution-only
  canonical HTTPS `downloadedFrom` URL.

An HTTPS URL is never the source `location`. A Marketplace entry remains
discovery only. A separate downloader may create a local tarball after an
explicit user action, but feed inclusion, HTTPS transport, and completed
download do not prove publisher identity, signature, transparency, or remote
trust. `downloadedFrom` contributes no activation or permission authority.

The optional `expectedDigest` is checked before manifest parsing or code
execution. For a package/tarball it covers the exact input bytes. A local
directory is first captured as a closed immutable snapshot; a concurrent file
change aborts capture rather than mixing revisions. Snapshot/import rejects
absolute or parent paths, duplicate normalized paths, case-fold collisions,
escaping links, special files, and bounded-size/count/depth violations.

`plugin-lifecycle-operation.v2` replaces only the inspection request with
`inspect-source`; install/update still consume an opaque immutable candidate
id. `plugin-lifecycle-result.v2` is the matching product-safe result. Version-1
operation/result documents remain frozen and are never upgraded by silently
mapping an archive to `inspect-local`.

The Host validates the manifest and package boundary, builds the browser
artifact, and computes a SHA-256 digest over the normalized manifest and built
artifact. The resulting content-addressed artifact is immutable. This digest
is local content integrity, not proof of publisher identity.

## Activation records

`plugin-activation.v1.schema.json` represents one profile-scoped active,
candidate, or last-good record. It contains the activation revision, last-good
revision, runtime generation, and each plugin's version, digest, module
generation, enabled state, dependency edges, and optional public canonical
source. Candidate records additionally carry a transaction id. They contain no
source or store filesystem path.

An implementation stages a candidate without changing the active record,
loads and checks readiness, then atomically replaces the active record and
increments the revision. Failure before publication retains the prior active
record and discards the candidate closure. `rollback-failed` is a distinct
failure and cannot be reported as success.

Durable publication must use a new file, sync, atomic rename, restrictive
permissions, and readback. On process recovery, an incomplete candidate is
aborted and the last committed activation wins. Immutable artifacts referenced
by active or last-good state cannot be garbage collected; other unreferenced
artifacts are eligible only for delayed cleanup.

## Manager snapshot

`plugin-runtime-snapshot.v1.schema.json` is the redacted Host-to-manager
projection. It contains product identity, dependency/dependent ids, current
status, available operations, favorite preference, and optional public share
source. Raw revisions and generations are top-level fencing values for Host
operations and diagnostics, not required normal-row copy.

`share` is invalid without `canonicalSource`. Favorite is a profile preference
and not an activation/package mutation. Destructive uninstall requires a
separately confirmed dependency-impact token. The protocol carries structured
data only; plugin-provided DOM, menu callbacks, filesystem paths, and secrets
are outside the contract.

## Registry bootstrap boundary

The first registry record for `@cordisx/protocol` is intentionally limited to
`0.1.0-alpha.0` under the `bootstrap` dist-tag. It exists only so the npm
organization can bind the canonical repository release workflow as its Trusted
Publisher. It is not a consumer release: it creates neither a `latest` nor a
`beta` dist-tag, and no Host, plugin, or other product package may depend on
it. An explicit version selector can technically retrieve any immutable npm
record; that does not make this bootstrap record supported or consumable.

The bootstrap package has the same canonical public export inventory and
distribution checks as the subsequent release. It must be manually published
with npm 12 only after the organization owner has authenticated with the
required 2FA. It is deliberately not published by `release-beta.yml` and does
not claim Trusted Publishing provenance.

After the npm Trusted Publisher has been bound to this repository's protected
`npm-beta` environment and `release-beta.yml`, the formal package metadata
returns to `0.1.0-beta.2` with the `beta` dist-tag. Only that successor may be
dispatched through the OIDC workflow with `--provenance`; consumer packages
must use that exact beta release rather than the bootstrap record.
