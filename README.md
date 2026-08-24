# CordisX Protocol

Normative plugin contracts, schemas, test vectors, and conformance material for CordisX interoperability.

This repository specifies portable behavior independently of the current CordisX implementation and Codex DOM adapter.

## Marketplace discovery

Version 1 marketplace discovery contracts are defined by:

- `schemas/marketplace-plugin.v1.schema.json`;
- `schemas/marketplace-feed.v1.schema.json`;
- `.agents/docs/marketplace/README.md`;
- `test-vectors/marketplace` and `conformance/marketplace.mjs`.

Structured UI version 1, the complete UI extension catalog and contribution
version 2, Platform capabilities, Agent events, and extension-point management
contracts are indexed in `.agents/docs/README.md` and backed by schemas plus
conformance vectors in this repository.

Dynamic local packages and plugin generations are defined by the package,
activation, lifecycle operation/result, and manager snapshot version-1 schemas,
the `manifests`, `lifecycle`, and `distribution` specifications, and the
`plugin-lifecycle` conformance suite. This local integrity contract does not
claim remote marketplace installation, publisher signing, or sandboxing.

Run `npm ci && npm run check` to validate the schemas and conformance vectors.

## Licensing and independent plugins

This repository is licensed under the GNU Affero General Public License,
version 3 or any later version (`AGPL-3.0-or-later`), with the
[CordisX Independent Plugin Exception](CORDISX-INDEPENDENT-PLUGIN-EXCEPTION.md)
as an additional permission under AGPLv3 section 7.

The versioned plugin-facing schemas and declarations in this repository are
Public Stable Plugin Interfaces and Interface Material under that Exception.
An independent plugin that uses only those interfaces may be commercial,
charged for, distributed through a marketplace, and licensed under terms
chosen by its author. The Exception does not permit copying CordisX host code,
building a substitute host from CordisX code, or using private interfaces
outside the AGPL.

The CordisX-specific Exception is not a standard SPDX exception and has not
been reviewed or approved by the Open Source Initiative or the Free Software
Foundation. Legal review is recommended before the first stable release.

See [CONTRIBUTING.md](CONTRIBUTING.md) before submitting protocol material.
