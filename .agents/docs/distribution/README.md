# Distribution and Activation

## Local package boundary

Version 1 accepts one user-selected local package directory through a
Host-owned broker. Marketplace feeds remain discovery-only. Remote retrieval,
publisher signatures, transparency, notarization, and untrusted-code isolation
are not implied by this contract.

The Host validates the manifest and package boundary, builds the browser
artifact, and computes a SHA-256 digest over the normalized manifest and built
artifact. The resulting content-addressed artifact is immutable. This digest
is local content integrity, not proof of publisher identity.

## Activation records

`plugin-activation.v1.schema.json` represents one profile-scoped active,
candidate, or last-good record. It contains the activation revision, last-good
revision, runtime generation, and each plugin's version, digest, module
generation, enabled state, dependency edges, and optional public canonical
source. Candidate records additionally carry a transaction id. They contain no
source or store filesystem path.

An implementation publishes a candidate without changing the active record,
loads and checks readiness, then atomically replaces the active record and
increments the revision. Failure before publication retains the prior active
record and restores its last-good module/fiber closure. `rollback-failed` is a
distinct failure and cannot be reported as success.

Durable publication must use a new file, sync, atomic rename, restrictive
permissions, and readback. On process recovery, an incomplete candidate is
aborted and the last committed activation wins. Immutable artifacts referenced
by active or last-good state cannot be garbage collected; other unreferenced
artifacts are eligible only for delayed cleanup.

## Manager snapshot

`plugin-runtime-snapshot.v1.schema.json` is the redacted Host-to-manager
projection. It contains product identity, dependency/dependent ids, current
status, available operations, favorite preference, and optional public share
source. Raw revisions and generations are top-level fencing values for Host
operations and diagnostics, not required normal-row copy.

`share` is invalid without `canonicalSource`. Favorite is a profile preference
and not an activation/package mutation. Destructive uninstall requires a
separately confirmed dependency-impact token. The protocol carries structured
data only; plugin-provided DOM, menu callbacks, filesystem paths, and secrets
are outside the contract.
