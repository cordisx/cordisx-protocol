/**
 * Generic embedded PNG bytes after product-specific composition. Consumers
 * must apply the semantic PNG checks specified by raster-image/v1 before use.
 */
export interface RasterImageSnapshotV1 {
  readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/raster-image-snapshot.v1.schema.json'
  readonly contract: 'cordisx.raster-image-snapshot/v1'
  readonly schemaVersion: 1
  readonly mediaType: 'image/png'
  readonly encoding: 'base64'
  readonly data: string
  readonly width: number
  readonly height: number
}
