# Channel Manager v8 connection form

`@cordisx/protocol/channel-manager/v8` extends v7 with
`mountConnectionConfigurationForm(connectionToken, target, options)` and
`forOwnConfigurationService()`. Previous methods and operation documents are
unchanged. Capability detection keeps older Hosts on their v7 credential form
or the frozen modal workflow.

The successor mounts one Host-owned form in an empty, live, same-owner Manager
body seat. Host owns application identity, optional new secret, display name,
reception selectors, draft, validation, save and reset. Existing identities are
read-only. An empty secret keeps the current opaque reference. Stored secrets,
private configuration, credential drafts and field values are never returned to
the plugin. Options and redacted outcomes are the frozen v7 types.

Saving ordinary settings uses the current exact-connection authorization and
the read revision. When a new secret is supplied, Host captures and authorizes
the same account and commits the new reference and ordinary patch in one
configuration CAS; partial settings success must never be reported. Stale
generation, changed revision, rejected capture or failed commit retains the
editable draft and releases private capture authority. Reset clears the new
secret and returns all editable settings to the latest confirmed baseline.

Background refresh may update unedited values, but must retain local edits and
must never silently save them. Aborting the caller, replacing the page or
retiring its plugin disposes the form and transient secret. The own-service
facade has the same activated-service and actual Cordis caller fences as v7;
it does not manufacture a delegated user grant.

This is an experimental local contract until formal provider delivery.
Conformance and packed consumer checks establish the contract shape, not a
Host release, native validation or user acceptance.
