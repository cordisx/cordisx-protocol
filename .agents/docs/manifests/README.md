# Plugin package manifests

## Frozen package manifest v1

`plugin-package.v1.schema.json` is the frozen compatibility manifest from the
first local-directory contract. Its conventional filename is
`cordisx.plugin.json`. It embeds one runtime manifest v1. A v1 consumer must
continue to validate that exact shape; it must not interpret a v2 package by
dropping the separate runtime-manifest reference.

A valid package declares:

- one stable local plugin id and semantic package version;
- one package-relative browser entry ending in `.js`, `.mjs`, or `.ts`;
- optional package-relative Markdown README and public canonical HTTPS source;
- exact runtime ABI 1 and protocol 1 compatibility;
- exact-version plugin dependencies; and
- one runtime manifest v1 containing the capability authorization request.

The package id and runtime-manifest id must be equal. Dependency ids are
unique and cannot contain the package itself. Exact dependency versions make
the version-1 activation graph deterministic; version ranges require a later
resolver contract rather than implementation-specific interpretation.

The entry and README are logical paths inside the selected package directory.
They never authorize `..`, absolute paths, URL entries, symlinks escaping the
package, or arbitrary renderer loading. A Host resolves and validates them
before building an immutable artifact.

`canonicalSource` is optional and is never an installation instruction. It is
the only package value eligible for a manager share action and must be a public
HTTPS URL without query or fragment. A local source directory or package-store
location is never a canonical source.

Runtime manifest versions other than v1, multiple entry realms, Node services,
conditional dependencies, version ranges, and package signing are outside the
package-v1 contract.

## Package manifest v2

`plugin-package.v2.schema.json` is the current explicit-local package
contract. Package metadata and runtime authority are separate documents. The
package manifest contains id/version, entry and README paths, local
distribution truth, Host/protocol compatibility, exact dependencies, and a
runtime-manifest reference consisting only of package-relative path, exact
schema id, and SHA-256 digest.

The referenced runtime document validates independently as
`plugin-manifest.v1`, `.v2`, or `.v3`. Its `id` must equal the package id. It
continues to own capabilities, maximum scopes, reasons, and service
declarations. The Host must not copy, widen, drop, or reinterpret them while
building the package candidate. Every referenced runtime schema must also
appear in `compatibility.protocolSchemas`; an unknown required schema blocks
activation instead of being discarded.

This separation preserves existing authority families. Agent history/Trace,
Channel, Platform composite scopes, extension points, and settings tabs keep
their own schemas and brokers. In particular, manifest-v3 launcher service
configuration is not renderer `Config`: credentials, transport, durable
queues, data directories, and process-lifetime state stay in the launcher-owned
`cordisx.channel-service-config/v1` plane and cannot be tunneled through a
renderer plugin value.

`distribution.mode` is exactly `explicit-local-v1` and `signature` is exactly
`unsupported`. This is an explicit security statement, not a placeholder that
may be projected as signature verification. Package v2 does not accept a
Marketplace record, remote URL, publisher assertion, or embedded runtime
manifest as install authority.

Dependencies remain exact-version in this contract. Duplicate ids,
self-dependencies, missing versions, and cycles are invalid. The resolved
activation graph and the affected dependent closure are fixed by the candidate
and impact tokens before a mutation begins.
