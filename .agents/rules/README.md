# Protocol Maintenance Rules

- Specify contracts independently of any Codex version, DOM selector, framework, or distribution vendor.
- Version every externally observable manifest, slot, lifecycle, capability, and package format.
- Preserve documented compatibility guarantees and define downgrade behavior.
- Accompany deterministic serialization and signature formats with test vectors.
- Require explicit security analysis for capabilities, trust, isolation, signing, and activation changes.
- Record breaking changes here before or alongside compatible implementation changes in `cordisx/cordisx`.
