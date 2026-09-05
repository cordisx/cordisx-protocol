# Protocol Maintenance Rules

- Specify contracts independently of any Codex version, DOM selector, framework, or distribution vendor.
- Version every externally observable manifest, slot, lifecycle, capability, and package format.
- Preserve documented compatibility guarantees and define downgrade behavior.
- Accompany deterministic serialization and signature formats with test vectors.
- Require explicit security analysis for capabilities, trust, isolation, signing, and activation changes.
- Record breaking changes here before or alongside compatible implementation changes in `cordisx/cordisx`.

## Reading and changing a contract

Start at the [specification index](../docs/README.md), then follow the topic's
version navigation and the [public TypeScript entrypoints](../../types/INDEX.md).
Read the matching schemas and conformance material before changing a contract.

Normative prose defines behavior and compatibility; JSON Schema constrains
serialized shape; TypeScript declarations describe callable surfaces and opaque
capabilities. Portable runtime helpers implement only their declared algorithms.
Conformance checks these contracts and does not establish Host adoption. If these
representations disagree, treat the mismatch as a defect to resolve explicitly;
passing one representation's checks does not override another's requirements.

For a contract change, update every affected representation and its topic
navigation together. Keep the package export map and TypeScript index aligned,
including entrypoints that change only a command context or reuse older wire
documents. Preserve frozen versions and their links; describe each successor's
scope rather than treating all objects as sharing its version number. Run the
affected checks described in [conformance](../../conformance/README.md) and
verify changed documentation links.

Keep protocol maturity separate from merge, package publication, Host adoption,
and live verification. Put repository release operations in the
[release runbook](../maintainers/release.md); date and source temporary consumer
handoffs in [adoption notes](../maintainers/adoption-notes.md). Neither location
changes normative compatibility or grants authority to perform a release.
