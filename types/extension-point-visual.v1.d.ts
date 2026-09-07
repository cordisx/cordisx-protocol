/** Host-neutral semantic projection; renderer integrations do not receive a native node. */
export type ExtensionPointVisualIdV1 = 'composer.primary-action.visual' | 'composer.frame.overlay'
export type ExtensionPointInteractionV1 = 'pointer.observe' | 'activate' | 'drag'
export type ComposerPrimaryActionV1 = 'voice' | 'send' | 'stop' | 'cancel' | 'queue' | 'steer' | 'resume' | 'end-voice'
export interface ExtensionPointVisualSnapshotV1 {
  readonly schemaVersion: 1
  readonly sequence: number
  readonly action: ComposerPrimaryActionV1
  readonly enabled: boolean
  readonly busy: boolean
  readonly draftEmpty: boolean
  readonly accessibleLabel: string
  readonly theme: 'light' | 'dark'
  readonly reducedMotion: boolean
  readonly bounds: Readonly<{ width: number; height: number }>
  readonly pointer: Readonly<{ x: number; y: number; inside: boolean }> | null
  readonly events: readonly Readonly<{ sequence: number; kind: 'submitted' | 'submit-failed' }>[]
}
export interface ExtensionPointVisualSourceV1 {
  getSnapshot(): ExtensionPointVisualSnapshotV1
  subscribe(listener: () => void): () => void
}
/** Identity is local to the registering owner and generation. No HTML, selector or handler. */
export interface ExtensionPointVisualPresentationV1 {
  readonly renderer: Readonly<{ id: string }>
  readonly events?: readonly ExtensionPointInteractionV1[]
}
export interface ExtensionPointInteractionCapabilityV1 {
  readonly name: 'ui.extension-points.interact'
  readonly required: boolean
  readonly scope: Readonly<{
    extensionPoints: readonly string[]
    events: readonly ExtensionPointInteractionV1[]
  }>
}

export interface ExtensionPointRenderCapabilityV1 {
  readonly name: 'ui.extension-points.render'
  readonly required: boolean
  readonly scope: Readonly<{ extensionPoints: readonly string[] }>
}
