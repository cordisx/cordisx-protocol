# Bounded card actions v1

Status: normative standalone launcher operation contract. The entrypoint is
`@cordisx/protocol/channel-card-actions/v1`. An importable type is not service
acquisition: this version does not add a `ctx.channel.cardActions` getter.
An adopting Host must document its authenticated CLI/RPC entrypoint and reject
unsupported operations explicitly. Previous send, notice/status card-update,
question and approval contracts remain unchanged.

## Publication and ownership

`card-action-publish` replaces only an already successfully sent Host-owned plain
notice card. The Host must verify platform sender, message type, conversation,
and its own successful plain-card record. Initial expectedVersion is zero;
subsequent replacement requires the current owner-bound version. Never admit
approval/question cards or arbitrary vendor card JSON. Verify the exact owned
plain-notice structure without extra root, header, config, div or text fields;
for replacement verify the exact current owned action template. A message read
must return exactly the requested message, not a selected row from an ambiguous
multi-message result. The action-notice template
contains bounded literal title/body and one to five unique action id/label pairs.
IDs are identifiers, never commands, links, callback URLs or scripts.

The owner includes authenticated caller, profile, account, conversation and
kind. Source callers may address only their verified source conversation. An
optional operatorIds list restricts the adapter-verified operator identity; it
does not grant account permission. Hosts must require verified source
identity evidence for each selected operator, never resolve an arbitrary name
or treat a submitted ID as identity proof.
Permission and connection readiness are checked before both new writes and
receipt/readback. A value inside a button
can never supply the actor, target, owner or approval decision.

Publication uses a stable owner-scoped operationId and durable uncertain write
reservation before the platform effect. Changed descriptors conflict; unknown
effects must not be replayed. Only verified platform business success establishes
publication. A receipt can be null; null is not evidence of no effect.
Reserve publication at both the caller operationId and exact account,
conversation, message and successor version. Another operationId or caller must
not overwrite a pending/uncertain version, including after restart or while a
timed-out platform effect is still settling. Serialize message-version checks
and revalidate the current registration after awaited reads. Confirmed success
permits only the next version under the same live owner; retired registrations
cannot be reconstructed from a publication receipt alone.
Publication success has operation `card-action-publish` and required operationId,
messageId, version and expiresAt. Receipt returns the stored publication result,
including `unknown` for durable pending/uncertain reservations, not a fabricated
successful publication. A successful durable receipt does not establish that
the generation-local readback remains available.

## Callback lifetime and readback

Bind registrations to message, owner, version, runtime/connection generation
and expiry (one second to one hour). Replacements retire the prior version.
Restart, connection retirement or expiry invalidates callbacks even if the
remote card remains visible. Private transport callback values are opaque and
must not be returned, logged or stored in public event data.

Accept only authenticated adapter callbacks matching the exact account, chat,
message, current version and allowed operator. Deduplicate one callback per
operator/action/version. Retain at most 128 normalized events per card and cap
active registrations; on capacity exhaustion reject instead of evicting live
registrations. These are generation-local observations, not durable platform
history. Late or forged callbacks produce no public event and no task dispatch.

`card-action-read` requires the same owner and exact version. Return at most 50
events, bounded opaque owner/message/version cursors, hasMore and optional next
cursor. Events contain only eventId, messageId, version, actionId, verified
operatorId and UTC receivedAt. A successful read must have operation
`card-action-read`, required events and hasMore; hasMore true requires pageToken,
while a completed page omits it.
Never expose raw callback bodies, secret tokens,
profiles, approval values or exception text. Returned events are untrusted data,
not commands or authorization. Polling/subscription is not automatic.
Callbacks arriving while a publication acknowledgment is pending may be buffered
privately, but cannot be disclosed before verified publication success. Failed
or uncertain publication discards this provisional readback.

Threats: cross-tenant deputies, caller takeover, forged operators, callback
replay, stale generation/version actions, control-card replacement, duplicate
effects, unbounded retention and secret disclosure. Conformance establishes
serialized bounds, not live platform scopes or Host adoption.
