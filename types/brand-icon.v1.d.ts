import type { RasterImageSnapshotV1 } from './raster-image.v1.js'

export type BrandHostIconV1 = `host:${string}`

export interface BrandRasterIconV1 {
  readonly kind: 'raster-image'
  readonly image: RasterImageSnapshotV1
}

/** A Host semantic token or a structured bounded PNG; never a URL or data URL. */
export type BrandIconV1 = BrandHostIconV1 | BrandRasterIconV1

/** Validate, detach, and freeze one Host semantic or bounded raster brand icon. */
export declare function cloneBrandIconV1(value: unknown): BrandIconV1
