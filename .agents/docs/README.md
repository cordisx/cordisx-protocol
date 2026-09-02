# Protocol Specifications

This directory is the human-readable normative source for the CordisX plugin protocol.

Specified areas:

- `marketplace/`: discovery-only catalog feeds;
- `ui-contributions/`: structured shell contributions, commands, routes,
  pages, outlets, compatibility, and lifecycle version 1.
- `navigation-collection-actions/`: closed immutable command and Host-owned
  copy actions for a versioned successor to dynamic navigation collection
  rows, including confirmation, feedback, placement, tone, and ownership.
- `platform-capabilities/`: adapter-neutral provider, model, session, turn,
  permission, composite identity, current-connection, and external
  provider-fleet contracts version 1, plus Host-owned risk, rationale,
  decision-lifetime, install-review, and migration contracts version 2;
  Certified structured rendering version 3; and bounded Host DOM read/modify,
  opaque handles, root catalogs, isolation, and revocation version 4.
- `extension-points/`: host descriptor catalogs, canonical point policy, and
  surface/outlet authorization origin version 1.
- `agent-events/`: adapter-neutral Session/Agent ledger, DSH-aligned delivery
  handles, cancellation, pre-step/prompt lifecycle, permission, degradation,
  and pagination contracts versions 1 and 2.
- `agent-history/`: read-only, permission-scoped historical Agent projections,
  opaque pagination/tail, payload policy, provenance, and privacy contract
  version 1.
- `agent-runtime/`: additive Agent Registry/live handles, read-only Session
  registry, append-only SessionEvent truth, closed subscription fences, and
  Agent-scoped approval version 1; existing AgentLoop contracts remain intact.
- `ui-extension-catalog/`: complete host-neutral UI point vocabulary,
  structured contribution versions 2 through 7, availability, contextual
  invocation, DSH intent mapping, and explicit replacement refusals.
- `icon-theme/`: closed semantic icon keys, Reicon default/fallback, versioned
  provider registration and selection, normalized vector resolution, exact
  generation disposal/rollback, and strict Host rendering ownership.
- `reasoning-intensity-presentation/`: Host-owned projection of the native
  reasoning range with bounded semantic material stages and strict cleanup.
- `session-backdrop-presentation/`: Host-owned session ambience and transparent
  portrait projection driven by native reasoning progress.
- `manager-settings-tabs/`: structured Manager settings content-tab surface
  versions 4/5, catalog versions 3/4, controlled body-only outlet,
  deterministic projection, authorization origin, and lifecycle.
- `manager-settings-navigation/`: top-level Manager settings-adjacent
  navigation items in surface version 5/catalog version 4, standard page
  shell, deterministic host/plugin merge, authorization, and lifecycle.
- `manager-content-navigation/`: generic Manager subroute declarations plus
  the separate Host-owned header/breadcrumb/back/history/tab projection,
  including dynamic renderer-safe record titles and the v2 optional tab-label
  override that leaves route identity unchanged.
- `manager-collection/`: Host-rendered Manager body collections with stable
  views, Host-owned title/summary search, query-fenced sources, structured
  rows/actions, text-input commands, closed results, and strict lifecycle.
- `channel-runtime/`: structured Channel identity, sourced user input,
  persistent Platform session bindings, redacted runtime snapshots, scoped
  permissions, and launcher-side service declarations.
- `channel-task-gateway/`: launcher-private Channel workspace
  resolution/authorization, Platform create/follow-up dispatch, durable task
  lifecycle events, and Channel outbox correlation contract version 1.
- `connector-service/`: room-neutral connector descriptor, registration,
  command, message/event, generation, disposal, public consumer,
  Host-bound authorization, and serialized subscription contracts version 1.
- `agent-loop/`: Host-bound room-neutral Agent definitions, self-contained
  inheritance catalogs, task bindings, create-or-bind/send operations, and
  proactive message/approval/lifecycle events version 1.
- `agent-avatar/`: stable generated, asset, definition, and reserved platform
  Agent identity references with canonical seed and inheritance semantics.
- `plugin-configuration/`: Standard Schema validation, Schemastery form
  metadata, profile/plugin/generation scope, revision-fenced mutations,
  live/restart application, last-good rollback, secret handling, and
  lifecycle-owned custom field renderers.
- `service-configuration/`: plugin-owned launcher service schemas projected
  into the owning plugin detail through Host-owned forms, exact CAS and
  generation fences, opaque secret references, and explicit service/app
  restart planes.
- `manifests/`, `lifecycle/`, and `distribution/`: explicit-local package
  manifests and three-form local sources, exact dependency graphs, five
  minimum apply scopes, revision/generation/package-fenced staged lifecycle
  operations, atomic registry publication, immutable activation records,
  last-good rollback, and redacted manager snapshots.
- `publisher-grants.md`: external-publisher commerce descriptors, signed
  `grant`/`renew`/`revoke`/`transfer` statements, device-key binding, minimal
  activation-registry boundary, trusted-time/offline behavior, and conformance.

Planned areas include isolated execution, remote distribution, publisher-key
registration UX, activation-registry deployment, transparency, and public
marketplace activation.
