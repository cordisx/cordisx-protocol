# Typed outbound v3

This successor preserves outbound v1/v2 and runtime v1-v3. Acquire `outboundV3`
only from the runtime v4 context when the Host actually exposes it. Importing a
type does not establish acquisition or permission. Older facades reject v3
requests and nodes rather than dropping structure.

V3 adds paragraph links and prepared-image handles, a standalone `inline-code`
block and a `code` block with an optional enumerated language. Existing blocks
remain legal. Text is literal, never arbitrary Markdown or vendor JSON.
Inline code occupies its own paragraph; placing it among native paragraph nodes
is invalid. Adapters may safely generate a single code span but must not expose
arbitrary Markdown input. Capability discovery states this layout limitation.

Links accept absolute HTTP/HTTPS URLs without userinfo, whitespace, control
characters or backslashes. Labels and URLs create no network-fetch authority.
Image nodes accept `media:` prepared handles only, never paths, URLs or vendor
image keys. All handles must be owned by the same caller, target and current
generation, be unexpired images, and satisfy the adapter's media limits.

Before the first upload or send effect, validate the entire request, every
mention and every prepared image. A later invalid node must not cause partial
uploads. Authorization failure never selects text fallback. Unsupported
capabilities may use the existing explicit text fallback; structure must not be
silently flattened. Receipts and idempotency retain v1 semantics.

Capability support is independent of permission and current target validity.
This successor does not change edit authority, automatic final-response content
defaults or arbitrary callback handling. Renderer/upload details are Host-owned.

Representations: [types](../../../types/channel-outbound.v3.d.ts),
[runtime acquisition](../../../types/channel-runtime.v4.d.ts),
[send schema](../../../schemas/channel-message-send.v3.schema.json),
[capability schema](../../../schemas/channel-outbound-capabilities.v3.schema.json),
[vectors](../../../test-vectors/channel-outbound/v3.json).

Requests retain the 128-block and 128-node-per-paragraph structural limits.
At most 16 image-node occurrences are permitted across the whole request;
this aggregate semantic bound must be enforced in addition to schema validation.
Inline code is nonempty, contains no line break or NUL, and is not solely spaces.
Code languages use the enumerated uppercase values, not arbitrary metadata.
