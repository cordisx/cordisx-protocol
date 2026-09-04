# Bounded raster image v1

`raster-image/v1` is a generic, data-only snapshot for a small embedded PNG.
It lets a producer finish product-specific visual composition before handing
the result to a Host-owned surface. The Host learns only that the value is a
bounded raster image; it does not receive avatar, participant, room, animal,
renderer, or vendor semantics.

## Closed payload

`RasterImageSnapshotV1` contains exactly:

- the v1 schema, contract, and version identity;
- `mediaType: "image/png"`;
- `encoding: "base64"`;
- canonical base64 PNG bytes in `data`; and
- the declared positive integer `width` and `height`, each at most 256.

The decoded payload is at most 262,144 bytes and the decoded image is at most
65,536 pixels. A consumer MUST perform semantic validation in addition to JSON
Schema validation: canonical base64 round-trip, byte bound, PNG signature,
one first 13-byte IHDR, declared/encoded dimension equality, supported PNG
compression/filter/interlace values, at least one IDAT, one terminal zero-byte
IEND, valid chunk boundaries and CRCs, no bytes after IEND, and no APNG control
or frame chunks. Unknown critical chunks fail closed.

The contract intentionally excludes URLs, paths, `data:`/`blob:` strings,
SVG, HTML, CSS, animation, scripts, event handlers, DOM nodes, callbacks, and
product metadata. It carries no alternative codec and cannot be downgraded by
discarding fields.

## Rendering and accessibility

A Host may construct an internal `data:image/png;base64,` source only after the
complete semantic validation above and render it with an ordinary image
element. The input itself is never interpreted as a URL. No markup parser,
`innerHTML`, SVG execution path, network request, or filesystem resolution is
part of this contract.

The embedding surface owns geometry, clipping, interaction, and accessible
naming. A leading image inside an already labelled navigation row is
decorative and uses an empty image alternative; the row label remains the
accessible name. Removing or replacing the contributing owner removes the
image with the same surface lifecycle.

## Producer lifecycle

The producer owns the source renderer, capture process, product mapping,
composition, and cache. It publishes only a complete immutable PNG snapshot.
Partial frames and mutation callbacks are not defined. If capture is not yet
available, the producer omits the image and the surface uses its normal
semantic fallback.
