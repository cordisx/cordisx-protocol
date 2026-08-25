# Publisher grants and external commerce v1

## Product boundary

CordisX only sends a user to the publisher's external `purchaseUrl`, `manageUrl`,
or `recoveryUrl`. It does not collect payment, relay a checkout, read a payment
webhook, decide whether a payment succeeded, or process refunds, tax, invoices,
chargebacks, settlement, or KYC. Price and payment state are not Marketplace
metadata and never become authoritative static JSON.

The only authorization input is a publisher-signed `publisher-grant.v1`
statement. A publisher may issue a valid grant even after its own payment flow
failed; CordisX accepts that authorization and the publisher is accountable for
the decision. Refund or cancellation has no inferred effect: only a signed
`revoke` or absence of a later `renew` changes the grant, and a grant otherwise
remains usable through `expiresAt`.

## Commerce descriptor

`commerce-descriptor.v1` is optional, stable discovery metadata. Marketplace
feed version 4 is the first catalog envelope that may carry it. Its sole
mode is `external-publisher-v1`; it names external HTTPS entry points and the
authorization method/environment. Hosts label its primary action "前往开发者购买"
(or the locale equivalent) and say that payment, refunds, and support are the
publisher's responsibility. It contains no price, currency, order id, payment
status, or checkout/session token.

## Signed statements

The statement family is `grant`, `renew`, `revoke`, and `transfer`.

- `grant` and `renew` carry the complete authorization claim set: issuer/key id
  in the envelope plus grant id, plugin id, offer id, device public-key SHA-256,
  nonce, validity interval, refresh time, offline grace, version range, and
  feature ids.
- `revoke` names a grant and an effective time. It is the publisher's explicit
  cancellation signal; a Host does not derive revocation from a payment event.
- `transfer` names one grant, its old and target device key hashes, a fresh
  nonce, and a bounded validity interval. A new device cannot self-transfer.

Every statement is Ed25519-signed. The signing input is RFC 8785 JSON Canonical
Scheme serialization of the complete statement **without** `signature`, encoded
as UTF-8; `signature.value` is the 64-byte Ed25519 result encoded base64url
without padding. The issuer key is selected only from Host-registered
`(issuer.id, issuer.keyId, issuer.environment)` data. Issuers must rotate by
adding a new key id, retain old keys only until their scheduled retirement, and
publish a signed revoke when a key is compromised. Sandbox and live registries
are disjoint.

`statementId` is an idempotency/replay identifier. Hosts reject a duplicate
statement that is not byte-identical. A registry-enhanced implementation must
also make its binding request idempotent on `(issuer, grantId,
devicePublicKeyHash, nonce)`.

## Device and activation

A device is its Host-generated asymmetric key pair, not a hardware serial
number, fingerprint, or user profile. Private material belongs in an OS secure
store or hardware-backed key abstraction where available; a renderer cannot
read it. Reinstalling or losing that key creates a new device and requires a
publisher-signed transfer. Multiple `CORDISX_HOME` configurations on one
machine share an authorization only when they use the same Host device-key
provider; independent keys are independent devices.

The default v1 mode is **direct-device-bound**: a developer receives the
device public-key digest/challenge from the Host and signs a `grant` already
bound to that exact key. The Host verifies the issuer/key id, statement,
plugin/offer/version/features, device hash, and proof-of-possession locally.
Copying the statement to another device fails because its device key has a
different digest. No CordisX service or first-claim redemption exists in this
mode.

An optional **registry-enhanced** mode may send the nonce and
proof-of-possession to a minimal CordisX activation registry. It atomically
records only `issuer + grantId -> pluginId + devicePublicKeyHash +
activationStatus` (and required environment/idempotency data), and can reject
a second active device hash. It stores no price, currency, order, payment, or
payment-status data. This is an enhancement for products that choose a
first-claim workflow; it is not required for a pre-bound grant and a Host must
not report `unavailable` merely because this optional service is absent.

## Time, expiry, and enforcement

Hosts persist the last trusted time and never move their effective time
backwards when the wall clock is rolled back. A registry response may advance
that time, while direct-device-bound mode uses the accepted signed statement's
issued time as a lower bound and the non-decreasing local record thereafter. A
network failure may retain an already accepted grant only through `expiresAt +
offlineGraceSeconds`; all grants have `expiresAt`. Publishers normally issue
7--30 day renewable subscription leases; perpetual purchases use a longer
lease and silent renewals. `refreshAfter` asks the Host to refresh and does not
itself extend authorization.

Refund and cancellation are not inferred from payment state. The developer
signs `revoke` or stops issuing `renew`; when fully offline, a Host cannot learn
an immediate revoke and expiry/offline grace is the latest local stop point.
For a new device, a developer signs a new direct-bound grant. The Host never
transfers a grant itself.

The Host gates installation, update, activation, and feature projection within
CordisX against the current grant. It cannot claim to prevent copied source or
code from running outside CordisX, and this protocol does not turn the current
trusted renderer runtime into a sandbox.

## Required conformance behavior

Conforming implementations reject unknown fields, invalid timing order,
cross-environment key use, duplicate statement ids with changed bytes, device
hash mismatch, a transfer whose source and target are equal, and an attempted
local self-transfer. Fixtures cover valid grant/renew/revoke/transfer shapes
and each of these rejection classes. A direct-device-bound grant requires no
registry receipt; an optional registry response cannot widen its claims.
