# CordisX Protocol

Normative plugin contracts, schemas, test vectors, and conformance material for
CordisX interoperability. Contracts specify portable behavior independently of
the current Host implementation and Codex DOM adapter.

## For consumers and implementers

| Start here | Purpose |
| --- | --- |
| [Specification topics](https://github.com/cordisx/cordisx-protocol/blob/main/.agents/docs/README.md) | Normative behavior, compatibility, and topic version navigation |
| [TypeScript entrypoints](https://github.com/cordisx/cordisx-protocol/blob/main/types/INDEX.md) | Exact public imports and their declarations, including reused wire versions |
| [Schemas](https://github.com/cordisx/cordisx-protocol/blob/main/schemas/README.md) | Machine-readable document formats |
| [Conformance](https://github.com/cordisx/cordisx-protocol/blob/main/conformance/README.md) and [test vectors](https://github.com/cordisx/cordisx-protocol/blob/main/test-vectors/README.md) | Protocol validation and examples |

These links also work for readers of the installed package README. They open
repository `main`; select the tag or commit matching a pinned dependency when
checking its exact contract. Package publication and Host support are separate
from a contract's presence in this repository.

## For maintainers

Read [AGENTS.md](https://github.com/cordisx/cordisx-protocol/blob/main/AGENTS.md)
and the [maintenance rules](https://github.com/cordisx/cordisx-protocol/blob/main/.agents/rules/README.md)
for document ownership and synchronized protocol changes. Repository publishing
steps live in the [release runbook](https://github.com/cordisx/cordisx-protocol/blob/main/.agents/maintainers/release.md);
[dated adoption notes](https://github.com/cordisx/cordisx-protocol/blob/main/.agents/maintainers/adoption-notes.md)
retain historical integration guidance separately from the specifications.

Run `npm ci && npm run check` to validate types, schemas, and conformance vectors.
The [release runbook](https://github.com/cordisx/cordisx-protocol/blob/main/.agents/maintainers/release.md)
links the separate distribution and registry checks.

## Visual contracts

Visuals v1 defines owner-local provider ids and a framework-neutral projection
of detached, deeply immutable JSON data plus the effective light/dark theme.
It participates in the existing plugin generation transaction and defines no
second lifecycle or renderer wire format. See the
[Visuals specification](https://github.com/cordisx/cordisx-protocol/blob/main/.agents/docs/visuals/README.md).
The [raster-image specification](https://github.com/cordisx/cordisx-protocol/blob/main/.agents/docs/raster-image/README.md)
defines bounded PNG snapshots after product-specific composition, without
passing product semantics or renderer authority to the receiving surface.

## Marketplace discovery

The [Marketplace specification](https://github.com/cordisx/cordisx-protocol/blob/main/.agents/docs/marketplace/README.md)
indexes the versioned discovery contracts, compatible feed formats, trust
extensions, and conformance material.

## Licensing and independent plugins

This repository is licensed under the GNU Affero General Public License,
version 3 or any later version (`AGPL-3.0-or-later`), with the
[CordisX Independent Plugin Exception](https://github.com/cordisx/cordisx-protocol/blob/main/CORDISX-INDEPENDENT-PLUGIN-EXCEPTION.md)
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

See [CONTRIBUTING.md](https://github.com/cordisx/cordisx-protocol/blob/main/CONTRIBUTING.md)
before submitting protocol material.
