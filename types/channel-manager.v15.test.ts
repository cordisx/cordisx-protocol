import type { ChannelManagerV14 } from './channel-manager.v14.js'
import type { ChannelManagerPresentationCapabilitiesV1, ChannelManagerV15 } from './channel-manager.v15.js'

declare const manager: ChannelManagerV15
const older: ChannelManagerV14 = manager
const capabilities: ChannelManagerPresentationCapabilitiesV1 = manager.presentationCapabilities()
const mode: 'standard' | 'snapshot-only' = capabilities.mode
void mode
void manager.forOwnPresentationService()?.presentationCapabilities()
// @ts-expect-error An earlier service does not advertise presentation capabilities.
void older.presentationCapabilities()
// @ts-expect-error Unknown modes cannot be interpreted as standard authority.
const unsupported: ChannelManagerPresentationCapabilitiesV1['mode'] = 'write-anything'
void unsupported
