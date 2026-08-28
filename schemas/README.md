# Schemas

Machine-readable CordisX manifest and protocol schemas belong here.

- `marketplace-plugin.v1.schema.json`: one discovery-only plugin entry;
- `marketplace-feed.v1.schema.json`: one aggregate marketplace feed;
- `marketplace-plugin.v4.schema.json` and `marketplace-feed.v4.schema.json`:
  versioned localized Marketplace discovery with optional external-publisher
  commerce descriptors (no price or payment state);
- `ui-common.v1.schema.json`: shared identifiers, command/route references,
  host icon tokens, conditions, and disabled state;
- `icon-theme-common.v1.schema.json`: 51 closed version-1 semantic icon keys,
  including distinct certified-third-party and official-first-party trust keys,
  variants/states, provider identities, exact tuple coverage, no-raw-data
  complete-coverage proofs, profile-pinned references, and the
  field-whitelisted normalized vector descriptor;
- `icon-theme-provider-registration.v1.schema.json`: Host-authored,
  principal-bound provider registration and exact generation status;
- `icon-theme-selection.v1.schema.json`: exact profile-revision/provider-
  version/generation-pinned selection with `builtin:reicon` as the mandatory
  default and fallback;
- `icon-theme-resolution-request.v1.schema.json` and
  `icon-theme-resolution-result.v1.schema.json`: exact-tuple resolution with
  explicit partial-coverage misses and descriptor-only success payloads;
- `icon-theme-lifecycle-operation.v1.schema.json` and
  `icon-theme-lifecycle-result.v1.schema.json`: Host-authored register, select,
  exact-generation dispose, and last-good rollback records;
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
- `surface-contribution.v6.schema.json`: the additive Host-owned native
  reasoning-intensity presentation family with bounded variant, motion, and
  semantic material stages;
- `surface-contribution.v7.schema.json`: the additive session backdrop
  presentation family driven by native reasoning progress, with closed ambience
  tokens and bounded embedded PNG portraits;
- `route.v1.schema.json`: one route id/path/outlet/page association;
- `route.v2.schema.json`: route-v1 navigation fields plus required localized
  product title and description metadata;
- `page.v1.schema.json`: host-owned page header metadata and structured header
  actions; trusted-local mounts render the page body only;
- `page.v2.schema.json`: page-v1 metadata plus the bounded `standard` or
  `body-only` host chrome policy;
- `page.v3.schema.json`: page-v2 chrome metadata plus a required localized
  product description;
- `manager-content-navigation.v1.schema.json`: a same-owner Manager content
  subroute declaration with an optional parent route, Host-resolved title
  source, and tab-to-route map;
- `manager-content-projection.v1.schema.json`: a renderer-safe, Host-generated
  Manager header/breadcrumb/back/history/tab projection, including opaque
  dynamic-record titles;
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
- `channel-runtime-snapshot.v2.schema.json`: revision- and Host-generation-
  fenced Channel Manager account/binding projection with profile-local opaque
  tokens and executable operation availability;
- `channel-manager-common.v1.schema.json`: common Channel Manager operation,
  exact Host-issued opaque target, profile, Host-generation, revision, and
  stable result-code types;
- `channel-manager-request.v1.schema.json`: one fenced Channel Manager
  capture/create/reconnect/binding/log request with no credential value,
  reference, or raw platform identity;
- `channel-manager-result.v1.schema.json`: one redacted applied, conflict,
  rejected, or unavailable result for a Channel Manager request;
- `channel-manager-log-page.v1.schema.json`: a bounded, structured safe-log
  projection with no arbitrary diagnostic payload;
- `channel-manager-log-export-result.v1.schema.json`: an opaque, expiring
  Host export handle result with no path or link;
- `channel-inbound-message-intent.v1.schema.json`: adapter-neutral, complete-
  origin user-message intent; and
- `channel-sourced-gateway-request.v1.schema.json`: a fenced Host gateway
  request that preserves the complete source intent;
- `channel-task-launch-request.v1.schema.json`: a launcher-private, path-free
  Channel create request bound to the route, source, selectors, service
  generation, and configuration revision;
- `channel-task-launch-authorization.v1.schema.json`: a Host-issued,
  single-use launch grant containing the resolved complete model/profile and
  authorized absolute cwd; it is never renderer-safe;
- `platform-task-dispatch-result.v1.schema.json`: a launcher-private
  create/follow-up acceptance or rejection that preserves a created session
  when initial turn submission fails;
- `platform-task-lifecycle-event.v1.schema.json`: one sanitized,
  generation-fenced Platform turn/approval lifecycle event; and
- `platform-task-lifecycle-range.v1.schema.json`: one contiguous,
  cursor-replayable lifecycle event range for a complete Platform session;
- `channel-service-config.v1.schema.json`: launcher-owned adapter connection
  configuration with opaque credential references only;
- `channel-service-config-descriptor.v1.schema.json`: redacted Host-owned
  Schemastery descriptor for the connection configuration;
- `channel-task-routing-config.v1.schema.json`: optional consumer-owned task
  subscription/routing configuration, separate from Channel core;
- `connector-common.v1.schema.json`: shared connector ids, opaque handles,
  registration identity, capabilities, and structured text messages;
- `connector-service-descriptor.v1.schema.json`: one versioned Connector
  capability descriptor;
- `connector-registration.v1.schema.json`: one Connector registration identity
  and generation;
- `connector-command.v1.schema.json`: one data-only open/send/stop/close
  Connector command envelope; and
- `connector-event.v1.schema.json`: one ordered data-only Connector event or
  terminal disposal envelope;
- `connector-client-common.v1.schema.json`: opaque caller principal/user,
  bounded authorization outcome, and run/conversation binding types;
- `connector-client-request.v1.schema.json` and
  `connector-client-result.v1.schema.json`: public discovery, command, and
  subscription exchange with typed denied/unavailable outcomes;
- `connector-client-snapshot.v1.schema.json`: redacted public registration and
  capability availability snapshot; and
- `connector-event-subscription.v1.schema.json` and
  `connector-event-page.v1.schema.json`: snapshot-fenced serialized replay
  and live event consumption;
- `connector-client-binding.v1.schema.json`: Host-only principal/user and
  exact authorization issuance record; and
- `connector-bound-client.v1.schema.json`,
  `connector-bound-client-call.v1.schema.json`, and
  `connector-bound-client-result.v1.schema.json`: Host-injected bound-client
  surface plus typed discover/execute/subscribe outcomes;
- `connector-bound-client-lifecycle.v1.schema.json`: executable client and
  subscription terminal-state projection for unsubscribe and owner disposal;
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
- `extension-point-control-declaration.v1.schema.json`: one normalized explicit
  or legacy-structured plugin claim for a semantic point and mode, with bounded
  renderer-safe binding requests and a Host-issued principal handle;
- `extension-point-control-authorization.v1.schema.json`: one partial grant or
  denial keyed by exact source/plugin/point/claim/mode, never a whole-plugin
  policy;
- `host-extension-point-control-catalog.v1.schema.json`: Host-owned mode,
  coexistence, exclusive selection, safe binding, and nested ownership policy;
- `extension-point-control-snapshot.v1.schema.json`: Host-authored runtime
  candidate inventory, selection/conflict, safe projection, and transitive
  suppression result;
- `extension-point-control-access.v1.schema.json`: generation-fenced,
  Host-brokered scalar command invocation origin with no callback or DOM value;
- `extension-point-control-result.v1.schema.json`: correlated Host-stamped
  accepted/rejected command acknowledgement with no arbitrary result data; and
- `extension-point-control-event.v1.schema.json`: Host-authored,
  generation-fenced scalar event projection for an exact selected claim.
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
