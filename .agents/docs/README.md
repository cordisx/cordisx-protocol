# Protocol Specifications

This directory is the human-readable normative source for the CordisX plugin protocol.

Specified areas:

- `marketplace/`: discovery-only catalog feeds;
- `ui-contributions/`: structured shell contributions, commands, routes,
  pages, outlets, compatibility, and lifecycle version 1.
- `platform-capabilities/`: adapter-neutral provider, model, session, turn,
  permission, composite identity, current-connection, and external
  provider-fleet contracts version 1.
- `extension-points/`: host descriptor catalogs, canonical point policy, and
  surface/outlet authorization origin version 1.
- `agent-events/`: adapter-neutral Session/Agent ledger, DSH-aligned delivery
  handles, cancellation, pre-step/prompt lifecycle, permission, degradation,
  and pagination contracts versions 1 and 2.
- `agent-history/`: read-only, permission-scoped historical Agent projections,
  opaque pagination/tail, payload policy, provenance, and privacy contract
  version 1.
- `ui-extension-catalog/`: complete host-neutral UI point vocabulary,
  structured contribution versions 2 and 3, availability, contextual
  invocation, DSH intent mapping, and explicit replacement refusals.
- `manager-settings-tabs/`: structured manager settings surface version 4,
  catalog version 3, controlled body-only outlet, deterministic projection,
  authorization origin, and lifecycle.
- `channel-runtime/`: structured Channel identity, sourced user input,
  persistent Platform session bindings, redacted runtime snapshots, scoped
  permissions, and launcher-side service declarations.
- `plugin-configuration/`: Standard Schema validation, Schemastery form
  metadata, profile/plugin/generation scope, revision-fenced mutations,
  live/restart application, last-good rollback, secret handling, and
  lifecycle-owned custom field renderers.
- `manifests/`, `lifecycle/`, and `distribution/`: explicit-local package
  manifests, exact dependency graphs, five minimum apply scopes,
  revision/generation-fenced lifecycle operations, immutable activation
  records, last-good rollback, and redacted manager snapshots.

Planned areas include isolated execution, remote distribution, publisher
signatures, transparency, and public marketplace activation.
