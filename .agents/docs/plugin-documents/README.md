# Package documentation v1

Status: normative optional descriptor. [`plugin-documents/v1`](../../../types/plugin-documents.v1.d.ts) is declared in `cordisx-documents.json` at the plugin package root. Documents use unique id plus locale, a bounded title and a package-relative Markdown path. Paths cannot be absolute, parent-relative, URLs, symbolic links, or outside the activated package. The Host reads at most 32 files, each at most 256 KiB and 1 MiB total, from the verified generation. Invalid descriptors are rejected rather than partially promoted.

Documents are data, not prompt authority or a capability grant. They contain no credentials, raw transcripts or private paths. Discovery and readback are read-only and expose content plus plugin/id/title/locale, never a filesystem path. The Host may present them through its common plugin documentation UI and CLI. An Agent prompt references the exact CLI docs entry instead of injecting an entire manual. Closing or replacing a generation retires its resources. Plugins without the descriptor retain their README path; feature detection must not report unavailable documents as read.

Machine-readable shapes: [descriptor](../../../schemas/plugin-documents.v1.schema.json), [readback](../../../schemas/plugin-document-readback.v1.schema.json).
