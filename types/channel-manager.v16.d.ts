import type { ChannelManagerV8 } from './channel-manager.v8.js'
import type { ChannelManagerV15 } from './channel-manager.v15.js'

/** Presentation scope only; this descriptor is not a grant or a credential. */
export interface ChannelManagerConfigurationPresentationCapabilitiesV1 {
  readonly contract: 'cordisx.channel-manager-configuration-presentation-capabilities/v1'
  readonly schemaVersion: 1
  readonly mode: 'configuration-only'
}

/**
 * Explicitly requested facade for status and the Host-owned connection form.
 * Credential rotation, if available, stays inside that form; this facade
 * does not expose credential values, references, drafts, or credential operations.
 */
export interface ChannelManagerConfigurationPresentationV1 extends ChannelManagerV8 {
  configurationPresentationCapabilities(): ChannelManagerConfigurationPresentationCapabilitiesV1
}

/** The preceding presentation facade remains unchanged and read-only when advertised as such. */
export interface ChannelManagerV16 extends ChannelManagerV15 {
  forOwnConfigurationPresentationService(): ChannelManagerConfigurationPresentationV1 | undefined
}
