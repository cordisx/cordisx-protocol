import type { ChannelManagerV6 } from './channel-manager.v6.js'

export interface ChannelManagerFormOutcomeV1 {
  readonly status: 'applied' | 'conflict' | 'rejected' | 'unavailable'
  /** Safe operation code only. No credential, account reference or draft token. */
  readonly code: string
}

export interface ChannelManagerFormOptionsV1 {
  readonly signal: AbortSignal
  readonly onResult?: (result: ChannelManagerFormOutcomeV1) => void
}

export type ChannelManagerFormMountResultV1 =
  | { readonly status: 'mounted'; readonly closed: Promise<void>; dispose(): void }
  | { readonly status: 'unavailable'; readonly code: string }

/** Explicit successor. Frozen modal methods and wire operations are unchanged. */
export interface ChannelManagerV7 extends ChannelManagerV6 {
  /** Host owns inputs, validation, private capture and commit. Never returns secret fields or values. */
  mountCredentialForm(connectionToken: string, target: HTMLElement, options: ChannelManagerFormOptionsV1): Promise<ChannelManagerFormMountResultV1>
  /** Host owns the complete policy form and revision-fenced writes on the current profile. */
  mountConversationReplyPolicyForm(target: HTMLElement, options: ChannelManagerFormOptionsV1): Promise<ChannelManagerFormMountResultV1>
  /** Same actual service/caller ownership fences as forOwnReplyService(). */
  forOwnPageService(): ChannelManagerV7 | undefined
}
