# Protocol Specifications

This directory is the human-readable normative source for the CordisX plugin
protocol. Topic pages own version navigation; the [TypeScript index](../../types/INDEX.md)
maps exact package entrypoints. [Schemas](../../schemas/README.md) describe wire
shapes, while [conformance](../../conformance/README.md) checks behavior. Their
roles and change requirements are defined in the [maintenance rules](../rules/README.md).

## Packages, configuration, and trust

- [Marketplace](marketplace/README.md): discovery feeds and [trust](marketplace/trust.md).
- [Manifests](manifests/README.md), [lifecycle](lifecycle/README.md), and
  [distribution](distribution/README.md): versioned package/runtime documents,
  explicit local sources, dependency graphs, activation, and rollback.
- [Plugin generation artifacts](plugin-generation-artifact/README.md): immutable
  browser ESM graphs, confined relative resources, shared Host modules, demand,
  and generation-owned style cleanup.
- [Plugin bundles](plugin-bundles/README.md): explicit-local bundle artifacts,
  member ownership, coordinated operations, and Host Manager projections.
- [Plugin configuration](plugin-configuration/README.md) and
  [service configuration](service-configuration/README.md): validation, Host forms,
  revisions, secrets, and application/restart boundaries.
- [Platform provider service](platform-provider/README.md): source-fenced Node
  provider definitions, redacted factory inputs, bounded broker calls, and
  Host-owned Fleet publication.
- [Platform capabilities](platform-capabilities/README.md): portable provider,
  model, Session, identity, and permission contracts, with versioned permission
  successors and a separately authorized Host DOM bridge.
- [Publisher grants](publisher-grants.md): external-publisher commerce descriptors,
  signed statements, device binding, and activation-registry boundaries.

## Agent, Session, and external services

- [Agent and Session runtime](agent-runtime/README.md): Agent handles, persistent
  SessionEvent facts, approvals, and the versioned admission entrypoints.
- [Agent task permissions](agent-task-permission/README.md): command-bounded
  Host provenance, exact approval grants, and manifest/package v12 coexistence
  with ordinary route approvals.
- [Agent task approval binding and ownership](agent-task-binding/README.md):
  required existing approval registration before submission, explicit same-Session
  recovery and genuine owner handles after acceptance.
- [Agent tasks](agent-task/README.md): context-validated, owner-scoped durable
  create-and-submit with pre-bound tools and read-only reconciliation queries.
- [Agent detail navigation](agent-detail-navigation/README.md): read-only
  current Session-to-detail reference projection and Host-owned opaque detail
  navigation without raw URLs or Agent acquisition.
- [Product-page Agent admission](agent-page-admission/README.md): Host-issued
  page composer origins, exact target-scoped pre-submit delivery, and explicit
  fresh-Room route claims without reusing Conversation Shell origins.
- [Entities](entities/README.md): profile-local Agent source files, templates,
  deterministic revisions, and AgentDefinition resolution.
- [AgentLoop](agent-loop/README.md): independently versioned v1-v4 bindings,
  commands, delivery, approvals, and operation causation.
- [Agent events](agent-events/README.md) and [history](agent-history/README.md):
  versioned event delivery and read-only historical projections.
- [Agent avatars](agent-avatar/README.md): stable identity references and portable
  canonicalization helpers.
- [Channel runtime](channel-runtime/README.md) and
  [task gateway](channel-task-gateway/README.md): sourced messages, complete
  binding identities, redacted state, and launcher-side dispatch authorization.
- [Connector service](connector-service/README.md): descriptors, bound public
  clients, authorization, ordered subscriptions, and disposal.

## UI contracts

- [Structured UI](ui-contributions/README.md): contributions, commands, routes,
  pages, outlets, and their compatibility boundaries.
- [Extension points](extension-points/README.md),
  [UI extension catalog](ui-extension-catalog/README.md), and
  [slot control plane](slots/control-plane-v1.md): descriptors, authorization,
  selection, structured contribution families, and lifecycle.
- [Conversation Shell](agent-conversation-shell/README.md): frozen compatibility
  wire families and their separate composer command-context successors. These
  exports do not require a Host shell service; the topic records product ownership.
- [Manager content navigation](manager-content-navigation/README.md): declaration
  and projection version map, including localized finite-choice configuration.
- [Manager collections](manager-collection/README.md) and
  [navigation collection actions](navigation-collection-actions/README.md):
  queries, structured rows, commands, copy, confirmation, and feedback.
- [Manager settings tabs](manager-settings-tabs/README.md) and
  [settings navigation](manager-settings-navigation/README.md): structured settings
  surfaces, Host-owned page chrome, and the versioned visual group catalog.
- [Visuals](visuals/README.md): owner-local providers, detached immutable data,
  effective theme projection, generation-scoped cleanup, and contained rendering.
- [Raster images](raster-image/README.md): bounded PNG snapshots after
  product-specific composition, without URL, SVG, DOM, callback, or product semantics.
- [Icon themes](icon-theme/README.md),
  [reasoning presentation](reasoning-intensity-presentation/README.md),
  [session backdrops](session-backdrop-presentation/README.md), and
  [transient canvas](transient-canvas/README.md): bounded visual contracts.
- [Plugin DevTools console](plugin-devtools-console.md): attributed, redacted,
  generation-fenced Host diagnostics.

## Maintainer material

[Release operations](../maintainers/release.md) and
[dated adoption notes](../maintainers/adoption-notes.md) are outside the normative
specification layer. They record repository operations and historical handoffs;
contract availability here does not establish deployment or consumer acceptance.

- [Extension point visuals v1](extension-point-visuals/README.md): experimental controlled visual seats and exact interaction authority.

- [Visual drag v1](extension-point-drag-v1.md): optional generation-scoped drag handle.

- [Plugin Agent tools](agent-tools/README.md): generation-bound Skill resources and restricted CLI invocation.

- [Visual interactions v1](extension-point-interactions-v1.md): independent entity drag and controlled menus.

- [Entity settings navigation](entity-settings-navigation/README.md): exact definition settings availability and opening.
- [Route link resolution](route-link-resolution/README.md): authenticated canonical route links.
- [Controlled Markdown editor](controlled-markdown-editor/README.md): controlled editing and selection capability.

- [Local usage v1](usage-v1.md): profile-scoped durable usage and manifest/package v11.
