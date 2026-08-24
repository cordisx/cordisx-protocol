# Plugin Manifests

## Package manifest v1

`plugin-package.v1.schema.json` is the manifest for one explicitly selected
local package directory. Its conventional filename is `cordisx.plugin.json`.
It is separate from a marketplace discovery record and from the runtime
manifest carried inside it.

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
