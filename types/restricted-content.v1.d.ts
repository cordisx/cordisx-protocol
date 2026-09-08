/** Declarative view data. The Host never executes author HTML, JavaScript, CSS or URLs. */
export type RestrictedContentJsonV1 = null | boolean | number | string
  | readonly RestrictedContentJsonV1[] | { readonly [key: string]: RestrictedContentJsonV1 }
export type RestrictedContentNodeV1 =
  | { readonly type: 'text'; readonly text: string; readonly tone?: 'default' | 'muted' | 'accent' }
  | { readonly type: 'stack'; readonly direction?: 'vertical' | 'horizontal'; readonly children: readonly RestrictedContentNodeV1[] }
  | { readonly type: 'grid'; readonly columns: number; readonly children: readonly RestrictedContentNodeV1[] }
  | { readonly type: 'button'; readonly label: string; readonly action: RestrictedContentJsonV1; readonly disabled?: boolean }
export interface RestrictedContentSceneV1 {
  readonly version: 1
  readonly root: RestrictedContentNodeV1
}
export type RestrictedContentFailureV1 = 'unsupported' | 'invalid-request'
  | 'host-unavailable' | 'disposed' | 'message-too-large' | 'stale-sequence'
export type RestrictedContentResultV1<T> =
  | { readonly status: 'accepted'; readonly value: T }
  | { readonly status: 'unavailable'; readonly code: RestrictedContentFailureV1 }
export interface RestrictedContentSnapshotV1 {
  readonly sequence: number
  readonly payload: RestrictedContentSceneV1 | null
}
export interface RestrictedContentActionV1 {
  readonly sequence: number
  readonly payload: RestrictedContentJsonV1
}
export interface RestrictedContentSeatV1 {
  readonly contract: 'cordisx.restricted-content-seat/v1'
  /** Strictly increasing nonnegative safe integers. Invalid scenes never replace the current view. */
  publish(snapshot: RestrictedContentSnapshotV1): RestrictedContentResultV1<null>
  dispose(): void
}
export interface RestrictedContentV1 {
  readonly contract: 'cordisx.restricted-content/v1'
  mount(input: {
    readonly element: HTMLElement
    /** The caller supplies authoritative identity; author action data never carries Host authority. */
    readonly onAction: (action: RestrictedContentActionV1) => void
    readonly onUnavailable?: (code: RestrictedContentFailureV1) => void
  }): Promise<RestrictedContentResultV1<RestrictedContentSeatV1>>
  dispose(): void
}
