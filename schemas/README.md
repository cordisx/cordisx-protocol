# Schemas

Machine-readable CordisX manifest and protocol schemas belong here.

- `marketplace-plugin.v1.schema.json`: one discovery-only plugin entry;
- `marketplace-feed.v1.schema.json`: one aggregate marketplace feed;
- `ui-common.v1.schema.json`: shared identifiers, command/route references,
  host icon tokens, conditions, and disabled state;
- `locale-catalog.v1.schema.json`: one namespace-by-locale ICU message dictionary;
- `command.v1.schema.json`: serializable command metadata (never a handler);
- `surface-contribution.v1.schema.json`: one host-rendered shell contribution,
  including distinct native footer/help and account/profile menu actions;
- `surface-contribution.v2.schema.json`: the additive complete surface
  vocabulary and bounded action, contextual-action, tab, and presenter families;
- `route.v1.schema.json`: one route id/path/outlet/page association;
- `page.v1.schema.json`: host-owned page header metadata and structured header
  actions; trusted-local mounts render the page body only;
- `outlet.v1.schema.json`: one host/adapter-owned outlet declaration.
- `plugin-manifest.v1.schema.json`: one runtime plugin manifest with
  versioned Platform capability declarations, reasons, and maximum scopes.
- `platform-model.v1.schema.json`: one provider-aware model descriptor keyed by
  `(providerId, modelId)`;
- `platform-model-page.v1.schema.json`: one provider-filtered model catalog;
- `platform-session.v1.schema.json`: one provider-aware session summary keyed
  by `(providerId, remoteSessionId)`;
- `platform-session-page.v1.schema.json`: one query- and snapshot-bound merged
  session catalog/search page;
- `extension-point-common.v1.schema.json`: canonical plugin/point identity and
  `inherit`/`allow`/`deny` policy definitions;
- `host-extension-point-catalog.v1.schema.json`: one host-owned catalog of
  localized surface and outlet descriptors;
- `host-extension-point-catalog.v2.schema.json`: one catalog with payload
  family plus implemented, experimental, or reserved adapter availability;
- `extension-point-policy.v1.schema.json`: one user policy record keyed by
  canonical source, plugin id, and point id;
- `extension-point-access.v1.schema.json`: host-generated surface command,
  outlet route/page, and page-header command authorization origin metadata.
- `extension-point-access.v2.schema.json`: generation-fenced origin metadata,
  including surface-origin checks for route navigation.
- `agent-event.v1.schema.json`: one sourced Session/Agent ledger event;
- `agent-event-page.v1.schema.json`: one snapshot-bounded query page.
- `surface-invocation-context.v1.schema.json`: immutable host-generated
  contextual surface identity aligned with the Agent event id vocabulary.
