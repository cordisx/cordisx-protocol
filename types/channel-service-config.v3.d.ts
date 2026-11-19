import type { ChannelAccountRef } from './channel-runtime.v1.js'
import type { ChannelManagerSelectorV2 } from './channel-manager.v2.js'
import type { ChannelServiceConnectionConfigV2 } from './channel-service-config.v2.js'

/** A credentialed application whose tenant has not yet been identified. */
export interface ChannelPendingConnectionConfigV3 {
  readonly account: ChannelAccountRef
  readonly adapterKind: 'feishu' | 'lark'
  readonly secretRef: string
  readonly displayName: string
  readonly selectors?: readonly ChannelManagerSelectorV2[]
}

/** Pending entries do not constitute ChannelTenantRefs and cannot enter tenant-scoped runtime state. */
export interface ChannelServiceConfigV3 {
  readonly contract: 'cordisx.channel-service-config/v3'
  readonly schemaVersion: 3
  readonly connections: readonly ChannelServiceConnectionConfigV2[]
  readonly pendingConnections: readonly ChannelPendingConnectionConfigV3[]
}
