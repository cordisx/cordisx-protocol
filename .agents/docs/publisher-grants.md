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

`commerce-descriptor.v1` is optional, stable discovery metadata. Its sole
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
statement that is not byte-identical and activation registries must make the
binding request idempotent on `(issuer, grantId, devicePublicKeyHash, nonce)`.

## Device and activation

A device is its Host-generated asymmetric key pair, not a hardware serial
number, fingerprint, or user profile. Private material belongs in an OS secure
store or hardware-backed key abstraction where available; a renderer cannot
read it. Reinstalling or losing that key creates a new device and requires a
publisher-signed transfer. Multiple `CORDISX_HOME` configurations on one
machine share an authorization only when they use the same Host device-key
provider; independent keys are independent devices.

Activation sends a new nonce and proof-of-possession signed by the device key
to a minimal CordisX activation registry. The registry atomically records only
`issuer + grantId -> pluginId + devicePublicKeyHash + activationStatus` (and
the environment/idempotency data necessary to operate it). It must reject a
second device hash for the same active grant. It stores no price, currency,
order, payment, or payment-status data. Local wrapping alone is insufficient:
without this registry, a Host must fail closed for a single-machine grant and
must not claim cross-machine uniqueness.

## Time, expiry, and enforcement

Hosts persist the last registry-attested time and never move their effective
time backwards when the wall clock is rolled back. A network failure may retain
an already activated grant only through `expiresAt + offlineGraceSeconds` from
that monotonic effective time; a new activation, a renewal, or expiry beyond
grace requires a registry response. All grants have `expiresAt`. Publishers
normally issue 7--30 day renewable subscription leases; perpetual purchases use
a longer lease and silent renewals. `refreshAfter` asks the Host to refresh and
does not itself extend authorization.

The Host gates installation, update, activation, and feature projection within
CordisX against the current grant. It cannot claim to prevent copied source or
code from running outside CordisX, and this protocol does not turn the current
trusted renderer runtime into a sandbox.

## Required conformance behavior

Conforming implementations reject unknown fields, invalid timing order,
cross-environment key use, duplicate statement ids with changed bytes, device
hash mismatch, non-fresh activation nonce, a transfer whose source and target
are equal, and a second active binding for a different device. Fixtures cover
valid grant/renew/revoke/transfer shapes and each of these rejection classes.
