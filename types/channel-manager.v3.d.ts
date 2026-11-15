import type { RasterImageSnapshotV1 } from './raster-image.v1.js'
import type { ChannelManagerAccountV3, ChannelManagerSnapshotV3, ChannelManagerV2 } from './channel-manager.v2.js'

export interface ChannelManagerAccountV4 extends ChannelManagerAccountV3 {
  /** Public authenticated account/bot name, distinct from an optional user connection label. */
  readonly accountName?: string
  /** Host-fetched and normalized artwork; no URL, identifier, cookie or credential. */
  readonly accountAvatar?: RasterImageSnapshotV1
}

/** Display-only identity projection. Every operation and opaque target keeps its v2 semantics. */
export interface ChannelManagerSnapshotV4 extends Omit<ChannelManagerSnapshotV3, 'contract' | 'schemaVersion' | 'accounts'> {
  readonly contract: 'cordisx.channel-runtime-snapshot/v4'
  readonly schemaVersion: 4
  readonly accounts: readonly ChannelManagerAccountV4[]
}

/** New methods are explicit; snapshot() still returns the frozen v3 wire projection. */
export interface ChannelManagerV3 extends ChannelManagerV2 {
  snapshotWithIdentity(): ChannelManagerSnapshotV4
  /** Read the current Host-owned identity projection without reconnecting or authenticating. */
  refreshIdentity(signal: AbortSignal): Promise<void>
}
