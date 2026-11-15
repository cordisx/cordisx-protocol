import type { BrandIconV1 } from './brand-icon.v1.js'
import type { RasterImageSnapshotV1 } from './raster-image.v1.js'
import type {
  ManagerCollectionItem,
  ManagerCollectionLeadingVisual,
  ManagerCollectionQueryV1,
  ManagerCollectionRegistrationHandleV1,
  ManagerCollectionRegistrationV1,
  ManagerCollectionRegistryV1,
  ManagerCollectionSnapshotV1,
} from './manager-collection.v1.js'

/** Decorative account artwork with a Host-owned lower-right platform badge. */
export interface ManagerCollectionIdentityVisualV2 {
  readonly kind: 'identity'
  /** Primary visual when no usable avatar exists; the badge when it does. */
  readonly icon: BrandIconV1
  /** Completed, bounded image bytes. Never an account URL or an Agent avatar ref. */
  readonly avatar?: RasterImageSnapshotV1
}

export type ManagerCollectionLeadingVisualV2 = ManagerCollectionLeadingVisual | ManagerCollectionIdentityVisualV2

export interface ManagerCollectionItemV2 extends Omit<ManagerCollectionItem, 'leadingVisual'> {
  readonly leadingVisual: ManagerCollectionLeadingVisualV2
}

/** Only the snapshot and leading visual advance. Registration, query and actions stay v1. */
export interface ManagerCollectionSnapshotV2 extends Omit<ManagerCollectionSnapshotV1, '$schema' | 'contract' | 'schemaVersion' | 'items'> {
  readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/manager-collection-snapshot.v2.schema.json'
  readonly contract: 'cordisx.manager-collection-snapshot/v2'
  readonly schemaVersion: 2
  readonly items: readonly ManagerCollectionItemV2[]
}

export interface ManagerCollectionSourceV2 {
  snapshot(query: ManagerCollectionQueryV1, signal: AbortSignal): ManagerCollectionSnapshotV2 | Promise<ManagerCollectionSnapshotV2>
  subscribe(listener: () => void): () => void
  dispose?(): void
}

/** Explicit capability opt-in; register() continues accepting exactly frozen v1 snapshots. */
export interface ManagerCollectionRegistryV2 extends ManagerCollectionRegistryV1 {
  registerV2(registration: ManagerCollectionRegistrationV1, source: ManagerCollectionSourceV2): ManagerCollectionRegistrationHandleV1
}
