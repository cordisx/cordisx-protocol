import type { ChannelManagerV15 } from './channel-manager.v15.js'
import type { ChannelManagerConfigurationPresentationV1, ChannelManagerV16 } from './channel-manager.v16.js'

declare const manager: ChannelManagerV16
const older: ChannelManagerV15 = manager
const configuration: ChannelManagerConfigurationPresentationV1 | undefined = manager
  .forOwnConfigurationPresentationService()
configuration?.configurationPresentationCapabilities().mode satisfies 'configuration-only' | undefined
configuration?.mountConnectionConfigurationForm('opaque', document.body, { signal: new AbortController().signal })
// @ts-expect-error An older presentation service cannot request the new facade.
void older.forOwnConfigurationPresentationService()
// @ts-expect-error The restricted facade does not advertise the v15 descriptor.
void configuration?.presentationCapabilities()
