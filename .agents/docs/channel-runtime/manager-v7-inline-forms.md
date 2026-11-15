# Channel Manager v7 inline forms

`@cordisx/protocol/channel-manager/v7` extends v6 with two Host-owned body
forms. The existing modal methods, readbacks and operation documents are
unchanged. `forOwnPageService()` follows the same activated-service and actual
Cordis caller rules as `forOwnReplyService()`.

`mountCredentialForm(connectionToken, target, options)` shows the existing
connection's application identity and a blank new-secret input. It never
reads or returns the stored secret. Host owns input events, validation,
transient secret handling, private capture, exact-account authorization and
the one-shot credential commit. The caller receives only redacted operation
outcomes. The original connection identity is retained when its key changes.

`mountConversationReplyPolicyForm(target, options)` renders the same complete
v2 policy fields as the modal form. Host reads the current profile/generation
and revision, then writes with compare-and-swap. Conflicts retain the user's
draft and never silently overwrite another window's policy. The plugin cannot
submit a policy through a callback or manufacture a credential draft.

The target must be an empty, connected body seat actually registered to this
caller's current Manager page. A matching DOM attribute is insufficient.
Host retains ownership of the mounted form, portals, accessibility and theme;
the plugin must not read its nodes or add a duplicate form. Each target has
at most one form. The mount handle reports `closed` and supports idempotent
`dispose()`. Page abort, supplied signal, owner/service retirement or target
removal closes the form, clears transient secrets and prevents late results
from publishing into the next page. A commit already completed remains
committed after its initiating page closes.

Delegated callers retain ordinary account/binding permissions. The explicit
own-service facade requires matching active service provenance and never
grants another plugin a borrowed authority. Existing account and service
generation fences remain in force. The form is not a general renderer sandbox
and does not redefine the trusted-renderer threat model.

Older Hosts retain their existing modal methods. A consumer may expose those
legacy controls honestly, but cannot claim inline form support or copy Host
credential/policy implementation into a plugin.
