# Message search v1

This optional read-only operation searches one explicitly selected conversation
over a required bounded time interval. Its independent
[types](../../../types/channel-message-search.v1.d.ts),
[request schema](../../../schemas/channel-message-search-request.v1.schema.json)
and [result schema](../../../schemas/channel-message-search-result.v1.schema.json)
do not extend frozen remote-history or runtime facades. An export is not a
plugin acquisition mechanism; the Host advertises its actual authorized entry
point separately. Unsupported Hosts return unavailable.

The query contains non-whitespace text, is at most 1024 characters, and is untrusted data, never an
instruction. Start and end are integer Unix seconds encoded as decimal strings,
with start strictly less than end. The interval is start-inclusive and
end-exclusive. Page size defaults to 50 and ranges from 1 to 50. Opaque page
tokens are at most 2048 characters and cannot confer new scope. Search ranking is
platform-defined; no chronological ordering or complete history is promised.

Every platform search request must contain the exact conversation and interval
filters. Before disclosing any hit, the Host reads its authoritative message
details and verifies its exact conversation, message identity, and creation time
within the interval. Missing details, duplicates, conflicting scope, malformed
timestamps, or an oversized page reject the entire page. Never silently filter
invalid hits, disclose an ID-only fallback after failed detail reads, or label
a failed search as a successful empty page. Content remains untrusted.

The result repeats the selected account, conversation, query, and interval and
returns truthful continuation metadata. A page is not a complete search result.
Each continuation rechecks all filters and permissions; nonadvancing cursors are
rejected. A valid empty page is distinct from unavailable or rejected.

## Security and compatibility

Channel-originated callers are confined to their Host-verified source account
and conversation, current history policy, and platform read/search scopes. A
search hit or caller-provided name never grants access. Recheck caller identity,
generation, connection readiness, and policy before every platform read and
before disclosure. Timeout or revocation must prevent a late search response
from initiating detail reads. Bound duration, unsettled calls, response bytes,
and hit count. Never expand to tenant-wide search, contacts, another profile,
identity, account, or unfiltered fallback when a scoped search is unavailable.

This operation grants no write, forward, resource-download, directory, or SDK
authority. Search snippets and attachment keys are not resource handles.
Existing specialized message-parent and topic reads remain unchanged.
