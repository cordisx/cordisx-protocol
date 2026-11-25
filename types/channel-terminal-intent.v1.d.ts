/** A caller's explicit terminal-message intent, not proof of delivery or authority. */
export interface ChannelTerminalIntentV1 {
  readonly contract: 'cordisx.channel-terminal-intent/v1'
  readonly schemaVersion: 1
  readonly inputOperationId: string
}
