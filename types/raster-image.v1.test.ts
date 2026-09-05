import type { RasterImageSnapshotV1 } from './raster-image.v1.js'

const image = {
  $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/raster-image-snapshot.v1.schema.json',
  contract: 'cordisx.raster-image-snapshot/v1',
  schemaVersion: 1,
  mediaType: 'image/png',
  encoding: 'base64',
  data: 'iVBORw0KGgo=',
  width: 1,
  height: 1,
} as const satisfies RasterImageSnapshotV1

image.mediaType satisfies 'image/png'

// @ts-expect-error SVG is deliberately not part of the bounded raster contract.
const svg: RasterImageSnapshotV1 = { ...image, mediaType: 'image/svg+xml' }

// @ts-expect-error Consumers receive embedded bytes, never a URL.
const url: RasterImageSnapshotV1 = { ...image, url: 'https://example.test/avatar.png' }

void svg
void url
