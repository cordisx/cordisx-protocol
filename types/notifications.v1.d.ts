/** Owner-bound, non-modal user notifications. Identity and policy belong to Host. */
export interface NotificationOptionsV1 {
  /** Stable semantic category, e.g. connection.failed. Never include user data. */
  readonly kind: string
  readonly type: 'success' | 'info' | 'warning' | 'error'
  readonly message: string
  readonly description?: string
  /** Optional diagnostic text; callers must omit secrets. */
  readonly details?: string
  readonly action?: {
    readonly label: string
    /** Host supplies a lifetime signal; caller owns safe retry/idempotency. */
    readonly run: (signal: AbortSignal) => void | Promise<void>
  }
}

export interface NotificationHandleV1 {
  /** Idempotent; cannot dismiss another owner's notification. */
  dismiss(): void
}

export interface NotificationsV1 {
  readonly contract: 'cordisx.notifications/v1'
  /** Throws for invalid input. Muted or retired owners receive an inert handle. */
  show(options: NotificationOptionsV1): NotificationHandleV1
}
