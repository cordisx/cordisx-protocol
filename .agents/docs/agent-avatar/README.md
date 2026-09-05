# Agent Avatar v1

`agent-avatar/v1` is a data-only, stable Agent identity reference. It defines no
renderer, DOM, CSS, raw asset, cache, animation, theme, or accessibility policy.
Those remain owned by the product that creates and presents the identity. The
CordisX base Host does not implement an Agent-avatar renderer.

## References

`AgentAvatarRef` is a closed union:

- `generated` fixes `oneworks-avatar-seed` algorithm version 1 and carries only
  a canonical seed;
- `asset` carries a qualified opaque asset ref and optional revision;
- `definition` carries a qualified opaque ref for `oneworks.avatar` definition
  version 1 and optional revision; and
- `platform` reserves a provider plus qualified opaque identity ref and optional
  revision. A consumer that does not resolve this kind returns typed
  `unsupported`, normally `unsupported-provider`.

Qualified opaque refs use a bounded `namespace:value` grammar. They cannot be a
URL, filesystem path, `data:`/`blob:` value, or naked base64 payload. The public
contract never carries image bytes or a raw rendering value.

Inputs and returned refs are detached from caller-owned mutable objects and
deeply frozen. Unknown properties, unknown kinds, mismatched algorithms,
schemas, or versions are rejected rather than ignored.

## Canonical generated seed

For an Agent Definition identity, trim the `agentId`, normalize it with Unicode
NFC, encode it as UTF-8, and produce:

`cordisx.agent-avatar.seed/v1:agent-definition:<UTF-8-byte-length>:<normalized-agentId>`

Length is the number of UTF-8 bytes, not UTF-16 code units or Unicode scalar
values. The normalized identity is bounded to 512 UTF-8 bytes. `trim` removes
only leading and trailing U+0009–U+000D, U+0020, U+00A0, U+1680, U+2000–U+200A,
U+2028, U+2029, U+202F, U+205F, U+3000, and U+FEFF, matching ECMAScript 2023
`String.prototype.trim`. An input containing an unpaired UTF-16 surrogate is
invalid rather than replacement-decoded.

`revision`, display name, container identity, execution identity, time, and
randomness never participate. If no stable identity exists, or trimming leaves
an empty value, use the one fixed seed
`cordisx.agent-avatar.seed/v1:unknown:0:`; do not synthesize uniqueness.

JSON Schema validates the bounded syntactic seed envelope. NFC and equality
between the declared length and the normalized UTF-8 bytes are computed
constraints that JSON Schema 2020-12 cannot express. Every consumer MUST pass a
wire ref through `cloneAgentAvatarRef` or an equivalent v1 semantic validator
before use; schema validation alone is insufficient for a generated seed.

## Agent Definition inheritance

An `agent-definition/v1` may carry an explicit `avatar` and may set optional
`inherit.avatar` to `inherit` or `none`. The child explicit ref always wins.
Without one, `inherit` selects the last explicit non-generated ref while folding
ordered parents left to right. A parent generated ref never crosses an identity
boundary. If no inheritable ref exists, or the mode is absent/`none`, generate
from the child canonical `agentId`.

The helper functions clone and freeze accepted refs, create deterministic
generated refs, and implement the same definition fallback. `AgentAvatarResolutionResult`
reports only `resolved` or a typed `unsupported`; it does not expose a Host
rendering handle.

## Consumer entry points

- TypeScript and runtime helpers: `@cordisx/protocol/agent-avatar/v1`
- Schemas: `agent-avatar.v1` and `agent-avatar-resolution-result.v1`

## OneWorks RC compatibility baseline

The public wire contract remains renderer- and package-independent. Protocol has
no production or peer dependency on the OneWorks implementation packages. A
Host that implements the generated avatar algorithm with the current OneWorks
RC baseline MUST exact-pin `@oneworks/avatar@1.0.0-rc.8` and, when using its
React renderer, `@oneworks/avatar-react@1.0.0-rc.8`. Do not use `^`, `~`, the
floating `rc` tag, or git/file/tarball selectors.

The `oneworks-rc8-compatibility` golden vector freezes the public RC.8 seed
normalization and hashing behavior for canonical ASCII, Unicode, and unknown
CordisX seeds. These are compatibility observations, not copied implementation
source and not additional public wire fields.
