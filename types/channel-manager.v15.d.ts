import type { ChannelManagerV14 } from './channel-manager.v14.js'

/** Host presentation support, not an authorization or a credential. */
export interface ChannelManagerPresentationCapabilitiesV1 {
  readonly contract: 'cordisx.channel-manager-presentation-capabilities/v1'
  readonly schemaVersion: 1
  readonly mode: 'standard' | 'snapshot-only'
}

/** Additive presentation negotiation on the existing owner-bound service. */
export interface ChannelManagerV15 extends ChannelManagerV14 {
  presentationCapabilities(): ChannelManagerPresentationCapabilitiesV1
  forOwnPresentationService(): ChannelManagerV15 | undefined
}
