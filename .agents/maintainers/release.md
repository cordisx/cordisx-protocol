# Protocol package release runbook

This is maintainer guidance for publishing `@cordisx/protocol`, separate from
[plugin distribution and activation](../docs/distribution/README.md). Follow the
[maintenance rules](../rules/README.md) and the authorized release scope.

## Release inputs and verification

The configuration below was read from repository commit
[`be4905a7471e9829d2b834d9c3f17ac2404951f3`](https://github.com/cordisx/cordisx-protocol/tree/be4905a7471e9829d2b834d9c3f17ac2404951f3)
on 2026-09-05. It records a bootstrap-to-beta procedure, not evidence that the
registry record, Trusted Publisher binding, or consumer adoption exists.
Read the current [package metadata](../../package.json),
[release workflow](../../.github/workflows/release-beta.yml), and registry state
before carrying out or resuming the procedure.

- `npm run check` validates types, release configuration, and protocol conformance.
- `npm run check:distribution` exercises the packed package and consumer imports;
  see [check-distribution.mjs](../../scripts/check-distribution.mjs).
- `npm run verify:registry-beta -- --version <exact-version>` verifies a published
  beta; the release workflow supplies `EXPECT_GIT_HEAD` for source identity.
  See [verify-registry-beta.mjs](../../scripts/verify-registry-beta.mjs).

A local check, formal merge, registry publication, Host interoperability, and
consumer acceptance are separate results. Record their exact versions and
source revisions when reporting a release.

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
