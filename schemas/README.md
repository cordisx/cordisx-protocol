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
- `surface-contribution.v3.schema.json`: the frozen version-2 surface
  vocabulary plus host-owned route toggle behavior;
- `surface-contribution.v4.schema.json`: the additive manager settings tab
  surface with one envelope-level identity/order/condition source and a
  same-owner route item;
- `surface-contribution.v5.schema.json`: the compatible Manager settings
  content-tab family plus top-level settings-adjacent navigation items with a
  same-owner route and closed before/after Settings groups; route-v2/page-v3
  metadata supplies all navigation/header display data;
- `route.v1.schema.json`: one route id/path/outlet/page association;
- `route.v2.schema.json`: route-v1 navigation fields plus required localized
  product title and description metadata;
- `page.v1.schema.json`: host-owned page header metadata and structured header
  actions; trusted-local mounts render the page body only;
- `page.v2.schema.json`: page-v1 metadata plus the bounded `standard` or
  `body-only` host chrome policy;
- `page.v3.schema.json`: page-v2 chrome metadata plus a required localized
  product description;
- `outlet.v1.schema.json`: one host/adapter-owned outlet declaration.
- `plugin-manifest.v1.schema.json`: one runtime plugin manifest with
  versioned Platform capability declarations, reasons, and maximum scopes.
- `plugin-manifest.v2.schema.json`: exact-version Channel capabilities/scopes
  and launcher-resolved `channel-adapter` services;
- `plugin-manifest.v3.schema.json`: Channel service declarations with mandatory
  explicit Host schema or no-configuration mode;
- `channel-common.v1.schema.json`: complete Channel account, tenant,
  conversation, thread, user, and event identities;
- `channel-user-input.v1.schema.json`: attributed, user-role-only ingress with
  opaque quarantined attachment handles;
- `channel-binding.v1.schema.json`: durable endpoint/route to complete Platform
  session binding;
- `channel-runtime-snapshot.v1.schema.json`: bounded and redacted manager
  health/binding projection;
- `channel-service-config.v1.schema.json`: launcher-owned adapter connection,
  route/task mapping, policy, notification, reliability, rate, and attachment
  configuration with opaque credential references only;
- `channel-service-config-descriptor.v1.schema.json`: redacted Host projection
  for the dedicated Manager Channel settings page;
- `service-config-common.v1.schema.json`: shared plugin/service identity,
  profile/generation scope, form schema projection, exact application modes,
  secret slots, and bounded errors for launcher service configuration;
- `service-config-descriptor.v1.schema.json`: one redacted Host projection for
  a service section inside its owning plugin detail, including desired versus
  active app-restart state;
- `service-config-mutation.v1.schema.json`: one exact-identity, generation- and
  revision-fenced service configuration candidate;
- `service-config-result.v1.schema.json`: applied service restart, staged app
  restart, conflict, or rejected result without secret references;
- `cli-proxy-provider-runtime-config.v1.schema.json`: CLIProxy provider
  endpoint, opaque credential reference, model mapping, and request-timeout
  configuration applied by Provider Fleet service restart;
- `cli-proxy-provider-startup-config.v1.schema.json`: CLIProxy executable and
  provider data-directory overrides applied only after an application restart;
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
- `host-extension-point-catalog.v3.schema.json`: the additive manager settings
  points plus outlet page-chrome, presentation-group, and route-path policy;
- `host-extension-point-catalog.v4.schema.json`: precise Manager settings
  content-tab naming plus the top-level navigation surface and standard
  `manager.content` outlet;
- `host-extension-point-catalog.v5.schema.json`: separates the versioned
  `maturity` promise from `adapterSupport`; a descriptor never contains the
  current page or DOM mount state;
- `extension-point-runtime-context.v1.schema.json`: host-observed
  `active`/`inactive`/`not-mounted` context state for points and semantic
  anchors, reported independently from catalog support;
- `extension-point-policy.v1.schema.json`: one user policy record keyed by
  canonical source, plugin id, and point id;
- `extension-point-access.v1.schema.json`: host-generated surface command,
  outlet route/page, and page-header command authorization origin metadata.
- `extension-point-access.v2.schema.json`: generation-fenced origin metadata,
  including surface-origin checks for route navigation.
- `agent-event.v1.schema.json`: one sourced Session/Agent ledger event;
- `agent-event-page.v1.schema.json`: one snapshot-bounded query page.
- `agent-event.v2.schema.json`: one sourced event with delivery ownership and
  successful input-contribution lifecycle;
- `agent-event-page.v2.schema.json`: one version-2 snapshot-bounded query page;
- `agent-delivery-snapshot.v1.schema.json`: one immutable owner- and
  generation-fenced public delivery snapshot.
- `agent-history-page.v1.schema.json`: one permission-scoped, privacy-bounded,
  snapshot-paged historical Agent event projection.
- `surface-invocation-context.v1.schema.json`: immutable host-generated
  contextual surface identity aligned with the Agent event id vocabulary.
- `plugin-config-common.v1.schema.json`: shared plugin identity, runtime scope,
  field paths, schema projections, and redacted secret slots;
- `plugin-config-descriptor.v1.schema.json`: one Host-generated configuration
  snapshot with resolved/raw layers, revision, application mode, and
  last-good state;
- `plugin-config-common.v2.schema.json`: v1 identity/scope/value definitions
  plus explicit `live`, `plugin-restart`, `service-restart`, and `app-restart`
  application modes;
- `plugin-config-descriptor.v2.schema.json`: one Host-generated runtime
  configuration snapshot using the explicit four-mode vocabulary;
- `plugin-config-result.v2.schema.json`: applied/staged/conflict/rejected
  outcomes; only `app-restart` may be staged and it never claims a new active
  generation;
- `plugin-config-mutation.v1.schema.json`: one revision- and generation-fenced
  set/unset request containing JSON data only;
- `plugin-config-result.v1.schema.json`: applied, conflict, or rejected write
  outcome without secret values or filesystem details;
- `plugin-config-renderer.v1.schema.json`: metadata for one lifecycle-owned
  role, field-path, or namespace custom renderer registration.
- `plugin-lifecycle-common.v1.schema.json`: shared package version, digest,
  generation, operation, state, and minimum apply-scope vocabulary;
- `plugin-package.v1.schema.json`: one explicit-local immutable package input
  with exact compatibility, dependency, and runtime-manifest declarations;
- `plugin-package-source.v1.schema.json`: one explicit local directory,
  package/archive, or already-downloaded tarball source with optional expected
  digest and no remote-install authority;
- `plugin-package.v2.schema.json`: package metadata with a separately digested
  runtime-manifest v1/v2/v3 reference, explicit unsupported-signature state,
  exact protocol requirements, and dependencies;
- `plugin-activation.v1.schema.json`: one profile-scoped active, candidate, or
  last-good activation record without filesystem paths;
- `plugin-lifecycle-operation.v1.schema.json`: revision- and
  runtime-generation-fenced inspect/install/update/enable/disable/reload/
  uninstall request;
- `plugin-lifecycle-operation.v2.schema.json`: exact-version operation using
  `inspect-source` for all three explicit-local source forms;
- `plugin-lifecycle-result.v1.schema.json`: planned/applied/conflict/failure/
  rollback outcome with redacted package and impact data;
- `plugin-lifecycle-result.v2.schema.json`: the matching product-safe
  `inspect-source` and mutation result without local/store paths;
- `plugin-runtime-snapshot.v1.schema.json`: redacted Host-owned manager
  projection of package state, graph, preferences, and available operations.
- `plugin-console-entry.v1.schema.json`: one Host-attributed DevTools Console
  line for plugin console, invocation, permission, lifecycle, or diagnostic
  output, with Console-compatible methods, variadic safe argument snapshots,
  formatted row text, and bounded consumption summaries;
- `plugin-console-page.v1.schema.json`: one owner- and generation-bounded
  in-memory Console projection with an explicit partial-observability marker.
