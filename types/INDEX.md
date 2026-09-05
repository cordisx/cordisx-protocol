# TypeScript declarations

This index maps the exact public subpaths in [package.json](../package.json)
to their declarations and specification topics. Prefix each subpath below with
`@cordisx/protocol/`. The topic pages own version semantics and successor
navigation; a subpath version does not imply that every wire document was
reissued at that version.

The [Agent avatar helpers](../runtime/agent-avatar.v1.js) and
[Visuals helpers](../runtime/visuals.v1.js) have runtime exports; the other
entrypoints provide declarations rather than executable services. Host
availability is established by the consuming Host, separately from this index.
Run `npm run typecheck` for the strict positive and negative fixtures; package
installation checks are described in [conformance](../conformance/README.md).

## Agent and Session

| Public subpath            | Declaration                                                  | Specification or wire definition                                                                                               |
| ------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `agents/v1`               | [agents.v1.d.ts](agents.v1.d.ts)                             | [Specification](../.agents/docs/agent-runtime/README.md#public-services)                                                       |
| `sessions/v1`             | [sessions.v1.d.ts](sessions.v1.d.ts)                         | [Specification](../.agents/docs/agent-runtime/README.md#sessionevent-truth)                                                    |
| `entities/v1`             | [entities.v1.d.ts](entities.v1.d.ts)                         | [Specification](../.agents/docs/entities/README.md)                                                                            |
| `approval/v1`             | [approval.v1.d.ts](approval.v1.d.ts)                         | [Specification](../.agents/docs/agent-runtime/README.md#approval-seam)                                                         |
| `approval/v2`             | [approval.v2.d.ts](approval.v2.d.ts)                         | [Specification](../.agents/docs/agent-runtime/README.md#approval-seam)                                                         |
| `approval/v3`             | [approval.v3.d.ts](approval.v3.d.ts)                         | [Specification](../.agents/docs/agent-runtime/README.md#approval-seam)                                                         |
| `agent-admission/v1`      | [agent-admission.v1.d.ts](agent-admission.v1.d.ts)           | [Specification](../.agents/docs/agent-runtime/README.md#public-entrypoints)                                                    |
| `agent-admission/v2`      | [agent-admission.v2.d.ts](agent-admission.v2.d.ts)           | [Specification](../.agents/docs/agent-runtime/README.md#public-entrypoints)                                                    |
| `agent-admission/v3`      | [agent-admission.v3.d.ts](agent-admission.v3.d.ts)           | [Specification](../.agents/docs/agent-runtime/README.md#public-entrypoints)                                                    |
| `agent-admission/v4`      | [agent-admission.v4.d.ts](agent-admission.v4.d.ts)           | [Specification](../.agents/docs/agent-runtime/README.md#public-entrypoints)                                                    |
| `agent-admission/v5`      | [agent-admission.v5.d.ts](agent-admission.v5.d.ts)           | [Specification](../.agents/docs/agent-runtime/README.md#public-entrypoints)                                                    |
| `agent-admission/v6`      | [agent-admission.v6.d.ts](agent-admission.v6.d.ts)           | [Specification](../.agents/docs/agent-runtime/README.md#public-entrypoints)                                                    |
| `agent-page-admission/v1` | [agent-page-admission.v1.d.ts](agent-page-admission.v1.d.ts) | [Page composer origin, exact delivery reservation, and fresh Room route claim](../.agents/docs/agent-page-admission/README.md) |
| `agent-loop/v1`           | [agent-loop.v1.d.ts](agent-loop.v1.d.ts)                     | [Specification](../.agents/docs/agent-loop/README.md)                                                                          |
| `agent-loop/v2`           | [agent-loop.v2.d.ts](agent-loop.v2.d.ts)                     | [Specification](../.agents/docs/agent-loop/README.md)                                                                          |
| `agent-loop/v3`           | [agent-loop.v3.d.ts](agent-loop.v3.d.ts)                     | [Specification](../.agents/docs/agent-loop/README.md)                                                                          |
| `agent-loop/v4`           | [agent-loop.v4.d.ts](agent-loop.v4.d.ts)                     | [Specification](../.agents/docs/agent-loop/README.md)                                                                          |
| `agent-avatar/v1`         | [agent-avatar.v1.d.ts](agent-avatar.v1.d.ts)                 | [Specification](../.agents/docs/agent-avatar/README.md)                                                                        |

## Host UI and services

Conversation Shell entries are frozen compatibility exports. Their presence does
not require a Host shell service; see the topic's ownership statement.

| Public subpath                     | Declaration                                                                    | Specification or wire definition                                                                            |
| ---------------------------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| `agent-conversation-shell/v1`      | [agent-conversation-shell.v1.d.ts](agent-conversation-shell.v1.d.ts)           | [Specification](../.agents/docs/agent-conversation-shell/README.md)                                         |
| `agent-conversation-shell/v2`      | [agent-conversation-shell.v2.d.ts](agent-conversation-shell.v2.d.ts)           | [Specification](../.agents/docs/agent-conversation-shell/README.md)                                         |
| `agent-conversation-shell/v3`      | [agent-conversation-shell.v3.d.ts](agent-conversation-shell.v3.d.ts)           | [Specification](../.agents/docs/agent-conversation-shell/README.md)                                         |
| `agent-conversation-shell/v4`      | [agent-conversation-shell.v4.d.ts](agent-conversation-shell.v4.d.ts)           | [Specification](../.agents/docs/agent-conversation-shell/README.md)                                         |
| `agent-conversation-shell/v5`      | [agent-conversation-shell.v5.d.ts](agent-conversation-shell.v5.d.ts)           | [Specification](../.agents/docs/agent-conversation-shell/README.md)                                         |
| `agent-conversation-shell/v6`      | [agent-conversation-shell.v6.d.ts](agent-conversation-shell.v6.d.ts)           | [Specification](../.agents/docs/agent-conversation-shell/README.md)                                         |
| `agent-conversation-shell/v7`      | [agent-conversation-shell.v7.d.ts](agent-conversation-shell.v7.d.ts)           | [Specification](../.agents/docs/agent-conversation-shell/README.md)                                         |
| `agent-conversation-shell/v8`      | [agent-conversation-shell.v8.d.ts](agent-conversation-shell.v8.d.ts)           | [Composer command context; reuses v7 wire family](../.agents/docs/agent-conversation-shell/README.md)       |
| `agent-conversation-shell/v9`      | [agent-conversation-shell.v9.d.ts](agent-conversation-shell.v9.d.ts)           | [Bootstrap composer command context; reuses v8 exports](../.agents/docs/agent-conversation-shell/README.md) |
| `connector-service/v1`             | [connector-service.v1.d.ts](connector-service.v1.d.ts)                         | [Specification](../.agents/docs/connector-service/README.md)                                                |
| `host-dom/v1`                      | [host-dom.v1.d.ts](host-dom.v1.d.ts)                                           | [Specification](../.agents/docs/platform-capabilities/host-dom-v1.md)                                       |
| `navigation-collection-actions/v1` | [navigation-collection-actions.v1.d.ts](navigation-collection-actions.v1.d.ts) | [Specification](../.agents/docs/navigation-collection-actions/README.md)                                    |
| `manager-collection/v1`            | [manager-collection.v1.d.ts](manager-collection.v1.d.ts)                       | [Specification](../.agents/docs/manager-collection/README.md)                                               |
| `manager-content-navigation/v1`    | [manager-content-navigation.v1.d.ts](manager-content-navigation.v1.d.ts)       | [Specification](../.agents/docs/manager-content-navigation/README.md)                                       |
| `manager-content-navigation/v2`    | [manager-content-navigation.v2.d.ts](manager-content-navigation.v2.d.ts)       | [Specification](../.agents/docs/manager-content-navigation/v2.md)                                           |
| `manager-content-navigation/v3`    | [manager-content-navigation.v3.d.ts](manager-content-navigation.v3.d.ts)       | [Specification](../.agents/docs/manager-content-navigation/v3.md)                                           |
| `manager-content-navigation/v4`    | [manager-content-navigation.v4.d.ts](manager-content-navigation.v4.d.ts)       | [Specification](../.agents/docs/manager-content-navigation/v4.md)                                           |
| `manager-content-navigation/v5`    | [manager-content-navigation.v5.d.ts](manager-content-navigation.v5.d.ts)       | [Specification](../.agents/docs/manager-content-navigation/v5.md)                                           |
| `transient-canvas/v1`              | [transient-canvas.v1.d.ts](transient-canvas.v1.d.ts)                           | [Specification](../.agents/docs/transient-canvas/README.md)                                                 |
| `visuals/v1`                       | [visuals.v1.d.ts](visuals.v1.d.ts)                                             | [Owner-local providers and immutable data/theme projection](../.agents/docs/visuals/README.md)              |
| `raster-image/v1`                  | [raster-image.v1.d.ts](raster-image.v1.d.ts)                                   | [Bounded PNG snapshot after product-specific composition](../.agents/docs/raster-image/README.md)           |

## Package documents

| Public subpath                  | Declaration                                                              | Specification or wire definition                                                                          |
| ------------------------------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| `plugin-manifest/v6`            | [plugin-manifest.v6.d.ts](plugin-manifest.v6.d.ts)                       | [Specification](../.agents/docs/manifests/README.md)                                                      |
| `plugin-manifest/v7`            | [plugin-manifest.v7.d.ts](plugin-manifest.v7.d.ts)                       | [Specification](../.agents/docs/manifests/README.md)                                                      |
| `plugin-manifest/v8`            | [plugin-manifest.v8.d.ts](plugin-manifest.v8.d.ts)                       | [v8 schema; see the manifests topic for predecessor semantics](../schemas/plugin-manifest.v8.schema.json) |
| `plugin-package/v8`             | [plugin-package.v8.d.ts](plugin-package.v8.d.ts)                         | [v8 schema; see the manifests topic for predecessor semantics](../schemas/plugin-package.v8.schema.json)  |
| `plugin-generation-artifact/v1` | [plugin-generation-artifact.v1.d.ts](plugin-generation-artifact.v1.d.ts) | [Immutable browser ESM graph](../.agents/docs/plugin-generation-artifact/README.md)                       |

## Repository-only declarations

[icon-theme.v1.d.ts](icon-theme.v1.d.ts) accompanies the
[icon-theme specification](../.agents/docs/icon-theme/README.md). It is not
currently listed in the package export map; this index does not invent an npm
subpath for it. Its semantic catalog and compatibility requirements remain in
the specification and [schema index](../schemas/README.md).
