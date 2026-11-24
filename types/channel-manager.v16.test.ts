import type { ChannelManagerV15 } from './channel-manager.v15.js'
import type {
  ChannelManagerConfigurationPresentationCapabilitiesV1,
  ChannelManagerConfigurationPresentationV1,
  ChannelManagerV16,
} from './channel-manager.v16.js'

declare const manager: ChannelManagerV16
const older: ChannelManagerV15 = manager
const configuration: ChannelManagerConfigurationPresentationV1 | undefined = manager
  .forOwnConfigurationPresentationService()
configuration?.configurationPresentationCapabilities().mode satisfies 'configuration-only' | undefined
configuration?.configurationPresentationCapabilities().connectionControl satisfies 'enable-disable' | undefined
configuration?.configurationPresentationCapabilities().connectionReconnect satisfies true | undefined
configuration?.configurationPresentationCapabilities().connectionCreate satisfies 'credentialed' | undefined
const unsupportedControl: ChannelManagerConfigurationPresentationCapabilitiesV1 = {
  contract: 'cordisx.channel-manager-configuration-presentation-capabilities/v1',
  schemaVersion: 1,
  mode: 'configuration-only',
  // @ts-expect-error Reconnect is not part of this restricted control.
  connectionControl: 'reconnect',
}
void unsupportedControl
const unsupportedReconnect: ChannelManagerConfigurationPresentationCapabilitiesV1 = {
  contract: 'cordisx.channel-manager-configuration-presentation-capabilities/v1',
  schemaVersion: 1,
  mode: 'configuration-only',
  // @ts-expect-error Reconnect is advertised only as an explicit true capability.
  connectionReconnect: false,
}
void unsupportedReconnect
const unsupportedCreate: ChannelManagerConfigurationPresentationCapabilitiesV1 = {
  contract: 'cordisx.channel-manager-configuration-presentation-capabilities/v1',
  schemaVersion: 1,
  mode: 'configuration-only',
  // @ts-expect-error This restricted capability does not authorize simulator creation.
  connectionCreate: 'simulator',
}
void unsupportedCreate
configuration?.mountConnectionConfigurationForm('opaque', document.body, { signal: new AbortController().signal })
// @ts-expect-error An older presentation service cannot request the new facade.
void older.forOwnConfigurationPresentationService()
// @ts-expect-error The restricted facade does not advertise the v15 descriptor.
void configuration?.presentationCapabilities()
