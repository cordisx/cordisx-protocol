import type { ChannelManagerV8 } from './channel-manager.v8.js'
declare const manager: ChannelManagerV8
declare const target: HTMLElement
const options = { signal: new AbortController().signal }
manager.forOwnConfigurationService()?.mountConnectionConfigurationForm('opaque', target, options)
manager.mountCredentialForm('opaque', target, options)
// @ts-expect-error Host forms never accept plugin-authored secret values.
manager.mountConnectionConfigurationForm('opaque', target, { ...options, secret: 'forged' })
// @ts-expect-error The plugin cannot submit a private service configuration.
manager.mountConnectionConfigurationForm('opaque', target, { ...options, configuration: {} })
