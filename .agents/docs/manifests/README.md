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

## Package manifest v3

Package v3 preserves the explicit-local distribution, integrity, dependency,
runtime-ABI, path, and separate runtime-manifest boundaries of package v2. Its
only authority expansion is versioned: the runtime-manifest reference may name
`plugin-manifest.v4`, which adds structured permission rationale and security
declarations. Frozen package v2 continues to accept only manifest v1-v3.

The package version is not a permission key. The Host computes the v2 security
fingerprint from the normalized runtime declaration and capability catalog;
source/id, scope expansion, or a security-relevant declaration change returns
authorization to `ask` even when package bytes passed integrity checks.

## Package manifest v4

Package v4 preserves every package-v3 integrity, distribution, dependency,
runtime-ABI, and path boundary. It adds only `plugin-manifest.v5` as an allowed
separately digested runtime manifest. Manifest v5 adds the explicit
`ui.host-dom.read` and `ui.host-dom.modify` declarations with Host-catalog root
ids and closed operation sets. Frozen package v1-v3 and manifest v1-v4 remain
unchanged and never gain Host DOM authority by reinterpretation.

## Package manifest v5

Package v5 preserves every package-v4 field and adds only the optional
`entityTemplates` declaration array. Each entry binds one local Agent id to a
package-relative `./entities/<agentId>/entity.json` and exact entities-v1 tree
digest. The entity-file schema must appear in `compatibility.protocolSchemas`.
The Host validates the complete package artifact, path/id agreement, entity
schema, referenced Markdown paths, digest, and symlink containment before it
may materialize a template.

Template authority is create-if-absent only. An existing profile-local entity
directory is preserved byte-for-byte across package update, enable, reload, and
rollback, including when its user-edited content is invalid. Package v1-v4 and
runtime manifests v1-v5 remain unchanged and do not gain entity declarations by
reinterpretation.

## Runtime and package manifest v6

Runtime manifest v6 adds the complete public Agent-runtime capability
vocabulary and exact Session scope declarations. Package v6 preserves all
package-v5 fields and adds runtime manifest v6 to the closed digest-pinned
reference list. Dynamic route bindings are optional, same-owner, exact
`:sessionId` authorities; see [`v6.md`](./v6.md).

## Runtime and package manifest v7

Runtime manifest v7 adds one closed execution declaration for the isolated
`ui.transient-canvas/v1` Worker interface. It does not expose renderer globals
or add a DOM capability. Package v7 is the first package contract allowed to
reference manifest v7; older versions remain frozen.
