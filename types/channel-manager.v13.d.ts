import type { ChannelManagerV12 } from './channel-manager.v12.js'
import type { ChannelManagerFormMountResultV1, ChannelManagerFormOptionsV1 } from './channel-manager.v7.js'

/** Channel creation settings are a separate sparse overlay of the profile's general defaults. */
export interface ChannelManagerV13 extends ChannelManagerV12 {
  mountChannelCreationDefaultsForm(target: HTMLElement, options: ChannelManagerFormOptionsV1): Promise<ChannelManagerFormMountResultV1>
  forOwnSettingsService(): ChannelManagerV13 | undefined
}
