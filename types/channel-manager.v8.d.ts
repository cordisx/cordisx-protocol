import type { ChannelManagerFormMountResultV1, ChannelManagerFormOptionsV1, ChannelManagerV7 } from './channel-manager.v7.js'

/** Explicit successor; older credential-only forms and wire operations stay frozen. */
export interface ChannelManagerV8 extends ChannelManagerV7 {
  /** One Host-owned form and CAS save for connection settings and an optional new secret. */
  mountConnectionConfigurationForm(connectionToken: string, target: HTMLElement, options: ChannelManagerFormOptionsV1): Promise<ChannelManagerFormMountResultV1>
  /** Same activated-service and actual-caller fences as forOwnPageService(). */
  forOwnConfigurationService(): ChannelManagerV8 | undefined
}
