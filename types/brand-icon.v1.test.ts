import { type BrandIconV1, type BrandRasterIconV1, cloneBrandIconV1 } from './brand-icon.v1.js'

const host = 'host:settings' as const satisfies BrandIconV1

const raster = {
  kind: 'raster-image',
  image: {
    $schema:
      'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/raster-image-snapshot.v1.schema.json',
    contract: 'cordisx.raster-image-snapshot/v1',
    schemaVersion: 1,
    mediaType: 'image/png',
    encoding: 'base64',
    data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
    width: 1,
    height: 1,
  },
} as const satisfies BrandRasterIconV1

cloneBrandIconV1(host) satisfies BrandIconV1
cloneBrandIconV1(raster) satisfies BrandIconV1

// @ts-expect-error raw URLs are not brand icons
const url: BrandIconV1 = 'https://example.test/icon.png'

// @ts-expect-error raw data URLs are not brand icons
const dataUrl: BrandIconV1 = 'data:image/png;base64,AAAA'

// @ts-expect-error raster bytes require the structured raster-image/v1 snapshot
const nakedData: BrandIconV1 = { kind: 'raster-image', data: 'AAAA' }

void [url, dataUrl, nakedData]
