# Brand icon v1

`brand-icon/v1` defines one closed icon value for Host-owned branded surfaces.
It preserves existing semantic Host icon tokens and adds a structured bounded
PNG alternative without treating plugin input as a URL.

## Shape and validation

`BrandIconV1` is exactly one of:

- a `host:*` semantic icon token; or
- `{ kind: "raster-image", image: RasterImageSnapshotV1 }`.

The raster branch reuses the complete [`raster-image/v1`](../raster-image/README.md)
contract. A consumer MUST apply its canonical base64, decoded-byte, PNG
signature, IHDR/dimension, pixel, chunk, CRC, IEND, critical-chunk, and APNG
checks before rendering. JSON Schema validation alone is insufficient. The
public `cloneBrandIconV1` runtime helper performs those checks, detaches the
raster object, and freezes the accepted copy.

Raw HTTP(S), `data:`, `blob:`, `file:`, or `base64:` strings, naked base64,
filesystem paths, SVG, HTML, CSS, scripts, DOM nodes, callbacks, animation, and
unknown object fields are invalid. A Host may create an internal PNG image
source only after validation; the input itself is never fetched or parsed as a
URL.

## Page and Manager use

Page metadata v4 retains the page-v3 fields and changes only the top-level
`icon` field to `BrandIconV1`. Page tabs and header actions retain their
existing icon-token contracts. Page v1-v3 remain frozen, and an older Host
rejects page v4 instead of dropping the raster branch.

`manager.settings.navigation-items` continues to contain only its same-owner
route and optional Host-catalog group reference. The linked page remains the
single source of navigation title, description, and icon, so no duplicate icon
or precedence rule is introduced. A supporting Host accepts either a page-v3
record with its required `host:*` icon or a page-v4 record with a required
`BrandIconV1`. Missing, invalid, or semantically invalid page icons leave the
navigation contribution pending and unrendered.

The same validated page-v4 icon may be used by the Host-owned navigation row
and standard page header. The Host owns geometry, clipping, theme treatment,
selection/focus states, and accessibility. A decorative raster image uses an
empty image alternative because the retained localized page title names both
surfaces.

## Compatibility

Existing `host:*` strings are valid in page v4 without transformation. Existing
page-v3 and surface-contribution v9/v10 documents remain valid and unchanged.
A plugin uses the raster branch only by registering page v4; no new Manager
surface or catalog version is required because the navigation item wire shape
does not change.
