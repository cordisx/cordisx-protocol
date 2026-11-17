import type { ChannelManagerV13 } from './channel-manager.v13.js'
import type { ChannelManagerFormMountResultV1, ChannelManagerFormOptionsV1 } from './channel-manager.v7.js'

/** Host-owned profile continuation defaults, with existing own-service fences. */
export interface ChannelManagerV14 extends ChannelManagerV13 {
  mountContinuationDefaultsForm(target: HTMLElement, options: ChannelManagerFormOptionsV1): Promise<ChannelManagerFormMountResultV1>
  forOwnSettingsService(): ChannelManagerV14 | undefined
}
