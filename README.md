# CordisX Protocol

Normative plugin contracts, schemas, test vectors, and conformance material for CordisX interoperability.

This repository specifies portable behavior independently of the current CordisX implementation and Codex DOM adapter.

## Marketplace discovery

Version 1 marketplace discovery contracts are defined by:

- `schemas/marketplace-plugin.v1.schema.json`;
- `schemas/marketplace-feed.v1.schema.json`;
- `.agents/docs/marketplace/README.md`;
- `test-vectors/marketplace` and `conformance/marketplace.mjs`.

Version 1 structured UI, Platform capabilities, and extension-point management
contracts are indexed in `.agents/docs/README.md` and backed by schemas plus
conformance vectors in this repository.

Run `npm ci && npm run check` to validate the schemas and conformance vectors.
