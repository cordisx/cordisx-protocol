import type { ChannelManagerV10 } from './channel-manager.v10.js'
import type { ChannelManagerV11, ChannelSettingsFormSectionV1 } from './channel-manager.v11.js'

declare const manager: ChannelManagerV11
const older: ChannelManagerV10 = manager
void older
const section: ChannelSettingsFormSectionV1 = 'messages'
void manager.mountSettingsForm(section, document.createElement('div'), { signal: new AbortController().signal })
manager.registerChatCreationSettingsDestination({ id: 'preferences-defaults' })?.dispose()
// @ts-expect-error Predecessor forms have no sectioned settings surface.
void older.mountSettingsForm
// @ts-expect-error Settings destinations cannot select a foreign plugin.
manager.registerChatCreationSettingsDestination({ id: 'preferences-defaults', owner: 'foreign' })
