/** Explicit consent to copy source history to a target Provider. */
export interface ChannelProviderContinuationRequestV1 {
  readonly contract: 'cordisx.channel-provider-continuation/v1'
  readonly operationId: string
  readonly sourceSessionId: string
  readonly expectedRevision: number
  readonly target: { readonly providerId: string; readonly model: string }
  readonly history: 'inherit'
}

/** A missing destination or an unknown effect is never a successful migration. */
export type ChannelProviderContinuationResultV1 =
  | { readonly state: 'pending'; readonly operationId: string }
  | { readonly state: 'applied'; readonly operationId: string; readonly destinationSessionId: string }
  | { readonly state: 'rejected'; readonly operationId: string; readonly code: string }
  | { readonly state: 'unknown'; readonly operationId: string; readonly destinationSessionId?: string }
