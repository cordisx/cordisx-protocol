# Repository Guide

Read [the maintenance rules](.agents/rules/README.md) before changing protocol material.

- [`.agents/docs`](.agents/docs/README.md) owns normative behavior and compatibility semantics.
- [`.agents/rules`](.agents/rules/README.md) owns protocol governance and change requirements.
- [`schemas`](schemas/README.md) constrains serialized document shapes.
- [`types`](types/INDEX.md) describes public TypeScript signatures and capability handles; [`package.json`](package.json) declares package exports.
- `runtime` contains the portable [Agent avatar](runtime/agent-avatar.v1.js) and [Visuals](runtime/visuals.v1.js) algorithms explicitly exported by the protocol package.
- [`test-vectors`](test-vectors/README.md) supplies examples; [`conformance`](conformance/README.md) checks protocol behavior, separately from Host interoperability.
- [Release operations](.agents/maintainers/release.md) and [dated adoption notes](.agents/maintainers/adoption-notes.md) are maintainer guidance, not plugin contracts.
- Implementation-specific behavior belongs in [the Host repository](https://github.com/cordisx/cordisx).
