# Manager Content navigation protocol v1

This document remains normative for frozen v1. Choose the required declaration
version below; projection versions advance independently. Earlier contracts
remain available unchanged.

| Declaration | Scope | Projection | TypeScript | Conformance |
| --- | --- | --- | --- | --- |
| [v1](#contracts-and-compatibility) | Subroutes and Host-owned navigation chrome | [v1](../../../schemas/manager-content-projection.v1.schema.json) | [v1](../../../types/manager-content-navigation.v1.d.ts) | [v1](../../../conformance/manager-content-navigation.mjs) |
| [v2](./v2.md) | Optional localized tab labels | [v1](../../../schemas/manager-content-projection.v1.schema.json) | [v2](../../../types/manager-content-navigation.v2.d.ts) | [v2](../../../conformance/manager-content-navigation-v2.mjs) |
| [v3](./v3.md) | Fixed record summary and exact Agent-definition detail subject | [v2](../../../schemas/manager-content-projection.v2.schema.json) | [v3](../../../types/manager-content-navigation.v3.d.ts) | [v3](../../../conformance/manager-content-navigation-v3.mjs) |
| [v4](./v4.md) | Host-owned plugin configuration form body | [v3](../../../schemas/manager-content-projection.v3.schema.json) | [v4](../../../types/manager-content-navigation.v4.d.ts) | [v4](../../../conformance/manager-content-navigation-v4.mjs) |
| [v5](./v5.md) | Localized labels for finite scalar choices | [v4](../../../schemas/manager-content-projection.v4.schema.json) | [v5](../../../types/manager-content-navigation.v5.d.ts) | [v5](../../../conformance/manager-content-navigation-v5.mjs) |

This specification defines a generic subroute declaration and a separate renderer-safe Host projection for standard pages in the CordisX Manager. It is not a Channel-specific API and it does not expose a renderer navigation controller. A Channel (or any other plugin) registers data; the Host owns the Manager header, breadcrumb trail, back action, history, tablist, accessibility, selection, route stack, and all lifecycle cleanup.

## Contracts and compatibility

The independent, closed contracts are `manager-content-navigation.v1.schema.json`, a plugin-owned declaration of one Manager content subroute, optional parent route, header title source, and tab-to-route map; and `manager-content-projection.v1.schema.json`, the Host-to-renderer snapshot after route resolution, localization, record-title lookup, breadcrumb/back derivation, history calculation, and tab selection.

They are additive. `route.v1/v2`, `page.v1/v2/v3`, surface contribution versions 1-5, and the Manager settings contracts remain frozen. An older Host keeps an unknown v1 declaration inactive with a compatibility diagnostic; it must not reinterpret it as a free-DOM mount, a page header callback, or a plugin-controlled history entry.

## Declaration

Every declaration has a same-owner `route` reference, including optional typed scalar `params`. `parentRoute`, when present, is also a same-owner reference. It describes hierarchy only: it does not provide breadcrumb text or a back button. The Host resolves the route/page records, verifies the `manager.content` outlet and standard chrome, and builds all visible chrome from Host state.

`header.title.kind: "route"` uses resolved route/page display metadata. `kind: "record"` names one current named route parameter and supplies a localized fallback. The Host uses that opaque parameter to look up a dynamic record title, redacts it as necessary, and emits only a renderer-safe `recordId` plus structured text. A declaration cannot embed a record object, raw response, credential, secret reference, file path, bridge handle, DOM node, selector, HTML, CSS, component, callback, URL, or native history value.

Tabs contain only a stable local tab id and a same-owner route reference with parameters. They neither render labels nor select themselves. The Host resolves tab labels and disabled/active states, enforces one selected tab at most, and provides `tablist`/`tabpanel` semantics.

## Host projection and lifecycle

The projection contains bounded localized display text, Host icon tokens, owner-qualified route references, and no executable or host-private values. It is read-only renderer data, not a raw bridge. `breadcrumbs`, `back`, and `history` are outputs only. `history.index`, `history.length`, and navigation flags reflect the Host stack; plugins do not supply or mutate them.

For a subroute the Host retains the declared parent as the final plugin breadcrumb and back target. It may prepend Host ancestors. The Host owns browser/native history integration (if any), so a plugin never calls an outer router, assembles a URL, or reads DOM history. On block, policy denial, generation replacement, removal, failed mount, close, or stale route, it aborts the active body signal, disposes the body, clears the controlled outlet, and reprojects a valid Host fallback. A restored declaration becomes eligible but never steals navigation.

The controlled Manager page body remains trusted local renderer code; this is not process or iframe isolation and grants no Platform, Agent, filesystem, or secret capability.

## Conformance and TypeScript

`conformance/manager-content-navigation.mjs` validates same-owner route resolution, named dynamic-record parameters, parent-cycle rejection, standard Manager page-shell compatibility, exact tab route maps, Host-derived back/history, and the renderer-safe output shape. Its fixtures explicitly reject free DOM, selectors, secrets, raw bridges, and plugin-owned history.

`types/manager-content-navigation.v1.d.ts` gives TypeScript consumers the same declaration/projection split. `npm run typecheck` compiles its positive fixture under strict NodeNext settings.
