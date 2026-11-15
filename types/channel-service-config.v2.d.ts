import type { ChannelAdapterKind, ChannelTenantRef } from './channel-runtime.v1.js'
import type { ChannelManagerSelectorV2 } from './channel-manager.v2.js'

/** Launcher-owned successor. Credential references never enter the renderer Manager service. */
export interface ChannelServiceConnectionConfigV2 {
  readonly ref: ChannelTenantRef
  readonly adapterKind: ChannelAdapterKind
  readonly enabled: boolean
  readonly transport: {
    readonly mode: 'simulator' | 'websocket' | 'webhook' | 'outbound-webhook'
    readonly callbackAlias?: string
  }
  readonly secretRef?: string
  readonly displayName?: string
  readonly selectors?: readonly ChannelManagerSelectorV2[]
}

export interface ChannelServiceConfigV2 {
  readonly contract: 'cordisx.channel-service-config/v2'
  readonly schemaVersion: 2
  readonly connections: readonly ChannelServiceConnectionConfigV2[]
}
