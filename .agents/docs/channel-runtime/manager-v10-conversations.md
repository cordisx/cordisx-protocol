# Channel Manager v10: remote conversations and local relationships

The explicit `channel-manager/v10` successor groups remote conversations by the
complete adapter, account, tenant and conversation identity. Display names are
not keys. A group or private chat can have zero, one or many local task bindings.
There is no persistent binding-count limit. Page limits (1–100) bound one read.
Predecessor methods and wire documents remain frozen.

`conversationPage` supplies opaque conversation targets, public names, kinds,
binding counts and actual local receive/send counts. `directoryComplete` reports
whether platform discovery was complete; an unavailable directory must not hide
known local relationships. Avatars are optional normalized `raster-image/v1`
bytes. A missing image uses the consumer's platform icon; the Host never returns
an authenticated image URL, cookie, token or credential.

`conversationDetail` resolves the issued target. `conversationBindings` lists
every local binding for that conversation, including archived bindings, through
the existing safe binding display family. A target is bound to its connection,
profile, Host/service incarnation and lifetime. Removing an account or retiring
a generation invalidates its targets.

`conversationActivity` is explicitly `source=local-transport`: it reads existing
durable inbound and outbound records. It does not claim a complete platform-side
history and does not read a Codex task transcript. Received user text and actual
queued/delivered outgoing text are untrusted content. Rendering must use plain
text or the existing safe content renderer. Delivery is `sent` only after a
positive platform receipt. Queued, retrying, failed, cancelled and unknown
states remain distinct. Inbound permission-pending and denied records retain
their actual state instead of appearing successfully applied.
Local commentary/final answers cannot become outgoing
records merely because a turn completed or stopped. Task attribution is optional
and must come from an actual recorded origin; legacy records must not acquire
guessed task names. Transport errors expose a bounded safe code, never raw errors.

Every page binds profile, Host generation and snapshot revision. Continuation
cursors are opaque, short-lived and bound to the exact target, operation,
revision and page budget. A stale or cross-target cursor is rejected. A read
does not send, bind, authenticate, reconnect or change a task's settings.

## Authority and compatibility

Conversation metadata and binding reads follow `channel.accounts.read` and
`channel.bindings.read`. Activity adds `channel.events.subscribe` for the exact
resolved conversation. The explicit `forOwnConversationService()` facade permits
the active provider to inspect its own account's transport records; it grants
no sending, account credentials, foreign service access or native task authority.
The user-triggered `openBindingConversation` resolves an issued binding target
and opens its actual local chat through Host navigation. It never resumes a
turn, exposes a native session id, or opens an arbitrary supplied URL.
The association must be Host-created from successful service activation and
rechecked through caller tracing after each asynchronous read. Borrowed or
retired facades remain invalid. Delegated consumers retain ordinary declared
scope and user authorization, including explicit denials.

Older Hosts lack this successor. Consumers keep their existing binding display
or show an honest unavailable state for conversation activity; they must not
read a private store, bridge or Codex database to imitate the new methods.

The owning Host and plugin still require their own composition and runtime
evidence. Protocol conformance does not prove an installed runtime supports v10.
