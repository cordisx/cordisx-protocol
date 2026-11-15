import type { ChannelManagerV4 } from './channel-manager.v4.js'

/** Explicit internal-service entrypoint; all inherited delegated methods remain unchanged. */
export interface ChannelManagerV5 extends ChannelManagerV4 {
  /**
   * Resolve this caller's actually activated Channel management service.
   * The returned facade invokes only that service without requesting user grants.
   * Missing, foreign, or retired service ownership returns undefined. Cordis
   * caller tracing, service disposal and generation retirement fence every
   * management facade call, including its read/subscription methods.
   */
  forOwnService(): ChannelManagerV4 | undefined
}
