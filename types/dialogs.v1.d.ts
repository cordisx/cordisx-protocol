/** Renderer-local, owner-bound modal surfaces. Callbacks are never serialized. */
export type DialogCloseReasonV1 = 'close-button' | 'escape' | 'backdrop' | 'cancel' | 'programmatic'
export type DialogResultV1 =
  | { readonly status: 'completed'; readonly actionId: string }
  | { readonly status: 'closed'; readonly reason: DialogCloseReasonV1 }
  | { readonly status: 'disposed' | 'unavailable' | 'queue-full' }
export interface DialogActionV1 {
  readonly id: string
  readonly label: string
  /** Host semantic icon token, never SVG, URL, CSS or JSX. */
  readonly icon?: 'share' | 'copy' | 'refresh' | 'help' | 'settings'
  readonly disabled?: boolean
  readonly pending?: boolean
  readonly tone?: 'neutral' | 'danger'
  readonly closeOnSuccess?: boolean
  readonly onAction: (signal: AbortSignal) => void | Promise<void>
}
export interface DialogChromeV1 {
  readonly title: string
  readonly description?: string
  readonly size?: 'small' | 'medium' | 'large'
  readonly bodyLayout?: 'scroll' | 'fill'
  readonly headerActions?: readonly DialogActionV1[]
  readonly footer?: {
    readonly status?: string
    readonly secondaryActions?: readonly DialogActionV1[]
    readonly primaryAction?: DialogActionV1
  }
  readonly closeOnBackdrop?: boolean
  readonly beforeClose?: (reason: DialogCloseReasonV1, signal: AbortSignal) => boolean | Promise<boolean>
}
export interface DialogOptionsV1 extends DialogChromeV1 {
  readonly kind: string
  /** Owner/kind/instance deduplication; omitted means a distinct request. */
  readonly instanceKey?: string
}
export interface DialogHandleV1 {
  readonly result: Promise<DialogResultV1>
  readonly signal: AbortSignal
  close(reason?: DialogCloseReasonV1): Promise<boolean>
  update(chrome: DialogChromeV1): void
}
/** Only the plugin body seat is exposed; chrome and global overlay roots remain private. */
export interface DialogMountContextV1 {
  readonly container: HTMLElement
  readonly signal: AbortSignal
  readonly props: Readonly<Record<string, unknown>>
  readonly dialog: DialogHandleV1
}
export type DialogMountV1 = (context: DialogMountContextV1) => void | (() => void)
export interface DialogOpenOptionsV1 extends DialogOptionsV1 {
  readonly content: { readonly id: string; readonly props?: Readonly<Record<string, unknown>> }
}
export interface DialogConfirmOptionsV1 extends DialogOptionsV1 {
  readonly confirmLabel: string
  readonly tone?: 'neutral' | 'danger'
  readonly run: (signal: AbortSignal) => void | Promise<void>
  /** A same-owner live handle permits one controlled child confirmation. */
  readonly parent?: DialogHandleV1
}
export interface DialogFormFieldV1 {
  readonly id: string
  readonly label: string
  readonly type: 'string' | 'number' | 'boolean'
  readonly initialValue?: string | number | boolean
  readonly required?: boolean
  readonly min?: number
  readonly max?: number
}
export interface DialogFormOptionsV1 extends DialogOptionsV1 {
  readonly fields: readonly DialogFormFieldV1[]
  readonly submitLabel: string
  readonly submit: (values: Readonly<Record<string, string | number | boolean>>, signal: AbortSignal) => void | Promise<void>
}
export interface DialogsV1 {
  readonly contract: 'cordisx.dialogs/v1'
  form(options: DialogFormOptionsV1): Promise<DialogResultV1>
  register(id: string, mount: DialogMountV1): () => void
  open(options: DialogOpenOptionsV1): DialogHandleV1
  confirm(options: DialogConfirmOptionsV1): Promise<DialogResultV1>
}
