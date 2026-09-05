# Schemas

Machine-readable CordisX manifest and protocol schemas belong here.

Use the [specification topics](../.agents/docs/README.md) for normative behavior
and version navigation, and the [TypeScript index](../types/INDEX.md) for exact
package imports. A schema version belongs to that document; it need not equal
the version of a service or entrypoint that reuses it. Validation behavior and
its scope are described in [conformance](../conformance/README.md).

- `visuals-common.v1.schema.json` and `visual-projection.v1.schema.json`:
  owner-local provider ids plus the framework-neutral opaque data and effective
  theme projection supplied to one bounded visual seat;
- `agent-page-composer-origin.v1.schema.json` and
  `agent-page-composer-command-context.v1.schema.json`,
  `agent-page-composer-command-request.v1.schema.json`, and
  `agent-page-composer-command-result.v1.schema.json`: Host-issued,
  page-binding/execution-fenced origins plus the mounted page command adapter
  request/context/result for one product-page composer command;
- `agent-page-admission-target-origin.v1.schema.json`,
  `agent-page-admission-target-receipt.v1.schema.json`, and
  `agent-page-admission-reservation.v1.schema.json`: exact same-page Room
  target capabilities, receipts, and one-shot pre-submit reservations;
- `agent-page-admission-route-continuation.v1.schema.json`,
  `agent-page-admission-route-reservation.v1.schema.json`, and
  `agent-page-admission-route-claim-receipt.v1.schema.json`: fresh-Room
  continuation, reservation, and Host-only destination-binding claim evidence;
- `plugin-bundle.v1.schema.json`: one non-executable explicit-local bundle
  manifest with exact member versions and contained package directories;
- `plugin-bundle-lifecycle-operation.v1.schema.json` and
  `plugin-bundle-lifecycle-result.v1.schema.json`: revision/runtime-fenced
  bundle inspection, application, policy, optional-member, adoption, and
  impact outcomes;
- `plugin-bundle-manager-snapshot.v1.schema.json`: redacted Host Manager
  projection for header metadata, README, members, effective permissions,
  relations, claims, and bounded records;

- `marketplace-plugin.v1.schema.json`: one discovery-only plugin entry;
- `marketplace-feed.v1.schema.json`: one aggregate marketplace feed;
- `marketplace-plugin.v4.schema.json` and `marketplace-feed.v4.schema.json`:
  versioned localized Marketplace discovery with optional external-publisher
  commerce descriptors (no price or payment state);
- `ui-common.v1.schema.json`: shared identifiers, command/route references,
  host icon tokens, conditions, and disabled state;
- `icon-theme-common.v1.schema.json`: 64 closed version-1 semantic icon keys,
  including distinct trust, Manager action/content, and agent-turn-control keys,
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
- `navigation-collection-actions.v1.schema.json`: an at-most-eight immutable
  action list for the versioned successor to Host-owned route-only dynamic
  navigation collection rows, with explicit command, enclosing-route copy,
  and bounded-text copy effects plus Host-owned confirmation and feedback;
- `raster-image-snapshot.v1.schema.json`: one closed, base64-encoded PNG image
  snapshot with bounded declared dimensions; consumers additionally validate
  canonical encoding, PNG structure, dimensions, chunks, and decoded size;
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
- `manager-content-navigation.v2.schema.json`: the frozen v1 declaration plus
  an optional localized tab label that can differ from its target route title;
- `manager-content-navigation.v3.schema.json`: the additive v2 declaration
  successor with an optional fixed Agent-avatar record summary and an optional
  exact Agent-definition detail subject;
- `manager-content-navigation.v4.schema.json`: the additive v3 declaration
  successor with an optional Host-owned plugin configuration form body and
  bounded missing-only scalar default migration;
- `manager-content-navigation.v5.schema.json`: the additive v4 declaration
  successor for the localized finite-choice configuration projection;
- `manager-content-projection.v1.schema.json`: a renderer-safe, Host-generated
  Manager header/breadcrumb/back/history/tab projection, including opaque
  dynamic-record titles;
- `manager-content-projection.v2.schema.json`: the additive projection-v1
  successor carrying the exact fixed record summary between header and tabs;
- `manager-content-projection.v3.schema.json`: the additive projection-v2
  successor carrying a redacted Host-owned plugin configuration form body;
- `manager-content-projection.v4.schema.json`,
  `plugin-config-common.v3.schema.json`, and
  `plugin-config-descriptor.v3.schema.json`: the additive Host-form projection
  successor carrying exact scalar choice values with localized labels and a
  mandatory fallback, without changing the value ledger;
- `manager-content-config-common.v1.schema.json`,
  `manager-content-config-command.v1.schema.json`, and
  `manager-content-config-result.v1.schema.json`: exact owner/generation/CAS
  binding, draft validation/save, and same-ledger missing-default operations;
- `manager-content-config-subscription-page.v1.schema.json` and
  `manager-content-config-subscription-close.v1.schema.json`: replay/live
  config-form snapshots with terminal generation/declaration closure fences;
- `manager-content-config-subscription-page.v2.schema.json`: projection-v4
  snapshot pages that reuse the frozen v1 binding, command/result, and close
  fences;
- `manager-collection-common.v1.schema.json`,
  `manager-collection-registration.v1.schema.json`,
  `manager-collection-query.v1.schema.json`, and
  `manager-collection-snapshot.v1.schema.json`: generic Host-rendered Manager
  body collections with stable views, Host-owned title/summary search,
  query-fenced data-only snapshots, same-owner row routes, closed visuals, and
  predecessor structured actions plus one Host text-input command action;
- `manager-collection-action-result.v1.schema.json`: applied, rejected,
  conflict, or unavailable action outcome with no arbitrary business payload;
- `outlet.v1.schema.json`: one host/adapter-owned outlet declaration.
- `plugin-manifest.v1.schema.json`: one runtime plugin manifest with
  versioned Platform capability declarations, reasons, and maximum scopes.
- `plugin-manifest.v2.schema.json`: exact-version Channel capabilities/scopes
  and launcher-resolved `channel-adapter` services;
- `plugin-manifest.v3.schema.json`: Channel service declarations with mandatory
  explicit Host schema or no-configuration mode;
- `plugin-manifest.v5.schema.json`: additive `ui.host-dom.read` and
  `ui.host-dom.modify` declarations with exact Host root and closed operation
  scopes; frozen manifest v1-v4 remain unchanged;
- `plugin-manifest.v6.schema.json`: additive complete Agent-runtime capability
  declarations with exact SessionId lists or same-owner Host route-param scope;
- `permission-common.v4.schema.json`, `permission-policy.v4.schema.json`,
  `permission-authorization-plan.v4.schema.json`, and
  `permission-authorization-decision.v4.schema.json`: Host DOM root/operation
  dimensions in the existing profile ledger, plan, and explicit decision path;
- `permission-capability-catalog.v3.schema.json`: complete 25-entry catalog
  with the original 22 non-DOM entries, structured rendering, and separately
  classified Host DOM read/modify eligibility;
- `host-dom-common.v1.schema.json`: canonical root ids, closed read/modify
  operations, opaque handles/node refs, safe attributes, and Host-rendered
  structured child definitions;
- `host-dom-root-catalog.v1.schema.json`: versioned Host-authoritative mount/root
  catalog with per-root availability and supported operations;
- `host-dom-bridge-request.v1.schema.json` and
  `host-dom-bridge-result.v1.schema.json`: bound-client acquire/read/modify/
  release documents; omitted read/modify `node` means only the exact root bound
  to the opaque handle, allowing modify-only root access without a read lease;
  bounded serialized projections and no selector,
  native node, HTML, style, script, callback, or private bridge;
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
- `agent-conversation-shell-snapshot.v1.schema.json`: frozen Host-owned
  participant list plus text-message/status timeline contract;
- `agent-conversation-shell-{common,binding,snapshot,subscription,page,result,command-context}.v2.schema.json`:
  explicit Shell v2 successor with Agent identity, fixed member-to-participant
  mapping, exact active-run/presence triples, AgentLoop-v2-canonical details
  URLs, closed-source messages, reactions, member-presence progress, and
  generation-fenced ordered updates;
- `agent-conversation-shell-{common,binding,snapshot,subscription,page,result,command-context}.v3.schema.json`
  plus `agent-conversation-shell-room-settings-{request,result}.v3.schema.json`
  and `agent-conversation-shell-room-collection-leading-visual.v3.schema.json`:
  the complete Shell v3 successor, reusing the frozen v2 item definitions while
  adding an optional explicit-empty/present Room description and an atomic,
  request-idempotent, owner/binding/generation/Room/snapshot-fenced settings
  mutation with closed applied, conflict, and unavailable results, plus a
  standalone embedded semantic-icon or Room-associated composite-avatar value
  for Host-owned collection rows;
- `agent-conversation-shell-{common,binding,snapshot,subscription,page,result,command-context}.v4.schema.json`,
  `agent-conversation-shell-subscription-close.v4.schema.json`, the v4
  Room-settings request/result schemas, and the v4 Room collection leading
  visual schema: the additive Session-compatible Shell successor. Active runs
  and presence carry exact Session ids; messages carry closed structured
  SessionEvent or Chatroom-acknowledgement sources; approvals carry exact
  Session/generation/approval identity; introductions carry Session/message
  correlation; and subscription closure is first-terminal and fenced. V3 and
  every AgentLoop schema remain unchanged and available;
- `agent-conversation-shell-{common,binding,snapshot,subscription,page,result,command-context}.v5.schema.json`,
  `agent-conversation-shell-subscription-close.v5.schema.json`, the v5
  Room-settings request/result schemas, and the v5 Room collection leading
  visual schema: the additive composer-shortcut successor. The snapshot
  composer requires the closed `enter | mod-enter` policy while retaining one
  submit command; every v4 Room, item, action, settings, Session correlation,
  and subscription lifecycle shape remains available. V4 public bytes remain
  frozen;
- `agent-conversation-shell-{common,binding,snapshot,subscription,page,result,command-context}.v6.schema.json`,
  `agent-conversation-shell-subscription-close.v6.schema.json`, the v6
  Room-settings request/result schemas, and the v6 Room collection leading
  visual schema: the additive terminal-approval replay successor. Pending
  approvals retain exact live Agent generation and non-empty actions; durable
  terminal approvals are always actionless and may omit generation when exact
  same-Session asked/decided facts are the only persisted authority. V1-v5
  public bytes remain frozen;
- `approval-common.v2.schema.json`, `approval-question.v2.schema.json`,
  `approval-decision.v2.schema.json`, and
  `approval-authority-binding.v1.schema.json`: exact live requester/authority
  Approval bindings plus one generation-free, ignorable SessionEvent context
  containing durable definition identities and exact structured plain-text
  reason. Approval v1 and SessionEvent v1 bytes remain unchanged;
- `approval-request-routing-registration.v1.schema.json`,
  `approval-request-routing-question.v1.schema.json`,
  `approval-request-routing-result.v1.schema.json`, and
  `approval-request-resolver-close.v1.schema.json`: approval/v3's exact
  requester-bound, owner/generation/connection-fenced pre-persistence resolver
  lifecycle. Accepted results carry exact live requester and authority bindings
  for Host verification before delegation to approval/v2; unavailable or stale
  resolution fails closed without adding a second ledger;
- `agent-conversation-shell-{common,binding,snapshot,subscription,page,result,command-context}.v7.schema.json`,
  `agent-conversation-shell-subscription-close.v7.schema.json`, the v7
  Room-settings request/result schemas, and the v7 Room collection leading
  visual schema: exact requester-authority approval bubbles, approve/reject-only
  live authority-fenced commands, exact plain-text reasons, and actionless
  terminal history without reconstructed live authority. V1-v6 remain frozen;
- `agent-loop-common.v1.schema.json`, the unchanged `agent-loop-*.v1` family,
  and `agent-definition.v1.schema.json`:
  room-neutral Agent identity, field-specific inheritance, structured prompt
  sections, filters, runtime defaults, text/image-reference content, and the
  original per-client command-id contract;
- `agent-loop-task-binding.v2.schema.json`, `agent-loop-command.v2.schema.json`,
  and `agent-loop-result.v2.schema.json`: opaque generation-fenced task
  binding plus durable operation-id create-or-bind/send exchanges, accepted
  delivery dispositions, stable send turn identity, and typed resource failures
  that remain separate from existing task/turn authorization outcomes;
- `agent-loop-event.v2.schema.json`,
  `agent-loop-event-subscription.v2.schema.json`, and
  `agent-loop-event-page.v2.schema.json`: proactive ordered
  message/approval/lifecycle events with replay/live paging; and
- `agent-loop-bound-client.v2.schema.json`: the fiber-owned injected Agent
  Loop client surface with a provider-owned, generation-fenced durable operation
  ledger that survives client disposal;
- `agent-loop-{common,task-binding,command,result,event,event-subscription,event-page,bound-client}.v3.schema.json`:
  the complete Agent Loop v3 successor, preserving v2 create/bind/send and its
  durable ledger while adding an exact-binding `approval-decision`,
  `approvals.decide` authorization, closed conflict/unavailable results, and
  required operation causation for decision-resolved approval events; it also
  adds durable request/cancel member-self-introduction intents, stable accepted
  turn/message identities, and causation-fenced introduction/cancellation
  events without a prompt, body, model, response, or consumer-time field;
- `agent-loop-{common,task-binding,command,result,event,event-subscription,event-page,bound-client}.v4.schema.json`:
  the immutable additive Agent Loop v4 successor. It preserves every v3 byte
  while the v4 wire surface applies the intentional approval corrections and
  required accepted-result causation. Approval commands/results use terminal-state
  `approved`, `denied`, and `cancelled` tokens, and allowed-authorization
  unavailability adds `binding-closed` for approval and self-introduction.
  Accepted approval and request/cancel member-self-introduction results carry
  structured causation whose
  `operationId` exactly equals that result's own `commandId`; a cancellation
  still uses `requestOperationId` to identify the original request. All
  non-accepted results and accepted create/bind/send results forbid causation;
- `agent-loop-task-details-common.v2.schema.json`: canonical Host or external
  details URL used by accepted create-or-bind results;
- `agents-common.v1.schema.json`, `agent-acquire-request.v1.schema.json`,
  `agent-acquire-result.v1.schema.json`, `agent-admission.v1.schema.json`,
  `agent-message-cancellation-result.v1.schema.json`,
  `agent-mutation-result.v1.schema.json`,
  `agent-status-observation.v1.schema.json`, and
  `agent-live-event.v1.schema.json`: additive Agent Registry acquisition,
  MessageId-only admission, live handle state, cancellation, ownership, and
  non-durable coordination events with `AgentId = SessionId`;
- `agent-admission-target-origin.v3.schema.json` and
  `agent-admission-target-reservation.v3.schema.json`: opaque, Host-issued,
  exact Room-delivery capabilities and one-shot pre-submit reservations for
  multi-target composer dispatch;
- `agent-admission-bootstrap-{target-origin,reservation}.v4.schema.json` and
  `agent-admission-bootstrap-room-{target-origin,reservation,target-receipt}.v5.schema.json`:
  bootstrap command target admission and exact Room source capture without a
  pre-existing Session;
- `agent-admission-bootstrap-route-{continuation,reservation,claim-receipt}.v6.schema.json`:
  exact declared Room-route continuation, one-shot pre-submit reservation, and
  Host-stamped source-capture rebind evidence. The continuation moves only an
  accepted captured source to its declared new Room binding; it is not a
  generic post-navigation authority;
- `session-common.v1.schema.json`, `session-snapshot.v1.schema.json`,
  `session-read-request.v1.schema.json`, `session-event.v1.schema.json`,
  `session-event-page.v1.schema.json`, `session-subscribe-request.v1.schema.json`,
  `session-subscription-page.v1.schema.json`, and
  `session-subscription-close.v1.schema.json`: the additive read-only Session
  surface, sole persistent SessionEvent fact stream, fixed-watermark paging,
  contiguous replay-to-live delivery, and first-terminal closure fences;
- `approval-question.v1.schema.json` and `approval-decision.v1.schema.json`:
  the independent Agent-scoped approval seam with exact question/decision
  identity and fail-closed terminal outcomes;
- `agent-avatar.v1.schema.json` and
  `agent-avatar-resolution-result.v1.schema.json`: stable generated, asset,
  definition, and reserved platform Agent avatar references plus a typed
  resolver boundary with qualified opaque refs only;
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
- `entity-file.v1.schema.json` and `entity-common.v1.schema.json`: editable
  profile-local Agent definition source, bounded same-entity Markdown
  references, deterministic digest/revision, compiled definition records, and
  Host-bound installation/profile scope;
- `entity-session-definition-binding.v1.schema.json`: the exact definition
  snapshot persisted in an ignorable `entity/definition-bound` SessionEvent so
  resume does not depend on the mutable local entity directory;
- `entity-template-declaration.v1.schema.json` and
  `entity-template-materialization-result.v1.schema.json`: package-relative
  create-if-absent templates with exact digest and closed preservation/errors;
- `entity-registry-{snapshot,request,result,change-page,subscription-close}.v1.schema.json`:
  scoped read/CAS-save, ordered file changes, typed sharing/quota boundaries,
  and first-terminal subscription fences without caller paths or owner scope;
- `entity-agent-acquire-{request,result}.v1.schema.json`: current-registry
  definition resolution for create and Session-persisted definition resolution
  for resume while frozen inline Agent acquire v1 remains valid;
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
- `plugin-package.v4.schema.json`: package-v3 boundaries plus a separately
  digested runtime-manifest v5 reference; frozen package v1-v3 are unchanged;
- `plugin-package.v5.schema.json`: package-v4 boundaries plus optional
  package-relative entities-v1 template declarations; package v1-v4 remain
  unchanged;
- `plugin-package.v6.schema.json`: package-v5 boundaries plus a closed runtime
  manifest-v6 reference for exact Agent Session route declarations;
- `plugin-manifest.v7.schema.json`: manifest-v6 capability/service vocabulary
  plus the isolated transient-canvas Worker execution declaration;
- `plugin-package.v7.schema.json`: package-v6 boundaries plus a closed runtime
  manifest-v7 reference;
- `plugin-generation-artifact.v1.schema.json`: one immutable, path-confined
  browser ESM module graph with exact module/style/asset inventory, per-file
  integrity, closed shared Host imports, and initial-versus-lazy resource edges;
- `surface-contribution.v8.schema.json`: structured isolated transient-canvas
  presentation metadata;
- `host-extension-point-catalog.v8.schema.json`: catalog v7 plus the
  experimental composer submit effects point;
- `transient-canvas-registration.v1.schema.json`: bounded Worker-local canvas
  program metadata; callbacks never cross the document;
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
