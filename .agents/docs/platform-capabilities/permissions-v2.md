# Permission authorization protocol v2

Status: normative productization contract for Host-owned capability risk,
plugin rationale, install/enable review, runtime decisions, and persistent
policy migration. Platform capability protocol v1 remains readable for
compatibility; v2 does not reinterpret its closed schemas.

## Authority and version order

The Host owns one capability catalog, one decision engine, one Permission
Broker, and one profile permission ledger. Package installation, runtime calls,
and Manager policy changes consume those same authorities. Plugins never
provide policy defaults, sensitivity, Host permission names, risk copy,
maximum scope, provider trust, persistence eligibility, or decision lifetime.

The compatible delivery order is:

1. `plugin-manifest.v4` adds structured plugin rationale without changing
   manifest v1/v2/v3;
2. `plugin-package.v3` may reference manifest v1-v4 without changing frozen
   package v1/v2;
3. permission common/policy/authorization plan/decision v2 define the new
   decision vocabulary and security fingerprint;
4. Host implementations migrate v1 records into their single v2 ledger only
   after exact identity, scope, and catalog validation.

Unknown schemas and capabilities fail closed. A capability cannot enter a
production Host catalog until every required risk field below is present.

## Host capability catalog

Each catalog entry is versioned and immutable for one Host release. It
contains:

- the closed capability id and owning provider family;
- `sensitivity`: `low`, `general`, `sensitive`, or `high-risk`;
- a recommended persistent policy and operation-specific default decision;
- whether persistent allow and persistent deny are available;
- maximum scope and the rule for detecting scope expansion;
- install/enable and runtime prompt strategy;
- Host-owned localized name, description, risk, and limitation text.

The decision engine evaluates capability, provider/provider kind, normalized
scope, operation, availability, and catalog version. Its selected option is a
presentation default only; it never authorizes automatically. `required`
changes the consequence of denial, not sensitivity or available decisions.

The baseline behavior is:

| Sensitivity | Default presentation | Persistent allow |
| --- | --- | --- |
| `low` | `allow-persistent` | allowed |
| `general` | `allow-persistent` | allowed |
| `sensitive` | `allow-once` | allowed only when the catalog entry permits it |
| `high-risk` | `allow-once` or `deny-once` | forbidden unless an explicit catalog exception permits it |

A Host may choose a stricter default for an external, degraded, untrusted, or
broadly scoped provider. It may never choose a weaker default than the catalog
entry. A declaration outside the catalog maximum scope is invalid rather than
silently narrowed.

## Plugin rationale

Manifest v4 capability declarations may include a `rationale` with four
localized fields:

- `title`: the plugin's short purpose label;
- `description`: why the plugin needs the capability;
- `feature`: the feature that uses it;
- `deniedBehavior`: what stops or degrades when the user declines.

These fields are plugin-provided explanation only. The Host labels them as
such and renders them separately from Host permission name, risk, scope, and
decision controls. Rationale cannot replace or influence sensitivity, scope,
default policy, persistence eligibility, required/optional semantics, or
availability.

Rationale is structured `LocalizedText`; arbitrary HTML, DOM nodes, scripts,
styles, images, and URLs are forbidden. The v4 schema applies field-specific
fallback limits and the Host validates resolved output again before rendering.
Control characters, markup-like content, misleading Host/security claims, and
unbounded parameters fail validation or are rendered as inert text with a
diagnostic. There is no plugin-owned permission modal surface.

Older manifests retain `reason`. A v2 Host may project that value as a legacy
description, visibly attributed to the plugin, but does not synthesize the
other rationale fields or let the legacy reason alter risk.

## Policy, decisions, and fingerprint

The canonical persistent policy vocabulary is:

- `ask`;
- `allow-persistent`;
- `deny-persistent`.

One review or runtime prompt chooses one of:

- `allow-once`;
- `allow-persistent`;
- `deny-once`;
- `deny-persistent`.

Cancel and prompt timeout are Host terminal outcomes equivalent to a
non-persistent denial; they do not silently write `deny-persistent`.
`allow-once` and `deny-once` never enter durable configuration.

A persistent v2 key is bound to profile, canonical source, plugin id,
capability, normalized scope, and a Host-computed security fingerprint. The
fingerprint covers the capability declaration's security-relevant shape,
catalog version, scope, provider constraints, and rationale/security
declaration version. Package version alone does not invalidate a grant. A
source/id change, capability addition, scope expansion, catalog risk change,
or security fingerprint change returns to `ask`.

One-shot authority is represented by an opaque Host request/transaction grant,
not by durable policy. It is bound to the exact profile, identity, capability,
scope fingerprint, runtime generation, module generation when present, and
request or install transaction. It is consumed only by the bound dispatch and
is cleared on terminal success/failure, cancellation, timeout, block, disable,
dispose, rollback, transaction abort, generation replacement, or process
restart. A staged installation one-shot cannot authorize a later unrelated
runtime request.

Version-1 `ask` migrates to `ask`, `allow` to `allow-persistent`, and `deny` to
`deny-persistent` only when the Host can reconstruct the exact current v2
identity/scope/security fingerprint and the catalog still permits that policy.
Otherwise migration fails closed to `ask`. The old record is retired only
after atomic v2 write and readback.

## Install, enable, and runtime review

Install/enable review contains every required and optional declaration once.
Low/general entries may be confirmed in one batch. Sensitive/high-risk entries
are visually separated by risk and require an explicit choice; they are never
hidden behind an undifferentiated “allow all” action. An unresolved or denied
required declaration keeps the candidate inactive and reports the real blocked
reason. Optional denial keeps the plugin active with the declared feature
degradation.

Runtime prompts are reserved for undecided policy, dynamic scope, scope
expansion, expired transaction authority, or catalog-required high-risk
reconfirmation. Availability and policy remain orthogonal: unavailable
capabilities retain editable future policy and do not substitute a generic
unavailable placeholder for the decision control.

The Host-owned modal presents plugin identity/source/trust, capability name,
what the Host allows and does not allow, provider/scope, sensitivity, plugin
rationale, and a collapsed technical detail. Authorization methods are one
radio group followed by `Cancel` and `Confirm`; there are not multiple peer
decision buttons. Required entries state the real activation block caused by
decline, while optional entries state feature degradation. Focus containment,
focus restoration, Escape, keyboard radio behavior, accessible names,
`no-drag`, locale reprojection, and light/dark theme are Host responsibilities.

Opening the plugin permission detail from the modal does not transfer modal or
navigation ownership. The Host closes or suspends the prompt consistently,
navigates to the structured Manager route, and treats the original request as
non-authorized unless a later explicit decision completes it.

## Security and validation

This contract governs calls through CordisX Host APIs. Trusted renderer code is
not sandboxed. Plugin rationale is untrusted display data, and neither policy
UI nor local persistence changes that execution boundary.

Conformance covers schema isolation, all sensitivity defaults, provider/scope
escalation, required/optional consequences, rationale validation and deceptive
copy, v1 migration, one-shot cleanup, persistent fingerprint changes, install
batch separation, policy/availability orthogonality, locale projection,
identity non-spoofing, and rejection of a capability without complete catalog
metadata.
