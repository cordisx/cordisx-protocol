/** Profile-local, opt-in notice for a running turn with no observed response. */
export interface ChannelTurnWaitPolicyV1 {
  readonly revision: number
  readonly enabled: boolean
  readonly firstResponseTimeoutMs: number
}
