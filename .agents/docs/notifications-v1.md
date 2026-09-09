# Notifications v1

Experimental additive contract, exported at `@cordisx/protocol/notifications/v1`.
This reference defines plugin-facing behavior; renderer layout belongs to Host.
No previously frozen contract changes. Older Hosts lack this optional service:
consumers must declare the dependency or disable the operation honestly; never
substitute a private overlay or raw DOM notification.

## Ownership and input

`NotificationsV1.show()` receives a stable `kind`, severity `type`, and localized
plain-text `message`. Optional description, diagnostic details and one labeled
async action are supported. Input contains no source identity, icon, navigation
URL, markup, priority override or suppression controls. Host derives source
identity and presentation from the calling plugin's activation. A returned
handle can dismiss only the notification issued through its owner-bound facade.

Kinds use 1–96 ASCII letters, digits, dots, underscores or hyphens, beginning
with a letter or digit. They identify a semantic message category, never a
request ID or translated message. Message/description/details/action label are
bounded to 500/2000/16000/64 characters. Invalid input throws TypeError.

Same-owner, same-kind active notifications coalesce with the latest descriptor
and a repeat count. All handles for a coalesced group address that group. A new
notice arriving while its predecessor is running an action is a separate card;
completion of the older action must not dismiss the newer notice. Use recovery
actions that remain meaningful for the whole category. Different owners cannot
coalesce or dismiss each other's cards. Suppressed, disposed, inactive or
capacity-limited submissions return an inert handle. Host bounds queue and
presentation capacity and does not store notification content as history.

## Interaction and lifetime

A card identifies its plugin with its name and icon. Where a valid authorized
plugin entry exists, source activation navigates there without dismissing the
card. Card body has no implicit activation. Host provides dismiss, optional
expand/copy diagnostics, and an optional action. Only one action invocation per
card may be outstanding. A successful action closes the card; failure retains
it with an actionable failure message. An action's AbortSignal is aborted on
card disposal or plugin retirement. Plugins remain responsible for safe retry
and idempotency and must not infer that a timed-out operation did not execute.

Success/info/warning may expire; errors remain until dismissed. Hover, keyboard
focus, reading expanded details, action execution and document backgrounding
pause expiration. Notifications do not take focus merely by arriving. Host
supports screen-reader announcements, keyboard operation and reduced motion.
Retiring an owner removes its queued and visible notices and invalidates its
callbacks and handles; a replaced generation cannot act through old cards.

## User suppression policy

Host supplies a More menu with mute-kind, pause-plugin-one-hour,
pause-plugin-until-local-midnight, mute-plugin and manage-rules choices. Rules
match stable plugin source plus plugin ID, optionally kind; never match message
text. They are scoped to the Host profile, persist across renderer restarts,
and apply equally to future, queued and visible notices. Expired pauses no
longer suppress delivery. A missing or inaccessible persistence backend must
be reported; it cannot be presented as durable success.

Applying a rule removes matching cards immediately and offers undo. Managing
and restoring rules remains accessible when every notification is suppressed.
Restoring rules permits future messages; it does not replay old messages.
Plugins cannot write, bypass or enumerate another plugin's notification rules.

## Security analysis

The service is presentation-only and grants no filesystem, network, navigation
or permission authority. Navigation and actions retain ordinary owner checks.
Identity is not supplied by notification input; plugin names/icons use existing
Host metadata validation. All message fields are text, not HTML. Plugin authors
must omit secrets from diagnostics. Policy stores only rule identity, display
name, kind and expiry, never notification bodies or action callbacks. The
contract is not an isolation boundary for otherwise trusted renderer code.

## Representations and verification

[TypeScript](../../types/notifications.v1.d.ts) is the callable surface. There is
no serialized notification wire document or new JSON Schema: callbacks and
AbortSignal are in-process values. Host adoption must test suppression, expiry,
coalescing, cross-owner isolation, retirement, persistence failures, navigation,
action recovery and user restoration in its production composition.
