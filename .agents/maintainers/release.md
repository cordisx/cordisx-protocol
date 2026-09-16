# Protocol package release runbook

This is maintainer guidance for publishing `@cordisx/protocol`, separate from
[plugin distribution and activation](../docs/distribution/README.md). Follow the
[maintenance rules](../rules/README.md) and the authorized release scope.

## Release model

Each Protocol package release is identified by one Git tag on the canonical
repository. The tag has the exact form `v<semver>`, and the version after `v`
must equal both `package.json` and the root package in `package-lock.json`.
Create the tag only from a formally merged commit on `main`.

The single [release workflow](../../.github/workflows/release.yml) derives the
npm channel from that version:

- a stable SemVer publishes to `latest`;
- an `alpha` prerelease publishes to `alpha`;
- a `beta` prerelease publishes to `beta`;
- an `rc` prerelease publishes to `rc`.

Other prerelease identifiers are rejected. A prerelease sequence number is part
of the immutable package version, not an npm dist-tag. Do not create one workflow
or one dist-tag per release version.

The workflow uses the protected `npm-release` GitHub environment and npm Trusted
Publisher binding for `.github/workflows/release.yml`. It publishes with npm 12,
OIDC provenance, public access, and the channel derived from the Git tag.
`publishConfig` owns only the public npmjs registry and access mode; it must not
pin a channel.

## Prepare and publish

1. Update `package.json` and `package-lock.json` to the exact release version.
2. Run the release metadata and workflow checks, TypeScript build, distribution
   pack check, and package dry run required for the change.
3. Merge the release preparation through the normal protected `main` workflow.
4. Create and push the exact `v<semver>` tag at that canonical merge commit.
5. The tag push starts `release.yml`. The workflow verifies the tag, package
   version, tag commit, and membership in `main` before publication.
6. Verify the published immutable version, derived dist-tag, integrity, shasum,
   `gitHead`, repository identity, clean registry installation, and provenance
   with [verify-registry-release.mjs](../../scripts/verify-registry-release.mjs).

A local check, formal merge, Git tag, registry publication, Host
interoperability, and consumer acceptance are separate results. Record their
exact versions and source revisions when reporting a release.

## Registry bootstrap boundary

The first npmjs record for `@cordisx/protocol` was intentionally limited to
`0.1.0-alpha.0` under the `bootstrap` dist-tag. It exists only so the npm
organization can bind the canonical repository workflow as its Trusted
Publisher. It is not a consumer release, does not claim Trusted Publishing
provenance, and no Host, plugin, or other product package may depend on it.

That one bootstrap record was manually published with npm 12 after organization
owner authentication and 2FA. All subsequent consumer releases use
`release.yml`, the `npm-release` environment, and tag-derived channels.

On 2026-09-16, npmjs also assigned `latest` to the first public record despite
the explicit `--tag bootstrap`. After the first consumer release is published,
remove that automatic tag if npmjs permits it. If removal is rejected, move
`latest` to the exact consumer release so it never points to the bootstrap
alpha. Keep `bootstrap` on `0.1.0-alpha.0`.
