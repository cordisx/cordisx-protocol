export interface TransientCanvasRegistrationV1 {
  readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/transient-canvas-registration.v1.schema.json'
  readonly schemaVersion: 1
  readonly id: string
  /** Host extension point whose payload family is transient-canvas-presentation. */
  readonly pointId: string
  /** Hard Host presentation limit. The canvas is removed after this duration. */
  readonly durationMs: number
  readonly reducedMotion: 'skip' | 'static'
}

export interface TransientCanvasSessionV1 {
  /** Transferable drawing surface; it is not an Element and has no DOM parent. */
  readonly canvas: OffscreenCanvas
  readonly width: number
  readonly height: number
  readonly pixelRatio: number
  readonly reducedMotion: boolean
  readonly startedAt: number
  readonly signal: AbortSignal
}

export type TransientCanvasPresenterV1 = (
  session: TransientCanvasSessionV1,
) => void | Promise<void>

export interface TransientCanvasRegistrationHandleV1 {
  dispose(): Promise<void>
}

export interface TransientCanvasRegistryV1 {
  register(
    declaration: TransientCanvasRegistrationV1,
    presenter: TransientCanvasPresenterV1,
  ): Promise<TransientCanvasRegistrationHandleV1>
}

export interface TransientCanvasPluginContextV1 {
  readonly transientCanvas: TransientCanvasRegistryV1
  readonly onDispose: (cleanup: () => void | Promise<void>) => void
}
