import type { ChannelManagerV10 } from './channel-manager.v10.js'
import type { ChannelManagerFormMountResultV1, ChannelManagerFormOptionsV1 } from './channel-manager.v7.js'

export type ChannelSettingsFormSectionV1 = 'new-chats' | 'messages' | 'permissions' | 'organization'

/** Host forms retain an owner/generation-scoped draft across sibling settings routes. */
export interface ChannelManagerV11 extends ChannelManagerV10 {
  mountSettingsForm(section: ChannelSettingsFormSectionV1, target: HTMLElement, options: ChannelManagerFormOptionsV1): Promise<ChannelManagerFormMountResultV1>
  /** A live own-service destination replaces the duplicate Host shortcut only while its static own route is available. */
  registerChatCreationSettingsDestination(reference: { readonly id: string }): { dispose(): void } | undefined
  forOwnSettingsService(): ChannelManagerV11 | undefined
}
