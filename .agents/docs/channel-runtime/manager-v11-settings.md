# Channel Manager v11: unified settings

The explicit `channel-manager/v11` successor exposes Host-owned settings forms
for `new-chats`, `messages`, `permissions` and `organization`. Consumers declare
their own standard child routes and sibling tabs; they never render a second
tab strip or policy form. Frozen predecessor methods remain available.

`mountSettingsForm` uses the existing caller, managed page seat, service owner,
read/write authorization and revision-fenced persistence. Drafts belong to the
actual caller source and generation. Moving between sibling settings routes
retains unsaved values; disposing the plugin retires them. A form mount cannot
change permissions, authenticate an account or save before a user action.
New-chat defaults use the existing profile defaults store. Policy sections use
the existing policy store and preserve fields edited through other sections.

`registerChatCreationSettingsDestination` registers a static route belonging
to the active own-service caller. It carries no authority and accepts no owner,
URL or foreign route. Host may suppress its duplicate new-chat-default shortcut
only when the destination route and page are currently valid, authorized and
available. Revocation, disposal or generation retirement restores the Host
shortcut. Merely registering a name does not make a route available.

Older Hosts lack this successor. Consumers keep their existing Host form
workflow without attempting to hide Host navigation or create private tabs.
Protocol checks do not prove Host adoption or user acceptance.
