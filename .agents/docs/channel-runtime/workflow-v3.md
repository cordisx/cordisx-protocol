# Channel workflow policy v3 and Manager v9

Status: normative successor, independently versioned from transport and older Manager operations. Host adoption and live verification require their own evidence.

## Execution settings

[`chat-execution-settings/v1`](../../../types/chat-execution-settings.v1.d.ts) specifies user-owned creation defaults and individual chat overrides. Defaults are captured at creation, not applied retroactively. Host plus chat identity owns an override independently of Channel bindings. UI, CLI and authorized external commands use the same Host service. Writes are revision-fenced, apply on the next turn and cannot answer a currently pending request. Execution scope, approval policy, work mode and effort are independent. `never` does not grant unrestricted execution. Native restrictions remain authoritative; submitted requests are not effective readback. Older native runtimes expose unknown or unavailable rather than pretending to apply unsupported fields.

## Commands and progressive targets

[Policy v3](../../../schemas/channel-conversation-policy.v3.schema.json) adds help, permissions, work-mode, choose, approve, deny and approvals. A known authorized command uses the Host command registry and does not reach the model. Unknown commands receive help. Multiple bindings without a target offer all, one or multiple readable candidates. The continuation is bound to the original actor, account and conversation, expires, and rechecks current bindings and original command permission. There is no persistent binding-cardinality maximum. Frozen v1/v2 readbacks do not contain v3 commands or sidebarGroup; older forms preserve successor fields they cannot edit.

## External native approvals

A custom platform interaction card is an application-authored message, not enterprise approval. It displays a bounded redacted request reason, scope and readable chat title; buttons or explicit text can accept once, accept for the session, or decline the exact pending native request. Actor identity comes from the authenticated platform event. User groups and command policies authorize each decision. Request, thread, turn and item identity remain Host-private. Duplicate, cancelled, expired, detached or resolved requests cannot be approved again. A click is submitted until native resolution arrives. Notifications are independent of automatic final-answer forwarding. Desktop native approvals remain available.

## Display and grouping

[Manager v9](../../../types/channel-manager.v9.d.ts) provides Host-owned inline forms and [binding page v2](../../../schemas/channel-manager-binding-page.v2.schema.json). Names are display only and never target keys. Use the platform plus the exact direct recipient or group name. Unavailable directory data uses a readable direct/group placeholder; do not guess from IDs. Auto-created chats use the configured sidebarGroup, defaulting to the Host external-connections group; null disables organization. User renaming or moving stops automatic updates. Existing manually created chats are not silently moved.

## Security and compatibility

Plugins mount forms only in Host-owned managed page seats. A binding token resolves to the current exact chat internally; it is never permission by shape and plugins cannot supply private chat IDs. Host forms own policy and execution writes, permission checks and current revision. No command grants plugin, tenant or account authority. New methods are feature-detected; older Hosts expose their preserved path or unavailable. See [package documentation](../plugin-documents/README.md) for independent help resources.
