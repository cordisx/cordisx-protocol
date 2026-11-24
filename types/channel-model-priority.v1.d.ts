/** Profile-local Channel creation policy. An empty candidate list disables it. */
export interface ChannelModelPriorityV1 {
  readonly revision: number
  readonly candidates: readonly { readonly providerId: string; readonly model: string }[]
}

/** Independently controls generic Channel failure notices. */
export interface ChannelFailureNoticesV1 {
  readonly revision: number
  readonly enabled: boolean
}
