import type { ChannelManagerV11 } from './channel-manager.v11.js'
import type { ChannelManagerFormMountResultV1, ChannelManagerFormOptionsV1 } from './channel-manager.v7.js'

export type ChannelSettingsFormSectionV2 = 'new-chats' | 'messages' | 'permissions' | 'organization' | 'task-models'

/** Host owns admitted-model, scoped-default and exact model-change permission forms. */
export interface ChannelManagerV12 extends ChannelManagerV11 {
  mountSettingsForm(section: ChannelSettingsFormSectionV2, target: HTMLElement, options: ChannelManagerFormOptionsV1): Promise<ChannelManagerFormMountResultV1>
  /** The opaque binding must still identify an active local task on save. */
  mountBindingModelForm(bindingToken: string, target: HTMLElement, options: ChannelManagerFormOptionsV1): Promise<ChannelManagerFormMountResultV1>
  forOwnSettingsService(): ChannelManagerV12 | undefined
}
