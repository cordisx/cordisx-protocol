/** A native session reference; this is not a capability to read that session. */
export interface ContinuationSessionRefV1 {
  readonly hostId: string
  readonly appId: string
  readonly profileId: string
  readonly sessionId: string
}
export type ConversationContinuationModeV1 = 'linked' | 'fork' | 'fresh'
export type ContinuationHistoryCategoryV1 = 'user-text' | 'assistant-text' | 'plan' | 'command' | 'tool'
export type ConversationContinuationRequestV1 = {
  readonly contract: 'cordisx.conversation-continuation-request/v1'
  readonly operationId: string
  readonly logicalConversationId: string
  readonly source: ContinuationSessionRefV1
  readonly expectedRevision: number
  readonly target: { readonly providerId: string; readonly model: string }
} & (
  | {
    readonly mode: 'linked'
    readonly historyConsent: 'on-demand'
    readonly historyCategories: readonly [ContinuationHistoryCategoryV1, ...ContinuationHistoryCategoryV1[]]
  }
  | { readonly mode: 'fork'; readonly historyConsent: 'inherit' }
  | { readonly mode: 'fresh'; readonly historyConsent: 'none' }
)
export type ConversationContinuationResultV1 =
  | { readonly state: 'pending'; readonly operationId: string }
  | { readonly state: 'applied'; readonly operationId: string; readonly destination: ContinuationSessionRefV1 }
  | { readonly state: 'rejected'; readonly operationId: string; readonly code: string }
  | { readonly state: 'unknown'; readonly operationId: string; readonly destination?: ContinuationSessionRefV1 }
/** A committed link is inspectable; it is not itself permission to read its source. */
export type ConversationContinuationRelationV1 = {
  readonly contract: 'cordisx.conversation-continuation-relation/v1'
  readonly operationId: string
  readonly logicalConversationId: string
  readonly revision: number
  readonly source: ContinuationSessionRefV1
  readonly destination: ContinuationSessionRefV1
  readonly target: { readonly providerId: string; readonly model: string }
} & (
  | {
    readonly mode: 'linked'
    readonly historyAccess: 'on-demand'
    readonly handoff: 'checkpoint' | 'unavailable'
    readonly historyCategories: readonly [ContinuationHistoryCategoryV1, ...ContinuationHistoryCategoryV1[]]
  }
  | { readonly mode: 'fork'; readonly historyAccess: 'inherited'; readonly handoff: 'none' }
  | { readonly mode: 'fresh'; readonly historyAccess: 'none'; readonly handoff: 'none' }
)
/** Source is resolved from authenticated destination context, never selected by this request. */
export interface ContinuationHistoryRequestV1 {
  readonly contract: 'cordisx.continuation-history-request/v1'
  readonly limit?: number
  readonly cursor?: string
}
export interface ContinuationHistoryPageV1 {
  readonly contract: 'cordisx.continuation-history-page/v1'
  readonly source: ContinuationSessionRefV1
  readonly entries: readonly { readonly category: ContinuationHistoryCategoryV1; readonly text: string }[]
  readonly omitted: readonly ('attachment' | 'raw-reasoning' | 'encrypted-reasoning' | 'unsupported' | 'not-authorized')[]
  readonly pagination: 'native-items' | 'native-turn'
  readonly truncated: boolean
  readonly nextCursor?: string
}
export interface ConversationContinuationPreferenceV1 {
  readonly contract: 'cordisx.conversation-continuation-preference/v1'
  readonly revision: number
  readonly scope: { readonly kind: 'profile' | 'project' | 'conversation'; readonly id: string }
  readonly mode: ConversationContinuationModeV1
}
