# Schemas

Machine-readable CordisX manifest and protocol schemas belong here.

- `marketplace-plugin.v1.schema.json`: one discovery-only plugin entry;
- `marketplace-feed.v1.schema.json`: one aggregate marketplace feed;
- `ui-common.v1.schema.json`: shared identifiers, command/route references,
  host icon tokens, conditions, and disabled state;
- `locale-catalog.v1.schema.json`: one namespace-by-locale ICU message dictionary;
- `command.v1.schema.json`: serializable command metadata (never a handler);
- `surface-contribution.v1.schema.json`: one host-rendered shell contribution;
- `route.v1.schema.json`: one route id/path/outlet/page association;
- `page.v1.schema.json`: host-owned page chrome metadata;
- `outlet.v1.schema.json`: one host/adapter-owned outlet declaration.
- `plugin-manifest.v1.schema.json`: one runtime plugin manifest with
  versioned Platform capability declarations, reasons, and maximum scopes.
