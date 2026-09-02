export type NavigationCollectionScalar = string | number | boolean | null
export type NavigationCollectionJsonValue =
  | NavigationCollectionScalar
  | readonly NavigationCollectionJsonValue[]
  | { readonly [key: string]: NavigationCollectionJsonValue }

export interface NavigationCollectionLocalizedText {
  readonly namespace?: string
  readonly key: string
  readonly params?: Readonly<Record<string, NavigationCollectionScalar>>
  readonly fallback?: string
}

/** A registered structured icon token, never a URL, path, SVG, or renderer. */
export type NavigationCollectionIconRef = `${string}:${string}`

export interface NavigationCollectionCommandReference {
  readonly id: string
  readonly arguments?: NavigationCollectionJsonValue
}

export interface NavigationCollectionDisabledState {
  readonly value: boolean
  readonly reason?: NavigationCollectionLocalizedText
}

export interface NavigationCollectionActionFeedback {
  readonly success: NavigationCollectionLocalizedText
  readonly failure: NavigationCollectionLocalizedText
}

export interface NavigationCollectionActionConfirmation {
  readonly title: NavigationCollectionLocalizedText
  readonly description: NavigationCollectionLocalizedText
  readonly confirmLabel: NavigationCollectionLocalizedText
}

export interface NavigationCollectionCopyText {
  /** One through 4096 Unicode code points with no NUL. */
  readonly value: string
}

export interface NavigationCollectionActionBase {
  readonly id: string
  readonly label: NavigationCollectionLocalizedText
  readonly ariaLabel?: NavigationCollectionLocalizedText
  readonly icon?: NavigationCollectionIconRef
  readonly placement: 'direct' | 'overflow'
  readonly tone: 'neutral' | 'danger'
  readonly pressed: boolean
  readonly disabled: NavigationCollectionDisabledState
  readonly feedback: NavigationCollectionActionFeedback
}

export interface NavigationCollectionCommandAction extends NavigationCollectionActionBase {
  readonly kind: 'command'
  readonly command: NavigationCollectionCommandReference
  readonly confirmation?: NavigationCollectionActionConfirmation
}

/** Copies the enclosing collection item's validated route; it carries no route or URL. */
export interface NavigationCollectionCopyRouteLinkAction extends NavigationCollectionActionBase {
  readonly kind: 'copy-route-link'
}

/** Copies only the bounded plain value; the Host never interprets it as a URL. */
export interface NavigationCollectionCopyTextAction extends NavigationCollectionActionBase {
  readonly kind: 'copy-text'
  readonly text: NavigationCollectionCopyText
}

export type NavigationCollectionAction =
  | NavigationCollectionCommandAction
  | NavigationCollectionCopyRouteLinkAction
  | NavigationCollectionCopyTextAction

/** An immutable item-local list. Schema validation additionally caps it at eight actions. */
export type NavigationCollectionActions = readonly NavigationCollectionAction[]
