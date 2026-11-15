import type { ChannelManagerV4 } from './channel-manager.v4.js'
import type { ChannelManagerV5 } from './channel-manager.v5.js'

declare const current: ChannelManagerV5
declare const previous: ChannelManagerV4
const owned: ChannelManagerV4 | undefined = current.forOwnService()
const delegated: ChannelManagerV4 = current
owned?.snapshotWithIdentity()
delegated.snapshot()
// @ts-expect-error A frozen v4 Host has no internal-service entrypoint.
previous.forOwnService()
// @ts-expect-error Owning a management service does not expose a transport or secret.
owned?.send()
