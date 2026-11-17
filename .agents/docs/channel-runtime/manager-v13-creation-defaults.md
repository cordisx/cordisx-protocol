# Channel Manager v13: inherited creation defaults

The additive `channel-manager/v13` successor exposes
`mountChannelCreationDefaultsForm`. It mounts a Host-owned form for the Channel
creation-default layer. It uses the existing own-service caller, managed page
seat, read/write authorization, revision fence and generation-scoped draft
lifetime. Opening the form never saves a value or changes a running chat.

General profile defaults and Channel creation defaults are separate settings
owners. A newly created Channel task starts with the current general profile
defaults, then applies explicit Channel fields. Missing fields and `inherit`
fall through to the general defaults; explicit `false` remains an override.
More specific Channel task-model rules retain precedence for the fields they
control. Ordinary chats use only the general defaults. Defaults are captured
at creation and do not retroactively change an existing or resumed task.

The form edits only the Channel overlay. It does not copy inherited values
into the overlay, write general defaults, authenticate an account or grant
permissions. Choosing inheritance removes that field's Channel override, so
subsequent general-default changes apply to later Channel creations.

Frozen v9-v12 `mountChatCreationDefaultsForm` and
`mountSettingsForm('new-chats', ...)` retain their general profile-default
semantics. Consumers detect the new method for their Channel settings tab;
older Hosts keep the existing general-default form workflow. No plugin may
imitate an independent overlay through private Host access. The general Host
settings entry remains independent of Channel settings destinations.

Protocol conformance establishes the contract, not Host adoption, publication
or native user acceptance. See [v11 settings](manager-v11-settings.md) and
[task-model rules](task-settings-v1.md) for the preserved predecessors.
