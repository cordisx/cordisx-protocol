# Deferred optional authorization plan v7

This successor to permission authorization plan and decision v4 describes
activation without forcing the user to decide unused optional capabilities.
Versions v1–v6 retain their existing contracts. A peer that does not understand
v7 must reject it; a Host must not silently reinterpret a v7 plan as an older
plan or invent a user decision to complete an older transaction.

## Planning and activation

The Host validates the entire normalized manifest, including optional
declarations, before producing a plan. The activation plan includes each static
declaration the applicable lifecycle contract requires. Existing special
runtime-exact declarations retain their separate explanation and authorization
contracts. A declaration that cannot be validated, represented, or enforced
does not become valid merely because it is optional.

For an install, update, or enable plan, a static optional declaration with an
effective policy of `ask` ordinarily has `authorizationMode: deferred` and
`decisionRequired: false`. Deferral is neither an allow nor a denial. It does
not create a policy, permission ticket, lease, grant, or implied consent, and
does not apply an installation-time Certified grant. Previously persisted
allow or deny remains represented as `persistent-policy` and remains bound to
its exact key. Required declarations continue through existing explicit-user,
persistent-policy and Certified rules. Unresolved or denied required authority
blocks activation. Optional features remain unavailable whenever their actual
use lacks authority.

The sole activation-time exception is a Host-internal bundle transaction with
an exact, previously saved or freshly submitted `allow` or `deny` bundle
policy. The Host may mark the corresponding optional `ask` item with
`reviewIntent: bundle-policy`, requiring the bound decision. Bundle `ask`, a
missing choice, plugin input, or an Official/Certified label cannot create
that intent. The Host derives it from the revision-fenced bundle and member
policy and rechecks the resulting decision and restrictive merge at apply.
Existing matching plugin denial and bundle safety floors are not overridden.

For a v1 manifest, the Host retains the original localized declaration reason
in the optional `legacyReason` field and labels it as plugin-provided when a
decision is displayed. Its effective policy remains in the original v1 ledger;
projecting it into this plan must not migrate, broaden, or overwrite that
policy. New decisions obey current catalog restrictions. A previously valid
v1 grant or denial retains its original effect until changed by the user.

A v7 decision includes exactly the entries requiring explicit user decisions
and must match their capability, normalized scope, fingerprint, identity,
profile, operation, plan and generation binding. It cannot contain a deferred
entry. When no user decisions are required, the Host may complete the plan with
an empty `host-no-decision` decision. That origin cannot contain selected
decisions and does not impersonate a user. An `explicit-user` decision is
issued only after the Host receives the user's choices. Any mismatch fails
closed before publication.

An origin of `bundle-policy` is reserved for the Host-owned bundle transaction
above, including a valid previously saved bundle policy. It must contain at
least one decision and must not be accepted by an ordinary plugin install or
from a caller-supplied assertion of provenance. The authenticated lifecycle
and Broker receive the exact candidate-bound bundle intent from the Host, not
from the plugin, and must reject intents not justified by the current policy.

## Runtime, trust and failure

The complete manifest remains registered for use-time enforcement. When a
deferred capability is actually requested, the appropriate Host authority
checks the real caller and requested scope against the declaration and current
policy. Existing runtime-specific protocols, including Certified eligibility,
continue to apply at that point. Persistent deny is honored; existing matching
allow is honored only to its original extent. An undecided request uses the
applicable Host-controlled authorization mechanism. An unavailable broker,
missing UI, timeout, cancellation, invalid response, stale generation or
out-of-scope request fails closed; none supplies fallback authority. The Host
may separately explain unavailable optional features without presenting a
permission decision during activation.

`deferred` is invalid in a runtime plan. One-shot grants remain bound to the
specific authorized request and lifetime of the applicable runtime contract.
The Host must not create or alter decisions for prior transactions, broaden a
scope, change source identity, or weaken certification to implement deferral.
These guarantees apply to Host-mediated capability APIs; they do not introduce
a sandbox around code that already has ambient authority.

## Compatibility and conformance

Plan and decision v7 use the v4 capability and scope vocabulary; newer
capability families continue to use their independently versioned contracts.
Adopting v7 requires every participant in the same review transaction to
understand its plan and decision, including CLI or Manager, lifecycle
authority, and runtime authorization where applicable. Unknown versions fail
closed. Schema validation alone does not prove complete manifest coverage,
valid authorization origin, exact policy binding, or runtime enforcement;
those are semantic and Host interoperability checks.
