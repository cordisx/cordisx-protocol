# Model Providers V1

Experimental contract `cordisx.model-providers/v1`, exposed through
`@cordisx/protocol/model-providers/v1`. Host adoption and native validation are
separate from this contract's existence.

The Host owns provider discovery, catalog state, selection, grouping, navigation,
focus, and native-session transitions. Node services publish ready endpoints
through the managed-service runtime; credentials never enter this renderer API.
The Host must not infer a ready provider from a renderer presentation entry.

`modelProviders` is injected with the plugin's identity and generation. `present`
contributes branding only for providers owned by that plugin. `insert` adds a
separate supplemental row with a leading brand icon and trailing action icon.
The plugin controls its content, lifetime and action: login is not prescribed.
It disposes its row when it is no longer applicable. Actual registered provider
rows remain Host-rendered, independent of these entries.

`present.models` may add labels, groups and explicit equivalence aliases only to
model IDs already published by the same plugin's Node service. Unknown IDs are
ignored: presentation cannot introduce additional selectable models or change
their native IDs. `list` exposes immutable safe catalog snapshots; `subscribe`
observes changes and `refresh` requests a fresh discovery projection.

Registrations are immutable and owner-local; duplicate IDs are rejected.
Disposal is idempotent and generation retirement removes all contributions,
subscriptions and pending actions. Action signals abort on contribution removal.
Errors remain visible in the Host action surface. Host renders labels as text,
validates BrandIcon V1 values, and accepts no HTML, CSS, or DOM callbacks.
These callbacks execute as trusted plugin code, not in a security sandbox.

Model identity is `(providerId, model.id)`. Same-model matching first uses the
exact ID, then explicit aliases. Display labels and fuzzy normalization are not
equivalence. Ambiguous or absent equivalents require user model selection.
Provider changes on an existing conversation require confirmation; a failed
native transition must not be presented as success. No silent new conversation,
history deletion, compaction, or interruption is authorized by this API.

Hosts without the contract must leave the native selector available. Plugins
may keep their normal settings entry as a downgrade and must not patch Host DOM.
