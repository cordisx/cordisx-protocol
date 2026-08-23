# Marketplace Discovery Protocol v1

## Status and scope

Version 1 defines public plugin discovery metadata. It lets catalogs accept
independent plugin entries and lets clients aggregate multiple catalog feeds.
It does not define installation, executable package resolution, signatures,
capability grants, activation, update, or rollback.

The machine-readable contracts are:

- `schemas/marketplace-plugin.v1.schema.json` for one contributed entry;
- `schemas/marketplace-feed.v1.schema.json` for one aggregate catalog feed.

Consumers that do not support `schemaVersion: 1` must reject the document as an
unsupported version. They must not guess at fields from a newer version.

## Plugin identity

One discovered plugin is identified by the tuple `(canonical source, id)`.
The marketplace feed URL is provenance for a catalog copy, not plugin identity.
This lets several catalogs reference the same plugin without presenting it as
several independently installable products.

The `id` is lowercase ASCII and matches
`^[a-z0-9][a-z0-9._-]*$`. It is stable across plugin versions.

The `source` is the canonical HTTPS URL for the plugin's public source
repository. Version 1 canonicalization is deterministic:

1. parse as an absolute URL;
2. require the `https:` scheme, with no username, password, query, or fragment;
3. use the URL parser's normalized lowercase hostname and default-port removal;
4. preserve the path's case and percent encoding;
5. remove trailing `/` characters from a non-root path;
6. serialize the resulting URL.

Catalog validation rejects a non-canonical `source` rather than silently
rewriting contributor data.

## Plugin entry

A version-1 plugin entry requires:

- `$schema`: the versioned plugin schema URI;
- `schemaVersion`: integer `1`;
- `id`, `name`, `description`, and release `version`;
- canonical `source` and SPDX-style `license` strings;
- `compatibility.cordisx`, a declared CordisX semver range;
- at least one author with a display `name`.

Optional discovery metadata includes `homepage`, `icon`, `keywords`, author
URLs, and a future-facing `manifest` URL. A manifest link is informational in
this version and does not authorize execution.

Unknown properties are rejected so misspellings and incompatible extensions do
not silently enter a catalog. A later protocol version can add fields with an
explicit downgrade rule.

## Marketplace feed

A version-1 feed requires `$schema`, `schemaVersion`, `name`, `homepage`, and a
`plugins` array containing version-1 plugin entries. Feed generation is
deterministic: catalogs sort entries first by canonical `source`, then by `id`,
then by release `version`.

Within one feed, duplicate `(source, id)` tuples are invalid even if versions
differ. Version 1 presents one current discovery record per plugin identity;
release history belongs in the plugin's own source or a later protocol.

## Multiple feeds

Clients may configure an ordered list of absolute marketplace JSON URLs. Each
feed is fetched and validated independently. Aggregation uses `(source, id)` as
the key. If several feeds contain the same key, the first configured valid feed
wins; clients should expose the winning catalog URL and report ignored
duplicates. Clients must never merge untrusted fields from different copies.

A failed or invalid feed does not invalidate other configured feeds. Clients
must distinguish network failure, invalid JSON, unsupported schema version, and
schema-invalid content.

## Contribution and conformance

Catalog repositories should accept one plugin entry per file and run pull
request checks that:

- parse every JSON file;
- validate it against the pinned versioned schema;
- enforce canonical source URLs and tuple uniqueness;
- deterministically rebuild the aggregate feed;
- fail when the committed feed differs from generated output.

Conformance fixtures cover valid minimal/full entries, invalid identity and
unknown-field cases, duplicate tuples, deterministic ordering, and multi-feed
first-source-wins behavior.

## Security boundary

Discovery metadata is untrusted display data. Renderers must insert text as
text, not HTML, and must not execute URLs or plugin code merely because an entry
passed schema validation. HTTPS and schema validity do not establish publisher
identity, package integrity, or safety.
