# Marketplace Discovery Protocol

## Status and scope

Marketplace discovery is a structured metadata protocol. It lets independent
catalog feeds describe external plugin artifacts, and lets clients aggregate
those feeds without hosting, building, publishing, or executing plugin code.

The machine-readable contracts are:

- `schemas/marketplace-plugin.v1.schema.json` and
  `schemas/marketplace-feed.v1.schema.json` for the original single-language
  format;
- `schemas/marketplace-plugin.v2.schema.json` and
  `schemas/marketplace-feed.v2.schema.json` for localized discovery metadata.

Version 2 adds localization only for human-facing feed metadata. It does not
define installation, executable package resolution, signatures, provenance,
official status, certification, capability grants, activation, update, or
rollback. Consumers must reject unsupported versions instead of guessing at
fields from a newer document.

## Ownership and artifact boundary

The Marketplace never owns a plugin's source, bundle, build, or publication.
Those remain in the plugin's owning repository and package artifact. A feed
entry only refers to that external artifact through stable machine data such
as `id`, `version`, canonical `source`, an optional manifest URL, and any
package or integrity field introduced by a future protocol.

Feeds must not copy renderer schemas, source trees, or bundle content. Future
provenance, official, and certification records compose with discovery through
an independent trust contract. They are not plugin-self-asserted fields and
are not implied by version-2 localization.

## Plugin identity

One discovered plugin is identified by the tuple `(canonical source, id)`.
The marketplace feed URL is provenance for a catalog copy, not plugin identity.
This lets several catalogs reference the same plugin without presenting it as
several independently installable products.

The `id` is lowercase ASCII and matches
`^[a-z0-9][a-z0-9._-]*$`. It is stable across plugin versions.

The `source` is the canonical HTTPS URL for the plugin's public source
repository. Canonicalization is deterministic:

1. parse as an absolute URL;
2. require the `https:` scheme, with no username, password, query, or fragment;
3. use the URL parser's normalized lowercase hostname and default-port removal;
4. preserve the path's case and percent encoding;
5. remove trailing `/` characters from a non-root path;
6. serialize the resulting URL.

Catalog validation rejects a non-canonical `source` rather than silently
rewriting contributor data. Stable IDs, versions, URLs, compatibility ranges,
licenses, and integrity values are never translated.

## Plugin entries

Both versions require an `id`, human-readable fallback `name` and
`description`, release `version`, canonical `source`, license, CordisX
compatibility range, and at least one author. Optional discovery metadata
includes `homepage`, `icon`, `keywords`, author URLs, and a future-facing
`manifest` URL. A manifest link is informational and does not authorize
execution.

Version 2 additionally requires `fallbackLocale` and accepts `localizations`
for:

- plugin name and description;
- author or publisher display names, preserving the base author array's order
  and length so URLs and identities cannot be rebound by translation;
- human-facing keywords used for display and discovery;
- feed/source display name.

The required base values are the `fallbackLocale` projection. Locale keys use
canonical `Intl` serialization (for example `en` and `zh-CN`), and a locale
must not be repeated in `localizations` when it is already the fallback.
Unknown properties and non-canonical locale keys are rejected.

Host display projection is field-wise and deterministic:

1. the current Host locale when that localized field exists;
2. the declared fallback locale's required base value;
3. English when it is the fallback locale;
4. a stable ID or raw canonical value only as a final UI guard for malformed
   legacy data outside the validated protocol path.

Search indexes include the current projection and the fallback/English
metadata, while stable machine values remain available as exact search terms.
A locale switch reprojects the cached structured feed and does not require a
network reload.

## Marketplace feeds

A feed requires `$schema`, `schemaVersion`, `name`, `homepage`, and a
`plugins` array containing plugin entries of the same version. A version-2
feed also requires `fallbackLocale` and may localize its display name. Feed
generation is deterministic: catalogs sort entries first by canonical
`source`, then by `id`, then by release `version`.

Within one feed, duplicate `(source, id)` tuples are invalid even if versions
differ. One feed presents one current discovery record per plugin identity;
release history belongs in the plugin's own artifact source or a later
protocol.

## Version compatibility

Version-1 consumers reject version-2 documents. Publishers that must serve an
older client may deliberately produce a separate version-1 projection using
the version-2 fallback values while preserving the same canonical identity.
Consumers must not silently downgrade, strip fields, or combine versions inside
one feed.

Version-2 consumers continue to accept version 1 as a single-language entry
whose effective fallback locale is `en`; this is a compatibility projection,
not a claim that the original prose was authored in English.

## Multiple feeds

Clients may configure an ordered list of absolute marketplace JSON URLs. Each
feed is fetched and validated independently. Aggregation uses `(source, id)`
as the key. If several feeds contain the same key, the first configured valid
feed wins; clients expose the winning catalog URL and report ignored
duplicates. Clients never merge untrusted fields from different copies.

A failed or invalid feed does not invalidate other configured feeds. Clients
distinguish network failure, invalid JSON, unsupported schema version, and
schema-invalid content.

## Contribution and conformance

Catalog repositories should accept one plugin entry per file and run pull
request checks that:

- parse every JSON file;
- validate it against the pinned versioned schema;
- enforce canonical source URLs, locale keys, localized-author binding, and
  tuple uniqueness;
- deterministically rebuild the aggregate feed;
- fail when the committed feed differs from generated output.

Conformance fixtures cover both schema versions, locale projection and
fallback, invalid locale/author bindings, invalid identity and unknown fields,
duplicate tuples, deterministic ordering, and mixed-version rejection.

## Security boundary

Discovery metadata is untrusted display data. Renderers insert text as text,
not HTML, and do not execute URLs or plugin code merely because an entry passed
schema validation. HTTPS and schema validity do not establish publisher
identity, artifact integrity, review, official status, certification, or
safety. Those claims require a configured Marketplace trust root and a separate
version-bound trust record; they never grant permissions or bypass Host policy.
