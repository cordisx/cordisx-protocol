# CordisX Protocol

Normative plugin contracts, schemas, test vectors, and conformance material for CordisX interoperability.

This repository specifies portable behavior independently of the current CordisX implementation and Codex DOM adapter.

## Marketplace discovery

Version 1 marketplace discovery contracts are defined by:

- `schemas/marketplace-plugin.v1.schema.json`;
- `schemas/marketplace-feed.v1.schema.json`;
- `.agents/docs/marketplace/README.md`;
- `test-vectors/marketplace` and `conformance/marketplace.mjs`.

Run `npm ci && npm run check` to validate the schemas and conformance vectors.
